"""Build facts records for the player moves of a Lichess puzzle.

Pure logic: no database or network access, so it is easy to test.

Lichess puzzle format:
  - `fen` is the position BEFORE the opponent's setup move.
  - `moves` is a list of UCI moves: [setup, player, opponent, player, ...].
    The list always has an even length and ends on a player move.
"""

from __future__ import annotations

import chess

SCHEMA_VERSION = 2  # 2: added `outcome`; `engine` filled by engine.py (Ticket 4)

# Every record must have exactly these keys (checked by validate_record).
REQUIRED_FIELDS = {
    "puzzle_id": str,
    "move_index": int,
    "fen": str,
    "player_color": str,
    "themes": list,
    "teaching_themes": list,
    "moving_piece": str,
    "from": str,
    "to": str,
    "move_san": str,
    "is_check": bool,
    "is_checkmate": bool,
    "is_capture": bool,
    "captured_piece": (str, type(None)),
    "solution_line": list,
    "opponent_idea": dict,
    "engine": dict,
    "outcome": dict,
}


class PuzzleDataError(ValueError):
    """Raised when puzzle data from the database is malformed."""


def normalize_themes(value) -> list[str]:
    """Accept a space/comma-separated string, a list, or None."""
    if value is None:
        return []
    if isinstance(value, str):
        return [t for t in value.replace(",", " ").split() if t]
    return [str(t) for t in value]


def _captured_piece(board: chess.Board, move: chess.Move) -> str | None:
    if not board.is_capture(move):
        return None
    if board.is_en_passant(move):
        return "pawn"  # destination square is empty for en passant
    piece = board.piece_at(move.to_square)
    return chess.piece_name(piece.piece_type) if piece else None


def build_records(
    puzzle_id: str,
    fen: str,
    moves,
    themes=None,
    teaching_themes=None,
) -> dict:
    """Return the per-puzzle document: {puzzle_id, schema_version, records}."""
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

    theme_list = normalize_themes(themes)
    teaching_list = normalize_themes(teaching_themes)

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
            "player_color": player_color,
            "themes": theme_list,
            "teaching_themes": teaching_list,
            "moving_piece": chess.piece_name(piece.piece_type),
            "from": chess.square_name(move.from_square),
            "to": chess.square_name(move.to_square),
            "move_san": sans[i],
            "is_check": after.is_check(),
            "is_checkmate": after.is_checkmate(),
            "is_capture": board.is_capture(move),
            "captured_piece": _captured_piece(board, move),
            "solution_line": sans[i:],
            "opponent_idea": {},
            "engine": {},   # filled by engine.enrich_document
            "outcome": {},  # filled by engine.enrich_document
        })

        board.push(move)
        if i + 1 < len(parsed):
            board.push(parsed[i + 1])  # opponent's reply

    doc = {"puzzle_id": puzzle_id, "schema_version": SCHEMA_VERSION, "records": records}
    validate_document(doc, expected_moves=len(moves))
    return doc


def validate_record(record: dict) -> None:
    missing = REQUIRED_FIELDS.keys() - record.keys()
    if missing:
        raise PuzzleDataError(f"record missing fields: {sorted(missing)}")
    extra = record.keys() - REQUIRED_FIELDS.keys()
    if extra:
        raise PuzzleDataError(f"record has unexpected fields: {sorted(extra)}")
    for field, expected in REQUIRED_FIELDS.items():
        if not isinstance(record[field], expected):
            raise PuzzleDataError(
                f"field {field!r} has type {type(record[field]).__name__}, expected {expected}"
            )


def validate_document(doc: dict, expected_moves: int | None = None) -> None:
    for key in ("puzzle_id", "schema_version", "records"):
        if key not in doc:
            raise PuzzleDataError(f"document missing {key!r}")
    for r in doc["records"]:
        validate_record(r)
    indexes = [r["move_index"] for r in doc["records"]]
    if indexes != list(range(1, len(indexes) + 1)):
        raise PuzzleDataError(f"{doc['puzzle_id']}: move_index not 1..n: {indexes}")
    if expected_moves is not None and len(indexes) != expected_moves // 2:
        raise PuzzleDataError(
            f"{doc['puzzle_id']}: {len(indexes)} records for {expected_moves} moves"
        )
