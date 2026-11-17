"""Build facts records for every puzzle in Puzzles_Mini and store them in Puzzles_Mini_Records.

Usage, from new-backend/facts/:
    uv run python build_all_records.py --limit 50 --workers 4     # timing test first
    uv run python build_all_records.py --workers 4 --depth 20     # the full run
    uv run python build_all_records.py --puzzle-ids 00AhO 00Kia --force
    uv run python build_all_records.py --json-out out/ --csv ../../data/content/mini-puzzles.csv

Restartable: puzzles already marked ok/flagged/failed at the current schema_version are skipped
(failed ones are rerun with --retry-failed), so a crashed or stopped run just picks up where it
left off. Bumping records.SCHEMA_VERSION makes the next run redo everything.

Each worker process runs its own Stockfish with one thread: several single-threaded workers get
more done than one worker using every core, and one thread keeps results reproducible.

Environment (Supabase mode), read from new-backend/.env:
    SUPABASE_URL
    SUPABASE_SERVICE_KEY   the service-role key: the records tables are closed to the anon key
"""

from __future__ import annotations

import argparse
import atexit
import os
import signal
import sys
import threading
import time
from collections import Counter
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait
from concurrent.futures.process import BrokenProcessPool
from pathlib import Path

import chess.engine

import engine
from pipeline import (JsonStore, SupabaseStore, build_records, puzzles_from_csv,
                      puzzles_from_supabase, status_for)
from records import SCHEMA_VERSION, PuzzleDataError

HERE = Path(__file__).resolve().parent
PROGRESS_EVERY_S = 15.0
SAVE_ATTEMPTS = 3


# ---------------------------------------------------------------------------------------------
# Worker process: one Stockfish each
# ---------------------------------------------------------------------------------------------

_analyzer: engine.Analyzer | None = None
_engine_args: tuple = ()


def _start_engine():
    global _analyzer
    path, depth = _engine_args
    _analyzer = engine.Analyzer(path, depth=depth)


def _close_engine():
    if _analyzer is not None:
        try:
            _analyzer.close()
        except Exception:
            pass


def _init_worker(path, depth):
    global _engine_args
    signal.signal(signal.SIGINT, signal.SIG_IGN)   # the parent handles Ctrl-C
    _engine_args = (path, depth)
    _start_engine()
    # python-chess runs each engine on a non-daemon thread, and a worker process joins all its
    # threads before it exits, so without this the pool hangs at shutdown. threading's own
    # pre-shutdown hook (what concurrent.futures itself uses) runs before that join; a plain
    # atexit hook would run too late.
    register = getattr(threading, "_register_atexit", atexit.register)
    register(_close_engine)


def _work(puzzle: dict) -> dict:
    """Build one puzzle. Never raises: errors come back as status 'failed'."""
    start = time.perf_counter()
    pid = puzzle["puzzle_id"]
    result = {"puzzle_id": pid, "records": [], "positions": 0}
    for attempt in (1, 2):
        try:
            records, flags = build_records(puzzle, _analyzer)
            status, message = status_for(flags)
            result.update(records=records, status=status, message=message, positions=len(records))
            break
        except PuzzleDataError as e:
            result.update(status="failed", message=str(e))
            break
        except (chess.engine.EngineTerminatedError, chess.engine.EngineError) as e:
            # Stockfish crashed. Restart it and try the puzzle once more.
            result.update(status="failed", message=f"engine error: {e!r}")
            try:
                _analyzer.close()
            except Exception:
                pass
            _start_engine()
        except Exception as e:  # noqa: BLE001 - one bad puzzle must not stop the run
            result.update(status="failed", message=f"{type(e).__name__}: {e}")
            break
    result["seconds"] = time.perf_counter() - start
    return result


# ---------------------------------------------------------------------------------------------
# Parent process
# ---------------------------------------------------------------------------------------------

def _load_env():
    try:
        from dotenv import load_dotenv
        load_dotenv(HERE.parent / ".env")
    except ImportError:
        pass


def supabase_client(read_only: bool = False):
    """Writing records needs the service-role key. Only reading Puzzles_Mini (with --json-out)
    works with the ordinary anon key too."""
    from supabase import create_client

    _load_env()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or (os.environ.get("SUPABASE_KEY") if read_only else None)
    if not url or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_KEY (the service-role key) in new-backend/.env,\n"
                 "or use --json-out to write files instead.")
    return create_client(url, key)


def _fmt_duration(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}h{m:02d}m" if h else f"{m}m{s:02d}s"


def flag_category(message: str) -> str:
    """'move 2 Qe5+: no single clear solution (+1 vs +0.9)' -> 'no single clear solution'."""
    text = message.split(": ", 1)[-1]
    return text.split(" (", 1)[0].strip()


