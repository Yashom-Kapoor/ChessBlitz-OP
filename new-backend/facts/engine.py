"""Engine analysis and outcome summaries for facts records (Ticket 4).

Two fields get added to every record:

  engine   Stockfish's top lines for the position BEFORE the player's move.
  outcome  What the solution achieves, from this move to the end of the puzzle.

`compute_outcome` and `summarize_lines` are pure (no engine needed), so they are
easy to test. `Analyzer` wraps one Stockfish process and is reused for every position.

Scores are always from the PLAYER's point of view (the side to move in `fen`).
"""

from __future__ import annotations

import math
import os
import shutil
from pathlib import Path

import chess
import chess.engine

# --- Settings -----------------------------------------------------------------
DEPTH = 20          # same fixed depth for every position, so scores are comparable
MULTIPV = 3         # top three lines
LINE_LENGTH = 5     # SAN moves stored per line
THREADS = 1         # one thread + a fresh hash per position => reproducible results
HASH_MB = 64

# one_clear_solution thresholds (see facts/ENGINE.md for the reasoning)
CLEAR_WIN_CHANCE_GAP = 20.0   # percentage points between line 1 and line 2
CLEAR_MATE_GAP = 3            # when both lines mate: line 2 must be >= 3 moves slower

PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}
# ------------------------------------------------------------------------------


def find_stockfish(path: str | os.PathLike | None = None) -> str:
    """Explicit path, else $STOCKFISH_PATH, else `stockfish` on PATH."""
    candidate = path or os.environ.get("STOCKFISH_PATH") or shutil.which("stockfish")
    if not candidate or not Path(candidate).exists():
        raise FileNotFoundError(
            "Stockfish not found. Install it (macOS: `brew install stockfish`) "
            "or set STOCKFISH_PATH to the binary."
        )
    return str(candidate)


# --- Outcome ------------------------------------------------------------------

def material(board: chess.Board, color: chess.Color) -> int:
    return sum(len(board.pieces(pt, color)) * v for pt, v in PIECE_VALUES.items())


def compute_outcome(fen: str, solution_line: list[str]) -> dict:
    """Play `solution_line` (SAN, player move first) from `fen`.

    material_change is the change in (player material - opponent material), so it
    accounts for what the player gives up along the way. A promotion to a queen
    counts +8 (queen 9, minus the pawn).
    """
    board = chess.Board(fen)
    player = board.turn
    start = material(board, player) - material(board, not player)
    promotion = False
    for i, san in enumerate(solution_line):
        move = board.parse_san(san)
        if i % 2 == 0 and move.promotion:   # even indexes are the player's moves
            promotion = True
        board.push(move)
    end = material(board, player) - material(board, not player)
    return {
        "checkmate": board.is_checkmate(),
        "material_change": end - start,
        "promotion": promotion,
    }


# --- Engine summary -----------------------------------------------------------

def win_chance(score: float | None, mate_in: int | None) -> float:
    """Chance of winning (0-100) for the player, using Lichess's formula.

    Mates are 100 (player mates) or 0 (player gets mated).
    """
    if mate_in is not None:
        return 100.0 if mate_in > 0 else 0.0
    cp = score * 100
    return 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1)


def _fmt(line: dict) -> str:
    if line["mate_in"] is not None:
        m = line["mate_in"]
        return f"mate in {m}" if m > 0 else f"mated in {-m}"
    return f"{line['score']:+.2f}"


def summarize_lines(lines: list[dict], solution_san: str, depth: int) -> dict:
    """Build the `engine` field from already-extracted lines (best first).

    Each line: {"move", "score", "mate_in", "line"} with score in pawns from the
    player's view, `score` null when `mate_in` is set. A negative `mate_in` means
    the OPPONENT mates in that many moves.
    """
    for ln in lines:
        ln["win_chance"] = round(win_chance(ln["score"], ln["mate_in"]), 1)

    top = lines[0]
    gap_pawns = None
    if len(lines) == 1:
        gap, clear = "only legal move", True
    else:
        second = lines[1]
        gap = f"{_fmt(top)} vs {_fmt(second)}"
        if top["mate_in"] is None and second["mate_in"] is None:
            gap_pawns = round(top["score"] - second["score"], 2)
        if (top["mate_in"] or 0) > 0 and (second["mate_in"] or 0) > 0:
            clear = second["mate_in"] - top["mate_in"] >= CLEAR_MATE_GAP
        else:
            clear = top["win_chance"] - second["win_chance"] >= CLEAR_WIN_CHANCE_GAP

    return {
        "depth": depth,
        "lines": lines,
        "solution_is_top": top["move"] == solution_san,
        "gap": gap,
        "gap_pawns": gap_pawns,
        "one_clear_solution": clear,
    }


def line_from_info(board: chess.Board, info: dict, length: int = LINE_LENGTH) -> dict:
    """Turn one python-chess analysis result into a stored line."""
    pov = info["score"].pov(board.turn)
    mate = pov.mate()
    if mate == 0:  # side to move is already mated; cannot happen in a puzzle position
        mate = -1
    sans, probe = [], board.copy(stack=False)
    for move in info.get("pv", [])[:length]:
        sans.append(probe.san(move))
        probe.push(move)
    return {
        "move": sans[0],
        "score": None if mate is not None else round(pov.score() / 100, 2),
        "mate_in": mate,
        "line": sans,
    }


def enrich_document(doc: dict, analyzer: "Analyzer") -> list[str]:
    """Fill `engine` and `outcome` on every record in place. Returns warnings to report."""
    warnings = []
    for r in doc["records"]:
        r["engine"] = analyzer.engine_field(r["fen"], r["move_san"])
        r["outcome"] = compute_outcome(r["fen"], r["solution_line"])
        where = f"{r['puzzle_id']} move {r['move_index']} ({r['move_san']})"
        e = r["engine"]
        if not e["solution_is_top"]:
            warnings.append(f"{where}: solution is not the engine's top move "
                            f"(engine prefers {e['lines'][0]['move']}; {e['gap']})")
        if not e["one_clear_solution"]:
            warnings.append(f"{where}: no single clear solution ({e['gap']})")
    return warnings


class Analyzer:
    """One Stockfish process, reused for every position.

        with Analyzer() as a:
            record["engine"] = a.engine_field(record["fen"], record["move_san"])
    """

    def __init__(self, path=None, depth: int = DEPTH, multipv: int = MULTIPV):
        self.depth, self.multipv = depth, multipv
        self.engine = chess.engine.SimpleEngine.popen_uci(find_stockfish(path))
        self.engine.configure({"Threads": THREADS, "Hash": HASH_MB})
        self.name = self.engine.id.get("name", "Stockfish")

    def engine_field(self, fen: str, solution_san: str) -> dict:
        board = chess.Board(fen)
        # A fresh `game` object makes python-chess send `ucinewgame`, clearing the hash,
        # so each position's result doesn't depend on what was analyzed before it.
        infos = self.engine.analyse(
            board, chess.engine.Limit(depth=self.depth), multipv=self.multipv, game=object()
        )
        lines = [line_from_info(board, info) for info in infos if info.get("pv")]
        field = summarize_lines(lines, solution_san, self.depth)
        field["engine_name"] = self.name
        return field

    def close(self):
        self.engine.quit()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
