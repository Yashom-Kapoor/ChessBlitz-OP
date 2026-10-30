# Facts record pipeline (Ticket 1)

Reads puzzles from Supabase and writes one JSON file of facts records per puzzle, with one record per **player** move. `GET /puzzles/<id>/records` serves them.

```
new-backend/
  facts/
    records.py            # pure logic: puzzle -> records, schema check
    generate_records.py   # CLI: Supabase/CSV -> data/records/<id>.json
    test_records.py
    data/records/*.json   # generated output (committed so others can use it)
  src/backend/
    records_api.py        # Flask blueprint, registered in app.py
```

## Generate

From `new-backend/facts/`:

```
uv run python generate_records.py 00AhO 01F1N 00Kia 04E5q 0cUVg
```

This reads `SUPABASE_URL` and `SUPABASE_KEY` from `new-backend/.env`. `themes` comes from `Puzzles.Themes`. `teaching_themes` comes from the `Themes_*` boolean columns in `Puzzles_Mini`.

Offline, without full themes:

```
uv run python generate_records.py 00AhO --csv ../../data/content/mini-puzzles.csv
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
| `opponent_idea`, `engine` | `{}`, to be defined by Ticket 2 |

## Tests

```
uv run python test_records.py
```