def failure_category(message: str) -> str:
    """Group failure messages: drop the puzzle ID prefix and anything position-specific."""
    text = message.split(": ", 1)[-1] if ": " in message else message
    for marker in (" is illegal", " is not valid UCI", "invalid FEN", "invalid position",
                   "odd length", "expected at least 2 moves", "missing FEN", "missing moves",
                   "engine error", "worker error"):
        if marker in text:
            return marker.strip()
    return text[:80]


class Progress:
    def __init__(self, total: int, workers: int):
        self.total, self.workers = total, workers
        self.counts = Counter()
        self.flag_reasons = Counter()
        self.fail_reasons = Counter()
        self.positions = 0
        self.engine_seconds = 0.0
        self.save_errors: list[str] = []
        self.start = time.perf_counter()
        self.last_print = 0.0

    @property
    def done(self) -> int:
        return sum(self.counts.values())

    def add(self, result: dict):
        self.counts[result["status"]] += 1
        self.positions += result["positions"]
        self.engine_seconds += result["seconds"]
        if result["status"] == "flagged":
            for part in result["message"].split("; "):
                self.flag_reasons[flag_category(part)] += 1
        elif result["status"] == "failed":
            self.fail_reasons[failure_category(result["message"])] += 1

    def line(self) -> str:
        elapsed = time.perf_counter() - self.start
        rate = self.done / elapsed if elapsed else 0
        eta = (self.total - self.done) / rate if rate else 0
        return (f"[{self.done}/{self.total}] ok {self.counts['ok']}  flagged {self.counts['flagged']}  "
                f"failed {self.counts['failed']} | {rate * 60:.0f} puzzles/min | "
                f"elapsed {_fmt_duration(elapsed)}  ETA {_fmt_duration(eta)}")

    def maybe_print(self, force=False):
        now = time.perf_counter()
        if force or now - self.last_print >= PROGRESS_EVERY_S:
            print(self.line(), flush=True)
            self.last_print = now

    def summary(self) -> str:
        wall = time.perf_counter() - self.start
        lines = ["", "=" * 72, "Summary", "=" * 72,
                 f"puzzles: {self.done} (ok {self.counts['ok']}, flagged {self.counts['flagged']}, "
                 f"failed {self.counts['failed']})"]
        if self.save_errors:
            lines.append(f"NOT SAVED (rerun to retry): {len(self.save_errors)}: {' '.join(self.save_errors[:20])}")
        lines.append(f"positions analyzed: {self.positions}")
        lines.append(f"wall time: {_fmt_duration(wall)} with {self.workers} worker(s)")
        if self.positions:
            per_pos = self.engine_seconds / self.positions
            lines.append(f"per position: {per_pos:.2f}s of one worker's time "
                         f"(throughput {self.positions / wall:.2f} positions/s overall)")
            for n in (1, 4, 8):
                lines.append(f"  estimate for 25,420 positions with {n} worker(s): "
                             f"{_fmt_duration(25420 * per_pos / n)}")
        if self.flag_reasons:
            lines.append("flag reasons (per move):")
            lines += [f"  {n:5}  {reason}" for reason, n in self.flag_reasons.most_common()]
        if self.fail_reasons:
            lines.append("failure reasons:")
            lines += [f"  {n:5}  {reason}" for reason, n in self.fail_reasons.most_common(10)]
        return "\n".join(lines)


def save_with_retry(store, result: dict) -> bool:
    for attempt in range(1, SAVE_ATTEMPTS + 1):
        try:
            store.save_records(result["puzzle_id"], result["records"], result["status"], result["message"])
            return True
        except Exception as e:  # noqa: BLE001
            if attempt == SAVE_ATTEMPTS:
                print(f"✗ {result['puzzle_id']}: could not save after {attempt} tries: {e}", file=sys.stderr)
                return False
            time.sleep(2 ** attempt)


def select_todo(puzzles: list[dict], finished: dict[str, str], *, retry_failed: bool,
                force: bool, limit: int | None) -> tuple[list[dict], int]:
    """Drop puzzles already done at the current version. Returns (todo, skipped)."""
    todo = []
    for p in puzzles:
        st = finished.get(p["puzzle_id"])
        if not force and st is not None and not (retry_failed and st == "failed"):
            continue
        todo.append(p)
    skipped = len(puzzles) - len(todo)
    if limit is not None:
        todo = todo[:limit]
    return todo, skipped


