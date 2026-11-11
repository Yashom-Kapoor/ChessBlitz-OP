# Engine data and outcomes (Ticket 4)

Every record now has two more fields:

- **`engine`**: Stockfish's analysis of the position before the player's move.
- **`outcome`**: what the solution achieves from this move to the end of the puzzle.

The code is in `engine.py`. `generate_records.py` fills both fields when it builds records. `add_engine.py` adds them to records that already exist, without needing Supabase.

## Settings

| Setting | Value | Why |
| --- | --- | --- |
| Engine | Stockfish 17.1 | Stored per record as `engine_name` |
| Depth | 20, fixed | Scores drift with depth. 00Kia's Qe5+ scores +1.86 at depth 10, +2.81 at 20, and +3.75 at 25. |
| MultiPV | 3 | Top three lines |
| Threads, hash | 1 thread, 64 MB, hash cleared per position | Makes results reproducible. Two runs produce byte-identical files. |
| Line length | 5 moves (SAN) | |

All five puzzles take about 12 seconds in total.

## Shape

```json
"engine": {
  "depth": 20,
  "lines": [
    { "move": "Qxg7+", "score": null,  "mate_in": 2,    "line": ["Qxg7+", "Qxg7", "Rxf8#"], "win_chance": 100.0 },
    { "move": "Rxf8+", "score": 0.11,  "mate_in": null, "line": ["Rxf8+", "Qxf8", "Qg4", "h6", "Qf4"], "win_chance": 51.0 },
    { "move": "c4",    "score": -0.01, "mate_in": null, "line": ["c4", "Rxf1+", "Kxf1", "h6", "c5"], "win_chance": 49.9 }
  ],
  "solution_is_top": true,
  "gap": "mate in 2 vs +0.11",
  "gap_pawns": null,
  "one_clear_solution": true,
  "engine_name": "Stockfish 17.1"
},
"outcome": { "checkmate": true, "material_change": -3, "promotion": false }
```

These fields differ from the ticket's draft:

- **`mate_in` is negative when the opponent is the one mating.** For example, −15 means the opponent mates in 15. `score` is `null` whenever `mate_in` is set.
- **`win_chance`** is new. It's the player's chance of winning (0–100), from [Lichess's formula](https://lichess.org/page/accuracy), and mates count as 100 or 0. It's what the threshold below uses.
- **`gap`** is a readable string, as in the ticket. **`gap_pawns`** holds the numeric gap, but only when both lines are normal scores; otherwise it's `null`.
- **`material_change`** is the change in material balance (the player's material minus the opponent's). It counts what the player gives up along the way, not only what they capture. Promoting to a queen counts +8: the queen's 9 minus the pawn's 1.

The schema version is now **2**, because `outcome` is a new required field.

## The `one_clear_solution` threshold

**Rule:** a move is the one clear solution if the best line's `win_chance` is at least **20 percentage points** higher than the second line's.

**When both lines are mates:** compare mate distances. The move is clear only if the second line takes at least **3 more moves** to mate.

**Why win chance instead of a pawn gap:** a pawn gap gives the wrong answer at the extremes.

- +16 vs +10 is a 6-pawn gap, but both moves win easily, so it isn't really one answer.
- +0.5 vs −1.0 is only 1.5 pawns, but it's the difference between keeping the game level and being worse.

Win chance flattens out once a side is clearly winning, so it measures what a kid would care about: does the other move still win?

**Why 20:** in these five puzzles, the smallest margin is 30 points (0cUVg move 3: a8=Q at 87% vs Nxb5 at 57%). Every other margin is between 35 and 84. So any threshold from about 5 to 29 gives the same answers here, and 20 leaves room on both sides. It may need tuning once we add puzzles where two moves both work.

**Why 3 moves for mates:** a mate in 2 with a mate in 3 also available means both moves work. That's Ticket 5's `also_works` case, not one clear answer. A second mate that takes 3 or more extra moves is a different, harder plan.

## Results

| Puzzle | Move | Solution | Engine top | Gap | Clear | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00AhO | 1 | Bb7 | Bb7 | +1.97 vs −4.56 | ✓ | +4 |
| 00AhO | 2 | Ra8 | Ra8 | +2.08 vs −4.17 | ✓ | +4 |
| 00AhO | 3 | Bxa8 | Bxa8 | +1.76 vs −6.39 | ✓ | +9 |
| 00Kia | 1 | Qe5+ | Qe5+ | +2.81 vs −5.58 | ✓ | +6 |
| 00Kia | 2 | Bd5+ | Bd5+ | +2.37 vs −5.69 | ✓ | +6 |
| 00Kia | 3 | Qxe1 | Qxe1 | +2.19 vs −6.94 | ✓ | +9 |
| 01F1N | 1 | Qc4+ | Qc4+ | +5.02 vs −3.03 | ✓ | +3 |
| 01F1N | 2 | Qxd3 | Qxd3 | +5.06 vs −3.58 | ✓ | +3 |
| 04E5q | 1 | Qxg7+ | Qxg7+ | mate in 2 vs +0.11 | ✓ | mate, −3 |
| 04E5q | 2 | Rxf8# | Rxf8# | mate in 1 vs −4.53 | ✓ | mate, +5 |
| 0cUVg | 1 | a7 | a7 | +5.41 vs +0.31 | ✓ | promotes, +7 |
| 0cUVg | 2 | Nd6+ | Nd6+ | +5.35 vs −0.02 | ✓ | promotes, +7 |
| 0cUVg | 3 | a8=Q | a8=Q | +5.26 vs +0.81 | ✓ | promotes, +8 |

## Flags

**No surprises.** In all 13 records, the solution is the engine's top move and there's one clear solution.

These are worth knowing for the hints, though:

- **04E5q move 1 has `material_change` −3.** Qxg7+ is a queen sacrifice that leads to mate, so the material count goes down even though the puzzle is won. Anything built on `outcome` should check `checkmate` before `material_change`.
- **The engine's expected reply isn't always the puzzle's.** For 0cUVg move 1, Stockfish expects …Kc5, while the Lichess solution continues …Kb7. Both are fine, since the solution only needs one defensive line. But hints should use `solution_line` for "what happens next," not `engine.lines[0].line`.
- **Scores for 00AhO and 00Kia are about +2,** not the +5 or more you might expect. In both, the win is a queen for a rook or bishop, and Stockfish sees counterplay afterward. The win-chance margins are still above 50 points, so they're clear.

## Rechecks against Ticket 2

**00Kia (+16.5 vs +4.6) doesn't reproduce.** I ran it at depths 10, 15, 20 and 25, both before and after the setup move …g6. The first line always scored highest: Qe5+ at +1.86 to +3.75, and the second line at −5.3 or lower. The manual result probably came from reading a different position, or from mixing up White's and Black's point of view in the analysis board.

**04E5q shows a forced mate,** as Ticket 2 found: mate in 2, Qxg7+ Qxg7 Rxf8#.

## Still to do by hand

The ticket asks for one record per puzzle to be checked on Lichess, and my workspace can't reach Lichess. Paste each FEN into the [analysis board](https://lichess.org/analysis) and compare it with the table above:

| Puzzle | FEN (move 1) | Expect |
| --- | --- | --- |
| 00AhO | `Q1b2rk1/2q2p1p/1p2pbp1/pP6/2P5/P2B1N2/5PPP/3R1RK1 b - - 0 20` | Bb7 ≈ −2.0 (Black is the player; Lichess shows White's view) |
| 00Kia | `5r1k/4n2p/1p4p1/pP5Q/P2pB2K/6P1/2P4P/4q3 w - - 0 38` | Qe5+ ≈ +2.8 |
| 01F1N | `r4rk1/pp1q2pp/3p1p2/2p2P2/5Q2/2Pn3P/PP1N1PP1/4RRK1 w - - 4 18` | Qc4+ ≈ +5 |
| 04E5q | `5r1k/p3q1pp/1p6/3pB3/3Pb3/2P3Q1/P5PP/5RK1 w - - 0 28` | Qxg7+, mate in 2 |
| 0cUVg | `8/8/PPk3p1/1r6/2N1K3/8/8/8 w - - 1 74` | a7 ≈ +5.4 |

Lichess shows scores from White's point of view, while the records use the player's. Expect small differences, because Lichess's browser engine runs at a different depth and version.
