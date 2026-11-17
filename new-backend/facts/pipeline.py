"""Records pipeline: one puzzle in, its records out, then saved somewhere.

    build_records(puzzle, analyzer)          pure-ish: no Supabase, no files
    SupabaseStore(client).save_records(...)  Puzzles_Mini_Records via replace_puzzle_records()
    JsonStore(dir).save_records(...)         one JSON file per puzzle, for local debugging

build_all_records.py ties them together.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import engine
from records import SCHEMA_VERSION, build_base_records, validate_records

RECORDS_TABLE = "Puzzles_Mini_Records"
STATUS_TABLE = "Puzzles_Mini_Records_Status"
REPLACE_FN = "replace_puzzle_records"

STATUSES = ("ok", "flagged", "failed")


# ---------------------------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------------------------

def build_records(puzzle: dict, analyzer: "engine.Analyzer | None" = None) -> tuple[list[dict], list[str]]:
    """Build one puzzle's records.

    `puzzle` is {"puzzle_id", "fen", "moves"} (moves: UCI list or space-separated string).
    With an analyzer, `engine` is filled; without one it stays {} (tests only).

    Returns (records, flags). Raises records.PuzzleDataError for bad data.
    """
    pid = puzzle["puzzle_id"]
    records = build_base_records(pid, puzzle.get("fen"), puzzle.get("moves"))
    if analyzer is not None:
        flags = engine.enrich_records(records, analyzer)
    else:
        engine.fill_outcomes(records)
        flags = []
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for r in records:
        r["generated_at"] = now
    validate_records(records)
    return records, flags


def status_for(flags: list[str]) -> tuple[str, str | None]:
    return ("flagged", "; ".join(flags)) if flags else ("ok", None)


def _check_status(status: str, records: list[dict]) -> None:
    if status not in STATUSES:
        raise ValueError(f"bad status {status!r}")
    if status != "failed" and not records:
        raise ValueError(f"status {status!r} needs records")


# ---------------------------------------------------------------------------------------------
# Stores
# ---------------------------------------------------------------------------------------------

class SupabaseStore:
    """Reads and writes Puzzles_Mini_Records(_Status). Needs the service-role key: both tables
    are locked to the anon key (row-level security with no policies)."""

    PAGE = 1000  # PostgREST returns at most 1000 rows per request by default

    def __init__(self, client):
        self.client = client

    def save_records(self, puzzle_id: str, records: list[dict], status: str, message: str | None) -> None:
        """Replace all of a puzzle's rows and its status row, in one transaction (a Postgres
        function), so a crash can't leave a puzzle with its old rows deleted and no new ones."""
        _check_status(status, records)
        rows = [] if status == "failed" else [
            {k: v for k, v in r.items() if k not in ("puzzle_id", "schema_version")} for r in records
        ]
        self.client.rpc(REPLACE_FN, {
            "p_puzzle_id": puzzle_id,
            "p_records": rows,
            "p_status": status,
            "p_message": message,
            "p_schema_version": SCHEMA_VERSION,
        }).execute()

    def finished(self, schema_version: int = SCHEMA_VERSION) -> dict[str, str]:
        """{puzzle_id: status} for every puzzle already run at this schema version."""
        out, start = {}, 0
        while True:
            page = (self.client.table(STATUS_TABLE)
                    .select("puzzle_id,status")
                    .eq("schema_version", schema_version)
                    .order("puzzle_id")
                    .range(start, start + self.PAGE - 1)
                    .execute().data)
            out.update({r["puzzle_id"]: r["status"] for r in page})
            if len(page) < self.PAGE:
                return out
            start += self.PAGE

    def describe(self) -> str:
        return f"Supabase {RECORDS_TABLE}"


class JsonStore:
    """Writes <dir>/<puzzle_id>.json: {puzzle_id, status, message, schema_version, records}."""

    def __init__(self, directory: Path):
        self.dir = Path(directory)
        self.dir.mkdir(parents=True, exist_ok=True)

    def save_records(self, puzzle_id: str, records: list[dict], status: str, message: str | None) -> None:
        _check_status(status, records)
        doc = {
            "puzzle_id": puzzle_id,
            "status": status,
            "message": message,
            "schema_version": SCHEMA_VERSION,
            "records": [] if status == "failed" else records,
        }
        path = self.dir / f"{puzzle_id}.json"
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(doc, indent=2) + "\n")
        os.replace(tmp, path)   # atomic: never a half-written file

    def finished(self, schema_version: int = SCHEMA_VERSION) -> dict[str, str]:
        out = {}
        for path in self.dir.glob("*.json"):
            try:
                doc = json.loads(path.read_text())
            except (OSError, ValueError):
                continue
            if doc.get("schema_version") == schema_version and doc.get("status") in STATUSES:
                out[doc["puzzle_id"]] = doc["status"]
        return out

    def describe(self) -> str:
        return f"JSON files in {self.dir}"


# ---------------------------------------------------------------------------------------------
# Puzzle sources
# ---------------------------------------------------------------------------------------------

PUZZLES_MINI_TABLE = "Puzzles_Mini"
COL_ID, COL_FEN, COL_MOVES = "PuzzleId", "FEN", "Moves"


def _puzzle(row: dict) -> dict:
    return {"puzzle_id": row[COL_ID], "fen": row.get(COL_FEN), "moves": row.get(COL_MOVES)}


def puzzles_from_supabase(client, puzzle_ids: list[str] | None = None, page: int = 1000) -> list[dict]:
    """Every puzzle in Puzzles_Mini (or just `puzzle_ids`), read in pages, deduplicated by ID."""
    seen: dict[str, dict] = {}
    if puzzle_ids:
        for i in range(0, len(puzzle_ids), 200):
            chunk = puzzle_ids[i:i + 200]
            rows = (client.table(PUZZLES_MINI_TABLE).select(f"{COL_ID},{COL_FEN},{COL_MOVES}")
                    .in_(COL_ID, chunk).execute().data)
            for r in rows:
                seen.setdefault(r[COL_ID], _puzzle(r))
        return [seen[p] for p in puzzle_ids if p in seen]
    start = 0
    while True:
        rows = (client.table(PUZZLES_MINI_TABLE).select(f"{COL_ID},{COL_FEN},{COL_MOVES}")
                .order(COL_ID).range(start, start + page - 1).execute().data)
        for r in rows:
            seen.setdefault(r[COL_ID], _puzzle(r))
        if len(rows) < page:
            return list(seen.values())
        start += page


def puzzles_from_csv(path: Path, puzzle_ids: list[str] | None = None) -> list[dict]:
    """Offline source: data/content/mini-puzzles.csv (same columns as Puzzles_Mini)."""
    import csv

    seen: dict[str, dict] = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            seen.setdefault(r[COL_ID], _puzzle(r))
    if puzzle_ids:
        return [seen[p] for p in puzzle_ids if p in seen]
    return list(seen.values())