def run(args) -> int:
    client = None
    if args.json_out:
        store = JsonStore(args.json_out)
    else:
        client = supabase_client()
        store = SupabaseStore(client)

    if args.csv:
        puzzles = puzzles_from_csv(args.csv, args.puzzle_ids)
    else:
        client = client or supabase_client(read_only=True)
        puzzles = puzzles_from_supabase(client, args.puzzle_ids)
    if args.puzzle_ids:
        missing = set(args.puzzle_ids) - {p["puzzle_id"] for p in puzzles}
        if missing:
            print(f"! not in Puzzles_Mini: {' '.join(sorted(missing))}", file=sys.stderr)

    finished = store.finished(SCHEMA_VERSION)
    todo, skipped = select_todo(puzzles, finished, retry_failed=args.retry_failed,
                                force=args.force, limit=args.limit)

    sf = engine.find_stockfish(args.stockfish)
    print(f"{len(puzzles)} puzzles; {skipped} already done at schema_version {SCHEMA_VERSION}; "
          f"{len(todo)} to run")
    print(f"writing to {store.describe()} | depth {args.depth} | {args.workers} worker(s), "
          f"1 Stockfish thread each ({sf})", flush=True)
    if not todo:
        return 0

    progress = Progress(len(todo), args.workers)
    pending: dict = {}   # future -> puzzle_id
    queue = iter(todo)
    max_in_flight = args.workers * 3
    interrupted = False

    pool = ProcessPoolExecutor(max_workers=args.workers, initializer=_init_worker,
                               initargs=(sf, args.depth))
    try:
        while True:
            while len(pending) < max_in_flight:
                p = next(queue, None)
                if p is None:
                    break
                pending[pool.submit(_work, p)] = p["puzzle_id"]
            if not pending:
                break
            done, _ = wait(pending, return_when=FIRST_COMPLETED)
            for fut in done:
                pid = pending.pop(fut)
                try:
                    result = fut.result()
                except BrokenProcessPool:
                    raise   # a worker process died; handled below, nothing marked failed
                except Exception as e:  # noqa: BLE001
                    result = {"puzzle_id": pid, "records": [], "positions": 0, "seconds": 0.0,
                              "status": "failed", "message": f"worker error: {type(e).__name__}: {e}"}
                if result["status"] == "failed":
                    print(f"✗ {result['puzzle_id']}: {result['message']}", file=sys.stderr, flush=True)
                elif result["status"] == "flagged" and args.verbose:
                    print(f"! {result['puzzle_id']}: {result['message']}", flush=True)
                if save_with_retry(store, result):
                    progress.add(result)
                else:
                    progress.save_errors.append(result["puzzle_id"])
            progress.maybe_print()
    except KeyboardInterrupt:
        interrupted = True
        print("\nStopping... finished puzzles are saved; rerun the same command to resume.", flush=True)
        for fut in pending:
            fut.cancel()
    except BrokenProcessPool:
        interrupted = True
        print("\n✗ A worker process died (out of memory?). Finished puzzles are saved; "
              "rerun the same command to resume.", file=sys.stderr, flush=True)
    finally:
        pool.shutdown(wait=not interrupted, cancel_futures=True)

    progress.maybe_print(force=True)
    print(progress.summary())
    return 130 if interrupted else (1 if progress.save_errors else 0)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workers", type=int, default=4, help="parallel workers (default 4)")
    ap.add_argument("--depth", type=int, default=engine.DEPTH, help=f"Stockfish depth (default {engine.DEPTH})")
    ap.add_argument("--limit", type=int, help="only process this many puzzles (after skipping finished ones)")
    ap.add_argument("--puzzle-ids", nargs="+", help="only these puzzles")
    ap.add_argument("--retry-failed", action="store_true", help="also rerun puzzles marked failed")
    ap.add_argument("--force", action="store_true", help="rerun puzzles even if already done")
    ap.add_argument("--json-out", type=Path, metavar="DIR", help="write JSON files to DIR instead of Supabase")
    ap.add_argument("--csv", type=Path, help="read puzzles from mini-puzzles.csv instead of Supabase")
    ap.add_argument("--stockfish", help="Stockfish binary (default: $STOCKFISH_PATH or `stockfish` on PATH)")
    ap.add_argument("-v", "--verbose", action="store_true", help="print every flagged puzzle")
    args = ap.parse_args(argv)
    if args.workers < 1:
        ap.error("--workers must be at least 1")
    if args.depth != engine.DEPTH:
        print(f"! depth {args.depth} differs from engine.DEPTH ({engine.DEPTH}). Stored records will say "
              f"schema_version {SCHEMA_VERSION} either way, so bump SCHEMA_VERSION if this is the new default.",
              file=sys.stderr)
    try:
        return run(args)
    except FileNotFoundError as e:
        sys.exit(str(e))


if __name__ == "__main__":
    sys.exit(main())
