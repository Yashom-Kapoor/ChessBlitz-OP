"""Flask endpoint serving generated facts records.

Registered in app.py:

    from backend.records_api import records_bp
    app.register_blueprint(records_bp)

Then: GET /puzzles/<id>/records
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from flask import Blueprint, abort, jsonify

# new-backend/src/backend/records_api.py -> new-backend/facts/data/records
RECORDS_DIR = Path(
    os.environ.get("RECORDS_DIR", Path(__file__).resolve().parents[2] / "facts" / "data" / "records")
)

# Lichess puzzle IDs are 5 alphanumeric chars; also blocks path traversal.
_ID_RE = re.compile(r"^[A-Za-z0-9]{1,16}$")

records_bp = Blueprint("records", __name__)


@records_bp.get("/puzzles/<puzzle_id>/records")
def get_records(puzzle_id: str):
    if not _ID_RE.match(puzzle_id):
        abort(404, description=f"Unknown puzzle id: {puzzle_id}")
    path = RECORDS_DIR / f"{puzzle_id}.json"
    if not path.is_file():
        abort(404, description=f"No records for puzzle {puzzle_id}")
    return jsonify(json.loads(path.read_text()))


if __name__ == "__main__":
    # Standalone for quick testing: python records_api.py
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(records_bp)
    app.run(port=5001, debug=True)
