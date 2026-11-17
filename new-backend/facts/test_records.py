"""Tests for records.py, pipeline.py (JSON store) and records_api.py's pure helpers.

Run from new-backend/facts/:  uv run python -m pytest -q test_records.py   (or: uv run python test_records.py)
No Supabase, Postgres or Stockfish needed.
"""

import json
import sys
import tempfile
from pathlib import Path

# records_api lives in new-backend/src/backend; make it importable from facts/.
_HERE = Path(__file__).resolve().parent
for _p in (_HERE, _HERE.parent / "src" / "backend"):
    sys.path.insert(0, str(_p))

from pipeline import JsonStore, build_records, puzzles_from_csv, status_for
from records import SCHEMA_VERSION, PuzzleDataError, build_base_records, validate_records

# Each FEN is the position BEFORE the opponent's setup move, as Lichess stores it.
MATE_FEN = "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3"
PROMO_FEN = "8/P7/8/8/8/8/k7/4K3 b - - 0 1"
CASTLE_FEN = "4k3/8/8/8/8/8/8/4K2R b K - 0 1"
EP_FEN = "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1"


def _raises(fn, *words):
    try:
        fn()
    except PuzzleDataError as e:
        for w in words:
            assert w in str(e), (w, str(e))
    else:
        raise AssertionError("expected PuzzleDataError")


# --- records.py -------------------------------------------------------------------------------

def test_mate_in_one():
    [r] = build_base_records("mate1", MATE_FEN, "g8f6 h5f7")
    assert r["schema_version"] == SCHEMA_VERSION == 3
    assert r["move_index"] == 1
    assert r["fen"] == "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
    assert r["player_color"] == "white"
    assert r["moving_piece"] == "queen"
    assert (r["from_square"], r["to_square"]) == ("h5", "f7")
    assert r["move_san"] == "Qxf7#"
    assert r["is_check"] and r["is_checkmate"] and r["is_capture"]
    assert r["captured_piece"] == "pawn"
    assert r["solution_line"] == ["Qxf7#"]
    assert r["opponent_idea"] == {} and r["engine"] == {} and r["outcome"] == {}
    assert "themes" not in r and "from" not in r


def test_promotion():
    [r] = build_base_records("promo", PROMO_FEN, ["a2b2", "a7a8q"])
    assert r["moving_piece"] == "pawn"
    assert r["move_san"].startswith("a8=Q")
    assert not r["is_capture"] and r["captured_piece"] is None


def test_castling_and_multi_move():
    r1, r2 = build_base_records("castle", CASTLE_FEN, "e8d7 e1g1 d7e6 f1f6")
    assert r1["moving_piece"] == "king" and r1["move_san"] == "O-O"
    assert (r1["from_square"], r1["to_square"]) == ("e1", "g1")
    assert r1["solution_line"] == ["O-O", "Ke6", "Rf6+"]
    assert r2["move_index"] == 2
    assert r2["moving_piece"] == "rook" and r2["move_san"] == "Rf6+"
    assert r2["is_check"] and not r2["is_checkmate"]
    assert r2["solution_line"] == ["Rf6+"]
    # Second record's board is after the opponent's reply Ke6.
    assert r2["fen"].startswith("8/8/4k3/8/8/8/8/5RK1 w")


def test_en_passant():
    [r] = build_base_records("ep", EP_FEN, "d7d5 e5d6")
    assert r["move_san"] == "exd6"
    assert r["is_capture"] and r["captured_piece"] == "pawn"


def test_black_to_play():
    [r] = build_base_records("blk", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "e2e4 e7e5")
    assert r["player_color"] == "black" and r["move_san"] == "e5"


def test_bad_data_fails():
    _raises(lambda: build_base_records("odd", CASTLE_FEN, "e8d7 e1g1 d7e6"), "odd length")
    _raises(lambda: build_base_records("bad", CASTLE_FEN, "e8d7 h1a2 d7e6 e1g1"), "move 2", "illegal")
    _raises(lambda: build_base_records("fen", "not a fen", "e2e4 e7e5"), "invalid FEN")
    _raises(lambda: build_base_records("nofen", None, "e2e4 e7e5"), "missing FEN")
    _raises(lambda: build_base_records("short", CASTLE_FEN, "e8d7"), "at least 2")
    _raises(lambda: build_base_records("uci", CASTLE_FEN, "e8d7 zz99"), "not valid UCI")


def test_validate_records():
    recs = build_base_records("castle", CASTLE_FEN, "e8d7 e1g1 d7e6 f1f6")
    validate_records(recs)
    _raises(lambda: validate_records([recs[1]]), "move_index")
    _raises(lambda: validate_records([{**recs[0], "from": "e1"}]), "unexpected")
    _raises(lambda: validate_records([]), "no records")


# --- pipeline.py ------------------------------------------------------------------------------

