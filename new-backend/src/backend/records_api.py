"""Backend access to facts records (Puzzles_Mini_Records).

Records are BACKEND-ONLY: hint generation and wrong-move analysis read them on the server, and
the app never receives them. Use the helper, not an HTTP call:

    from backend.records_api import get_records
    records = get_records("00Kia")          # [] if the puzzle has no records

get_records returns records in move_index order, in the same shape as the old JSON records
(schema v2): `from`/`to` instead of `from_square`/`to_square`, with `themes` (from Puzzles) and
`teaching_themes` (from Puzzles_Mini) joined in.

The tables are closed to the anon key, so this uses the service-role key: SUPABASE_URL and
SUPABASE_SERVICE_KEY in new-backend/.env.

GET /puzzles/<id>/records is kept for DEBUGGING ONLY. It 404s unless DEV_TOOLS=1, the app must
not call it, and it must stay off once the backend is hosted.
"""

from __future__ import annotations

import os
import re

from flask import Blueprint, abort, jsonify

RECORDS_TABLE = "Puzzles_Mini_Records"
PUZZLES_TABLE = "Puzzles"
PUZZLES_MINI_TABLE = "Puzzles_Mini"
COL_ID = "PuzzleId"
COL_THEMES = "Themes"
TEACHING_PREFIX = "Themes_"   # Puzzles_Mini one-hot columns: Themes_fork, Themes_pin, ...

# Field order of the old JSON records, which get_records reproduces.
API_FIELDS = (
    "puzzle_id", "move_index", "fen", "player_color", "themes", "teaching_themes", "moving_piece",
    "from", "to", "move_san", "is_check", "is_checkmate", "is_capture", "captured_piece",
    "solution_line", "opponent_idea", "engine", "outcome",
)

# Lichess puzzle IDs are 5 alphanumeric chars.
_ID_RE = re.compile(r"^[A-Za-z0-9]{1,16}$")

_service_client = None


def service_client():
    """Supabase client with the service-role key (bypasses row-level security). Server-side only."""
    global _service_client
    if _service_client is None:
        from supabase import create_client

        url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("get_records needs SUPABASE_URL and SUPABASE_SERVICE_KEY in new-backend/.env")
        _service_client = create_client(url, key)
    return _service_client


# --- shape helpers (pure) ---------------------------------------------------------------------

def normalize_themes(value) -> list[str]:
    """Puzzles.Themes may be a space/comma-separated string, a list, or None."""
    if value is None:
        return []
    if isinstance(value, str):
        return [t for t in value.replace(",", " ").split() if t]
    return [str(t) for t in value]


def _truthy(v) -> bool:
    if isinstance(v, str):
        return v.strip().lower() in ("true", "1", "t", "yes")
    return bool(v)


def teaching_themes_from_rows(rows: list[dict]) -> list[str]:
    """Themes_<name> columns that are true in ANY Puzzles_Mini row for the puzzle."""
    found = []
    for r in rows:
        for col, val in r.items():
            if col.startswith(TEACHING_PREFIX) and _truthy(val):
                name = col[len(TEACHING_PREFIX):]
                if name not in found:
                    found.append(name)
    return found


def to_api_record(row: dict, themes: list[str], teaching_themes: list[str]) -> dict:
    """A Puzzles_Mini_Records row -> the old JSON record shape."""
    rec = {
        **row,
        "from": row["from_square"],
        "to": row["to_square"],
        "themes": list(themes),
        "teaching_themes": list(teaching_themes),
        "solution_line": list(row["solution_line"]),
        "engine": row.get("engine") or {},
        "outcome": row.get("outcome") or {},
        "opponent_idea": row.get("opponent_idea") or {},
    }
    return {k: rec[k] for k in API_FIELDS}


# --- database ---------------------------------------------------------------------------------

def _load(puzzle_id: str, client) -> tuple[list[dict], list[str], list[str]]:
    rows = (client.table(RECORDS_TABLE).select("*").eq("puzzle_id", puzzle_id)
            .order("move_index").execute().data)
    if not rows:
        return [], [], []
    themes_rows = (client.table(PUZZLES_TABLE).select(COL_THEMES).eq(COL_ID, puzzle_id)
                   .limit(1).execute().data)
    themes = normalize_themes(themes_rows[0][COL_THEMES]) if themes_rows else []
    mini_rows = client.table(PUZZLES_MINI_TABLE).select("*").eq(COL_ID, puzzle_id).execute().data
    return rows, themes, teaching_themes_from_rows(mini_rows)


def get_records(puzzle_id: str, client=None) -> list[dict]:
    """A puzzle's records in move_index order (old JSON shape), or [] if it has none."""
    rows, themes, teaching = _load(puzzle_id, client or service_client())
    return [to_api_record(r, themes, teaching) for r in rows]


# --- debug endpoint ---------------------------------------------------------------------------

records_bp = Blueprint("records", __name__)


@records_bp.get("/puzzles/<puzzle_id>/records")
def records_route(puzzle_id: str):
    # Debugging only: invisible unless DEV_TOOLS=1 (same switch as the /dev routes).
    if os.getenv("DEV_TOOLS") != "1":
        abort(404)
    if not _ID_RE.match(puzzle_id):
        abort(404, description=f"Unknown puzzle id: {puzzle_id}")
    rows, themes, teaching = _load(puzzle_id, service_client())
    if not rows:
        abort(404, description=f"No records for puzzle {puzzle_id}")
    return jsonify({
        "puzzle_id": puzzle_id,
        "schema_version": rows[0]["schema_version"],
        "records": [to_api_record(r, themes, teaching) for r in rows],
    })


if __name__ == "__main__":
    # Standalone for quick testing: DEV_TOOLS=1 python records_api.py
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(records_bp)
    app.run(port=5001, debug=True)
