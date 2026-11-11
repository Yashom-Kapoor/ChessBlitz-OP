"""Generate facts records for Lichess puzzles stored in Supabase.

Usage:
    python generate_records.py 00AhO 01F1N 00Kia 04E5q 0cUVg
    python generate_records.py 00AhO --out data/records
    python generate_records.py 00AhO --csv ../../data/content/mini-puzzles.csv   # offline
    python generate_records.py 00AhO --fixture puzzles.json                     # offline
    python generate_records.py 00AhO --no-engine                                # skip Stockfish

Every record gets `engine` and `outcome` (Ticket 4), which needs Stockfish:
`brew install stockfish`, or set STOCKFISH_PATH. To add them to records that are
already generated, without Supabase, use add_engine.py.

Environment (for Supabase): SUPABASE_URL, SUPABASE_KEY, read from new-backend/.env
if not already set.

Writes one JSON file per puzzle: <out>/<puzzle_id>.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from records import PuzzleDataError, build_records, validate_document

# --- Supabase tables (match new-backend/src/backend/app.py and data/MiniPuzzleSet.ipynb)
PUZZLES_TABLE = "Puzzles"
PUZZLES_MINI_TABLE = "Puzzles_Mini"
COL_ID = "PuzzleId"
COL_FEN = "FEN"
COL_MOVES = "Moves"
COL_THEMES = "Themes"
# Puzzles_Mini one-hot encodes teaching themes as boolean columns: Themes_fork, Themes_pin, ...
TEACHING_PREFIX = "Themes_"
# -----------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
DEFAULT_OUT = HERE / "data" / "records"


def _truthy(v) -> bool:
    if isinstance(v, str):
        return v.strip().lower() in ("true", "1", "t", "yes")
    return bool(v)


def teaching_themes_from_rows(rows: list[dict]) -> list[str]:
    """Collect Themes_<name> columns that are true in ANY row (a puzzle may appear once per theme)."""
    found = []
    for r in rows:
        for col, val in r.items():
            if col.startswith(TEACHING_PREFIX) and _truthy(val):
                name = col[len(TEACHING_PREFIX):]
                if name not in found:
                    found.append(name)
    return found


def _load_env():
    """Load SUPABASE_URL / SUPABASE_KEY from new-backend/.env if not already set."""
    try:
        from dotenv import load_dotenv
        load_dotenv(HERE.parent / ".env")
    except ImportError:
        pass


def fetch_from_supabase(puzzle_ids: list[str]) -> dict[str, dict]:
    from supabase import create_client

    _load_env()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL and SUPABASE_KEY must be set (new-backend/.env), or use --csv/--fixture")
    client = create_client(url, key)

    rows = client.table(PUZZLES_TABLE).select("*").in_(COL_ID, puzzle_ids).execute().data
    mini = client.table(PUZZLES_MINI_TABLE).select("*").in_(COL_ID, puzzle_ids).execute().data
    mini_by_id: dict[str, list[dict]] = {}
    for r in mini:
        mini_by_id.setdefault(r[COL_ID], []).append(r)

    out = {}
    for r in rows:
        pid = r[COL_ID]
        out[pid] = {
            "fen": r[COL_FEN],
            "moves": r[COL_MOVES],
            "themes": r.get(COL_THEMES),
            "teaching_themes": teaching_themes_from_rows(mini_by_id.get(pid, [])),
            "_has_mini_row": pid in mini_by_id,
        }
    # Some mini puzzles (e.g. 00AhO) aren't in Puzzles. Puzzles_Mini has FEN/Moves too,
    # so use it; only the full Lichess `themes` list is unavailable for these.
    for pid, mrows in mini_by_id.items():
        if pid not in out:
            print(f"! {pid}: not in {PUZZLES_TABLE}; using {PUZZLES_MINI_TABLE} (themes will be [])",
                  file=sys.stderr)
            out[pid] = {
                "fen": mrows[0][COL_FEN],
                "moves": mrows[0][COL_MOVES],
                "themes": None,
                "teaching_themes": teaching_themes_from_rows(mrows),
                "_has_mini_row": True,
            }
    return out


def fetch_from_csv(path: Path, puzzle_ids: list[str]) -> dict[str, dict]:
    """Offline fallback: data/content/mini-puzzles.csv (same columns as Puzzles_Mini).

    That CSV has no full Lichess `Themes` column, so `themes` is left empty.
    """
    import csv

    wanted = set(puzzle_ids)
    by_id: dict[str, list[dict]] = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            if r[COL_ID] in wanted:
                by_id.setdefault(r[COL_ID], []).append(r)
    return {
        pid: {
            "fen": rows[0][COL_FEN],
            "moves": rows[0][COL_MOVES],
            "themes": None,
            "teaching_themes": teaching_themes_from_rows(rows),
            "_has_mini_row": True,
        }
        for pid, rows in by_id.items()
    }


def fetch_from_fixture(path: Path, puzzle_ids: list[str]) -> dict[str, dict]:
    """Fixture format: {"<id>": {"fen": ..., "moves": ..., "themes": ..., "teaching_themes": ...}}"""
    data = json.loads(path.read_text())
    return {
        pid: {**data[pid], "_has_mini_row": "teaching_themes" in data[pid]}
        for pid in puzzle_ids
        if pid in data
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("puzzle_ids", nargs="+")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--fixture", type=Path, help="read puzzles from a JSON file instead of Supabase")
    src.add_argument("--csv", type=Path, help="read from mini-puzzles.csv instead of Supabase (no full themes)")
    ap.add_argument("--no-engine", action="store_true", help="leave `engine`/`outcome` empty (no Stockfish)")
    ap.add_argument("--stockfish", help="path to the Stockfish binary (default: $STOCKFISH_PATH or PATH)")
    ap.add_argument("--depth", type=int, default=None, help="search depth (default: engine.DEPTH)")
    args = ap.parse_args(argv)

    analyzer = None
    if not args.no_engine:
        import engine
        try:
            analyzer = engine.Analyzer(args.stockfish, depth=args.depth or engine.DEPTH)
        except FileNotFoundError as e:
            sys.exit(f"{e}\n(or pass --no-engine to skip engine analysis)")

    if args.fixture:
        puzzles = fetch_from_fixture(args.fixture, args.puzzle_ids)
    elif args.csv:
        puzzles = fetch_from_csv(args.csv, args.puzzle_ids)
    else:
        puzzles = fetch_from_supabase(args.puzzle_ids)

    args.out.mkdir(parents=True, exist_ok=True)
    failed = []
    for pid in args.puzzle_ids:
        p = puzzles.get(pid)
        if p is None:
            print(f"✗ {pid}: not found in {PUZZLES_TABLE} or {PUZZLES_MINI_TABLE}", file=sys.stderr)
            failed.append(pid)
            continue
        if not p["_has_mini_row"]:
            print(f"! {pid}: no {PUZZLES_MINI_TABLE} row; teaching_themes will be []", file=sys.stderr)
        try:
            doc = build_records(pid, p["fen"], p["moves"], p.get("themes"), p.get("teaching_themes"))
        except PuzzleDataError as e:
            print(f"✗ {e}", file=sys.stderr)
            failed.append(pid)
            continue
        if analyzer:
            for w in engine.enrich_document(doc, analyzer):
                print(f"! {w}", file=sys.stderr)
            validate_document(doc)
        path = args.out / f"{pid}.json"
        path.write_text(json.dumps(doc, indent=2) + "\n")
        sans = " ".join(r["move_san"] for r in doc["records"])
        print(f"✓ {pid}: {len(doc['records'])} record(s) [{sans}] -> {path}")

    if analyzer:
        analyzer.close()
    if failed:
        print(f"\n{len(failed)} puzzle(s) failed: {' '.join(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