def test_build_records_without_engine():
    records, flags = build_records({"puzzle_id": "m", "fen": MATE_FEN, "moves": "g8f6 h5f7"})
    assert flags == []
    [r] = records
    assert r["outcome"] == {"checkmate": True, "material_change": 1, "promotion": False}
    assert r["engine"] == {} and r["generated_at"]


def test_status_for():
    assert status_for([]) == ("ok", None)
    assert status_for(["a", "b"]) == ("flagged", "a; b")


def test_json_store_replaces_and_tracks_status():
    with tempfile.TemporaryDirectory() as tmp:
        store = JsonStore(Path(tmp))
        two, _ = build_records({"puzzle_id": "c", "fen": CASTLE_FEN, "moves": "e8d7 e1g1 d7e6 f1f6"})
        store.save_records("c", two, "ok", None)
        store.save_records("c", two, "ok", None)              # saving twice: still one file, two records
        store.save_records("x", [], "failed", "x: invalid FEN")
        assert len(json.loads((Path(tmp) / "c.json").read_text())["records"]) == 2
        assert store.finished() == {"c": "ok", "x": "failed"}
        assert store.finished(SCHEMA_VERSION - 1) == {}
        assert not list(Path(tmp).glob("*.tmp"))
        try:
            store.save_records("c", [], "ok", None)
        except ValueError:
            pass
        else:
            raise AssertionError("ok with no records should be refused")


def test_puzzles_from_csv():
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "mini.csv"
        p.write_text("PuzzleId,FEN,Moves,Rating,Themes_fork\n"
                     f"a,{CASTLE_FEN},e8d7 e1g1,1000,True\n"
                     f"a,{CASTLE_FEN},e8d7 e1g1,1000,True\n"
                     f"b,{MATE_FEN},g8f6 h5f7,900,False\n")
        assert [x["puzzle_id"] for x in puzzles_from_csv(p)] == ["a", "b"]
        assert [x["puzzle_id"] for x in puzzles_from_csv(p, ["b", "zz"])] == ["b"]


def test_select_todo_skip_rules():
    from build_all_records import select_todo
    puzzles = [{"puzzle_id": i} for i in "abcde"]
    finished = {"a": "ok", "b": "flagged", "c": "failed"}
    ids = lambda todo: [p["puzzle_id"] for p in todo]
    todo, skipped = select_todo(puzzles, finished, retry_failed=False, force=False, limit=None)
    assert ids(todo) == ["d", "e"] and skipped == 3
    todo, _ = select_todo(puzzles, finished, retry_failed=True, force=False, limit=None)
    assert ids(todo) == ["c", "d", "e"]
    todo, _ = select_todo(puzzles, finished, retry_failed=False, force=True, limit=2)
    assert ids(todo) == ["a", "b"]


def test_message_categories():
    from build_all_records import failure_category, flag_category
    assert flag_category("move 2 Qe5+: no single clear solution (+1.00 vs +0.90)") == "no single clear solution"
    assert flag_category("move 1 e4: solution is not the engine's top move (engine prefers Nf3; +1 vs +0.9)") \
        == "solution is not the engine's top move"
    assert failure_category("abc: move 3 'h1a2' is illegal in position 8/8/...") == "is illegal"
    assert failure_category("abc: invalid FEN 'x': bad") == "invalid FEN"


# --- records_api.py (pure parts) --------------------------------------------------------------

def test_to_api_record_matches_old_shape():
    import records_api
    [row] = build_base_records("mate1", MATE_FEN, "g8f6 h5f7")
    rec = records_api.to_api_record(row, ["mate", "short"], ["mate"])
    assert list(rec) == list(records_api.API_FIELDS)
    assert (rec["from"], rec["to"]) == ("h5", "f7")
    assert rec["themes"] == ["mate", "short"] and rec["teaching_themes"] == ["mate"]
    assert "from_square" not in rec and "schema_version" not in rec


def test_theme_helpers():
    import records_api
    assert records_api.normalize_themes("fork middlegame") == ["fork", "middlegame"]
    assert records_api.normalize_themes("fork,pin") == ["fork", "pin"]
    assert records_api.normalize_themes(None) == []
    rows = [{"PuzzleId": "x", "Themes_fork": "True", "Themes_pin": "False"},
            {"PuzzleId": "x", "Themes_fork": False, "Themes_pin": True}]
    assert records_api.teaching_themes_from_rows(rows) == ["fork", "pin"]


def test_debug_endpoint_is_off_by_default():
    import os

    import records_api
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(records_api.records_bp)
    old = os.environ.pop("DEV_TOOLS", None)
    try:
        assert app.test_client().get("/puzzles/00Kia/records").status_code == 404
    finally:
        if old is not None:
            os.environ["DEV_TOOLS"] = old


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"✓ {t.__name__}")
    print(f"\n{len(tests)} passed")
