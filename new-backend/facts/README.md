# Facts record pipeline (Tickets 1 and 4)

Reads puzzles from Supabase and writes one JSON file of facts records per puzzle, with one record per **player** move. `GET /puzzles/<id>/records` serves them.

```
new-backend/
  facts/
    records.py            # pure logic: puzzle -> records, schema check
    engine.py             # Stockfish analysis + outcome (Ticket 4)
    generate_records.py   # CLI: Supabase/CSV -> data/records/<id>.json
    add_engine.py         # CLI: add engine/outcome to existing records files
    ENGINE.md             # Ticket 4 settings, threshold choice, findings
    test_records.py
    test_engine.py
    data/records/*.json   # generated output (committed so others can use it)
  src/backend/
    records_api.py        # Flask blueprint, registered in app.py
```

## Generate

Needs Stockfish for the `engine` field: `brew install stockfish` (or set `STOCKFISH_PATH`).

From `new-backend/facts/`:

```
uv run python generate_records.py 00AhO 01F1N 00Kia 04E5q 0cUVg
```

This reads `SUPABASE_URL` and `SUPABASE_KEY` from `new-backend/.env`. `themes` comes from `Puzzles.Themes`. `teaching_themes` comes from the `Themes_*` boolean columns in `Puzzles_Mini`.

Offline, without full themes:

```
uv run python generate_records.py 00AhO --csv ../../data/content/mini-puzzles.csv
```

Add `--no-engine` to skip Stockfish (leaves `engine`/`outcome` empty). To add engine data to the committed records without Supabase:

```
uv run python add_engine.py            # all of data/records/
uv run python add_engine.py 00Kia      # one puzzle
```

The script exits non-zero if a puzzle is missing, has an illegal move, or has an odd-length move list. It warns, but continues, when a puzzle has no `Puzzles_Mini` row.

## Serve

`records_api.records_bp` is registered in `app.py`. Set `RECORDS_DIR` to override where files are read from. An unknown ID returns a 404.

## Record fields

| Field | Notes |
| --- | --- |
| `puzzle_id`, `move_index` | `move_index` is 1-based and counts player moves only |
| `fen` | Board before this player move |
| `player_color` | `"white"` / `"black"` |
| `themes` | Full Lichess themes (list) |
| `teaching_themes` | Our teachable themes from `Puzzles_Mini` (list) |
| `moving_piece` | Lowercase word: `"knight"`. A king for castling, a pawn for promotion |
| `from`, `to` | Squares: `"f3"`, `"e5"` |
| `move_san` | `"Ne5"`, `"O-O"`, `"a8=Q"`, `"Qxf7#"` |
| `is_check`, `is_checkmate`, `is_capture` | Booleans. En passant counts as a capture |
| `captured_piece` | `"rook"` or `null` |
| `solution_line` | SAN from this move (inclusive) to the end, with opponent replies |
| `opponent_idea` | `{}`, not defined yet |
| `engine` | Stockfish top 3 lines at depth 20 (player's point of view), `solution_is_top`, `gap`, `one_clear_solution`. See [ENGINE.md](ENGINE.md) |
| `outcome` | `{checkmate, material_change, promotion}` for the solution from this move on. See [ENGINE.md](ENGINE.md) |

`schema_version` is 2 (added `outcome`).

## Tests

```
uv run python test_records.py
uv run python test_engine.py   # Stockfish tests skip if no binary is found
```
