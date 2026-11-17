"""Build facts records for the player moves of a Lichess puzzle.

Pure logic: no database, engine or network access, so it is easy to test.

Lichess puzzle format:
  - `fen` is the position BEFORE the opponent's setup move.
  - `moves` is a list of UCI moves: [setup, player, opponent, player, ...].
    The list always has an even length and ends on a player move.

Records come out in the shape of a `Puzzles_Mini_Records` row (see sql/puzzles_mini_records.sql):
`from_square`/`to_square` instead of `from`/`to`, no `themes`/`teaching_themes` (those live in
Puzzles and Puzzles_Mini and are joined back in by `get_records` in the backend).
"""

from __future__ import annotations

import chess

# One version number for the record format AND how it's computed. Bump it whenever the output
# changes meaningfully: a field added/renamed/removed, a value computed differently (including
# the default engine depth), or a bug fix that changes results. The batch runner redoes every
# puzzle whose status row has an older version.
#   2: added `outcome`; `engine` filled by engine.py (Ticket 4)
#   3: stored in Supabase (Puzzles_Mini_Records): from/to -> from_square/to_square,
#      themes/teaching_themes dropped from the stored row, generated_at added
SCHEMA_VERSION = 3

# Every record must have exactly these keys (checked by validate_record).
RECORD_FIELDS = {
    "puzzle_id": str,
    "move_index": int,
    "fen": str,
    "move_san": str,
    "player_color": str,
    "moving_piece": str,
    "from_square": str,
    "to_square": str,
    "is_check": bool,
    "is_capture": bool,
    "is_checkmate": bool,
    "captured_piece": (str, type(None)),
    "solution_line": list,
    "engine": dict,
    "outcome": dict,
    "opponent_idea": dict,
    "schema_version": int,
    "generated_at": (str, type(None)),   # ISO timestamp; set by pipeline.build_records
}


class PuzzleDataError(ValueError):
    """Raised when a puzzle's data is malformed (bad FEN, illegal move, odd move count...)."""


def _captured_piece(board: chess.Board, move: chess.Move) -> str | None:
    if not board.is_capture(move):
        return None
    if board.is_en_passant(move):
        return "pawn"  # destination square is empty for en passant
    piece = board.piece_at(move.to_square)
    return chess.piece_name(piece.piece_type) if piece else None


def build_base_records(puzzle_id: str, fen: str, moves) -> list[dict]:
    """One record per player move, with `engine`/`outcome` left empty.

    Raises PuzzleDataError if the puzzle can't be played through.
    """
    if not fen or not isinstance(fen, str):
        raise PuzzleDataError(f"{puzzle_id}: missing FEN")
    if moves is None:
        raise PuzzleDataError(f"{puzzle_id}: missing moves")
    if isinstance(moves, str):
        moves = moves.split()
    moves = list(moves)

    if len(moves) < 2:
        raise PuzzleDataError(f"{puzzle_id}: expected at least 2 moves, got {len(moves)}")
    if len(moves) % 2 != 0:
        raise PuzzleDataError(
            f"{puzzle_id}: move list has odd length {len(moves)}; "
            "Lichess puzzles should end on a player move"
        )

    try:
        board = chess.Board(fen)
    except ValueError as e:
        raise PuzzleDataError(f"{puzzle_id}: invalid FEN {fen!r}: {e}") from e
    if not board.is_valid():
        raise PuzzleDataError(f"{puzzle_id}: invalid position {fen!r}: {board.status()!r}")

    # Parse every move against the board up front, so a bad move fails loudly
    # with its position in the list, and so we can produce SAN for every move.
    parsed: list[chess.Move] = []
    sans: list[str] = []
    probe = board.copy()
    for i, uci in enumerate(moves):
        try:
            move = chess.Move.from_uci(uci)
        except ValueError as e:
            raise PuzzleDataError(f"{puzzle_id}: move {i + 1} {uci!r} is not valid UCI") from e
        if move not in probe.legal_moves:
            raise PuzzleDataError(
                f"{puzzle_id}: move {i + 1} {uci!r} is illegal in position {probe.fen()}"
            )
        sans.append(probe.san(move))
        parsed.append(move)
        probe.push(move)

    # Play the opponent's setup move; the player is whoever moves next.
    board.push(parsed[0])
    player_color = "white" if board.turn == chess.WHITE else "black"

    records = []
    for i in range(1, len(parsed), 2):
        move = parsed[i]
        piece = board.piece_at(move.from_square)
        after = board.copy(stack=False)
        after.push(move)

        records.append({
            "puzzle_id": puzzle_id,
            "move_index": (i + 1) // 2,
            "fen": board.fen(),
            "move_san": sans[i],
            "player_color": player_color,
            "moving_piece": chess.piece_name(piece.piece_type),
            "from_square": chess.square_name(move.from_square),
            "to_square": chess.square_name(move.to_square),
            "is_check": after.is_check(),
            "is_capture": board.is_capture(move),
            "is_checkmate": after.is_checkmate(),
            "captured_piece": _captured_piece(board, move),
            "solution_line": sans[i:],
            "engine": {},    # filled by engine.enrich_records
            "outcome": {},   # filled by engine.enrich_records
            "opponent_idea": {},
            "schema_version": SCHEMA_VERSION,
            "generated_at": None,
        })

        board.push(move)
        if i + 1 < len(parsed):
            board.push(parsed[i + 1])  # opponent's reply

    validate_records(records, expected_moves=len(moves))
    return records


def validate_record(record: dict) -> None:
    missing = RECORD_FIELDS.keys() - record.keys()
    if missing:
        raise PuzzleDataError(f"record missing fields: {sorted(missing)}")
    extra = record.keys() - RECORD_FIELDS.keys()
    if extra:
        raise PuzzleDataError(f"record has unexpected fields: {sorted(extra)}")
    for field, expected in RECORD_FIELDS.items():
        if not isinstance(record[field], expected):
            raise PuzzleDataError(
                f"field {field!r} has type {type(record[field]).__name__}, expected {expected}"
            )


def validate_records(records: list[dict], expected_moves: int | None = None) -> None:
    for r in records:
        validate_record(r)
    if not records:
        raise PuzzleDataError("no records")
    pid = records[0]["puzzle_id"]
    if any(r["puzzle_id"] != pid for r in records):
        raise PuzzleDataError(f"{pid}: records for more than one puzzle")
    indexes = [r["move_index"] for r in records]
    if indexes != list(range(1, len(indexes) + 1)):
        raise PuzzleDataError(f"{pid}: move_index not 1..n: {indexes}")
    if expected_moves is not None and len(indexes) != expected_moves // 2:
        raise PuzzleDataError(f"{pid}: {len(indexes)} records for {expected_moves} moves")
