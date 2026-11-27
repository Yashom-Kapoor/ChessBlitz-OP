# Facts records

One **facts record** per player move of every puzzle in `Puzzles_Mini`: the position, the move, what it captures or checks, the solution line, Stockfish's analysis (`engine`) and what the solution wins (`outcome`). They're the raw material for hints and wrong-move feedback.

Records are **backend-only**. They live in the Supabase table `Puzzles_Mini_Records`, and server code reads them with `get_records()`. The app never receives them; it only gets finished hints.

```
new-backend/
  sql/puzzles_mini_records.sql   # tables + replace_puzzle_records() (team lead runs it)
  facts/
    records.py                   # pure logic: puzzle -> records, schema check, SCHEMA_VERSION
    engine.py                    # Stockfish analysis + outcome (Ticket 4), flags
    pipeline.py                  # build_records(), SupabaseStore / JsonStore, puzzle sources
    build_all_records.py         # the batch runner (CLI)
    ENGINE.md                    # engine settings and threshold choices (Ticket 4)
    test_records.py              # pure tests, no setup needed
    test_engine.py               # engine tests (Stockfish ones skip without it)
    test_db.py                   # SQL + store + runner + get_records against a scratch Postgres
    data/records/*.json          # frozen schema-v2 records for the 5 demo puzzles (test reference)
  src/backend/
    records_api.py               # get_records() + debug-only GET /puzzles/<id>/records
```

## Setup

1. **Database (team lead, once).** Run `sql/puzzles_mini_records.sql` in the Supabase SQL editor. It creates both tables and the function, and is safe to re-run.
2. **Service-role key.** Both tables are locked to the anon key (row-level security with no policies), so the runner and `get_records()` need the service-role key. Add it to `new-backend/.env` as `SUPABASE_SERVICE_KEY` (see `.env.example`). Server-side only: never in the app, never committed.
3. **Stockfish.** `brew install stockfish`, or set `STOCKFISH_PATH`.

## Run

From `new-backend/facts/`:

```bash
uv run python build_all_records.py --limit 50 --workers 4     # timing test: do this first
uv run python build_all_records.py --workers 4                # the full run (resumable)
```

| Option | What it does |
| --- | --- |
| `--workers N` | Parallel workers, each with its own one-thread Stockfish (default 4) |
| `--depth N` | Stockfish depth (default 20) |
| `--limit N` | Only process N puzzles (after skipping finished ones) |
| `--puzzle-ids ID ...` | Only these puzzles |
| `--retry-failed` | Also rerun puzzles marked `failed` |
| `--force` | Rerun even if already done (e.g. spot-checking a few) |
| `--json-out DIR` | Write `DIR/<id>.json` instead of Supabase, for local debugging |
| `--csv PATH` | Read puzzles from `data/content/mini-puzzles.csv` instead of Supabase (offline) |
| `-v` | Print every flagged puzzle as it happens |

It prints progress every 15 seconds (done, flagged, failed, rate, ETA) and a summary at the end with the measured time per position, an estimate for the full run, and the most common flag and failure reasons.

**Stopping and resuming.** Press Ctrl-C at any point. Finished puzzles are already saved; rerun the same command and it skips every puzzle whose status row is at the current `schema_version`.

**Statuses** (`Puzzles_Mini_Records_Status`, one row per puzzle):

| Status | Meaning |
| --- | --- |
| `ok` | Records written |
| `flagged` | Records written, but a human should look: the solution isn't Stockfish's top move, or there's no single clear solution. `message` says which move and why |
| `failed` | Bad data (FEN, illegal or missing moves) or an engine crash. No records; `message` has the error |

## Reading records (backend)

```python
from backend.records_api import get_records

records = get_records("00Kia")   # list in move_index order; [] if none
```

Records come back in the **same shape as the old JSON records**: `from`/`to` (not `from_square`/`to_square`), with `themes` from `Puzzles` and `teaching_themes` from `Puzzles_Mini` joined in. Hint generation and wrong-move analysis should use this, not the HTTP endpoint.

`GET /puzzles/<id>/records` still exists **for debugging only**: it 404s unless `DEV_TOOLS=1`, the app doesn't call it, and it must stay off once the backend is hosted.

## Versioning

There's one version number, `records.SCHEMA_VERSION` (now **3**). Bump it whenever the output changes meaningfully: a field added, renamed or removed; a value computed differently (including the default depth); or a bug fix that changes results. The next run then redoes every puzzle, because the skip rule only skips puzzles finished at the current version.

| Version | Change |
| --- | --- |
| 1 | Ticket 1: facts records as JSON files |
| 2 | Ticket 4: `engine` and `outcome` |
| 3 | Stored in Supabase: `from`/`to` renamed `from_square`/`to_square`, `themes`/`teaching_themes` no longer stored (joined in by `get_records`), `generated_at` added |

## Table columns

`Puzzles_Mini_Records`, primary key `(puzzle_id, move_index)`:

| Column | Notes |
| --- | --- |
| `puzzle_id`, `move_index` | `move_index` is 1-based and counts player moves only |
| `fen` | Board before this player move |
| `move_san` | `"Ne5"`, `"O-O"`, `"a8=Q"`, `"Qxf7#"` |
| `player_color` | `white` / `black` |
| `moving_piece` | Lowercase word: `knight`. A king for castling, a pawn for promotion |
| `from_square`, `to_square` | `f3`, `e5` |
| `is_check`, `is_capture`, `is_checkmate` | En passant counts as a capture |
| `captured_piece` | `rook`, or null |
| `solution_line` | SAN from this move (inclusive) to the end, with opponent replies |
| `engine` | jsonb: Stockfish's top 3 lines at depth 20, `solution_is_top`, `gap`, `one_clear_solution`. See [ENGINE.md](ENGINE.md) |
| `outcome` | jsonb: `{checkmate, material_change, promotion}` |
| `opponent_idea` | jsonb, `{}` for now |
| `schema_version`, `generated_at` | |

`engine`, `outcome` and `opponent_idea` are JSON columns so they can grow without a migration.

## Tests

```bash
uv run --with pytest python -m pytest -q test_records.py test_engine.py
```

`test_db.py` runs the real SQL file on a **throwaway** Postgres database (it drops and recreates tables), through the same store, runner and `get_records` code. It covers saving twice (no duplicates), a bad row rolling back the whole swap, resuming, failures, and the five demo puzzles matching `data/records/*.json`:

```bash
TEST_DATABASE_URL=postgresql://user:pw@localhost/scratch \
  uv run --with pytest --with "psycopg[binary]" python -m pytest -q test_db.py
```

Never point `TEST_DATABASE_URL` at Supabase.

`generate_records.py` and `add_engine.py` (Tickets 1 and 4) are gone: `build_all_records.py --json-out` does what they did. `data/records/*.json` are kept as frozen schema-v2 snapshots, used as the reference for the demo-puzzle test (the frontend tests copy from them too).
