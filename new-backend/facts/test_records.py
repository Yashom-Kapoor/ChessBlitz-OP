"""Tests for records.py and records_api.py. Run: python -m pytest -q  (or python test_records.py)"""

import json
import sys
import tempfile
from pathlib import Path

# records_api lives in new-backend/src/backend; make it importable from facts/.
_HERE = Path(__file__).resolve().parent
for _p in (_HERE, _HERE.parent / "src" / "backend"):
    sys.path.insert(0, str(_p))

from records import PuzzleDataError, build_records, normalize_themes

# Each FEN is the position BEFORE the opponent's setup move, as Lichess stores it.
MATE_FEN = "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3"
PROMO_FEN = "8/P7/8/8/8/8/k7/4K3 b - - 0 1"
CASTLE_FEN = "4k3/8/8/8/8/8/8/4K2R b K - 0 1"
EP_FEN = "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1"


def test_mate_in_one():
    doc = build_records("mate1", MATE_FEN, "g8f6 h5f7", "mate mateIn1 short", ["mate"])
    assert doc["schema_version"] == 1
    [r] = doc["records"]
    assert r["move_index"] == 1
    assert r["fen"] == "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
    assert r["player_color"] == "white"
    assert r["moving_piece"] == "queen"
    assert (r["from"], r["to"]) == ("h5", "f7")
    assert r["move_san"] == "Qxf7#"
    assert r["is_check"] and r["is_checkmate"] and r["is_capture"]
    assert r["captured_piece"] == "pawn"
    assert r["solution_line"] == ["Qxf7#"]
    assert r["themes"] == ["mate", "mateIn1", "short"]
    assert r["teaching_themes"] == ["mate"]
    assert r["opponent_idea"] == {} and r["engine"] == {}


def test_promotion():
    [r] = build_records("promo", PROMO_FEN, ["a2b2", "a7a8q"])["records"]
    assert r["moving_piece"] == "pawn"
    assert r["move_san"].startswith("a8=Q")
    assert not r["is_capture"] and r["captured_piece"] is None


def test_castling_and_multi_move():
    doc = build_records("castle", CASTLE_FEN, "e8d7 e1g1 d7e6 f1f6")
    r1, r2 = doc["records"]
    assert r1["moving_piece"] == "king" and r1["move_san"] == "O-O"
    assert (r1["from"], r1["to"]) == ("e1", "g1")
    assert r1["solution_line"] == ["O-O", "Ke6", "Rf6+"]
    assert r2["move_index"] == 2
    assert r2["moving_piece"] == "rook" and r2["move_san"] == "Rf6+"
    assert r2["is_check"] and not r2["is_checkmate"]
    assert r2["solution_line"] == ["Rf6+"]
    # Second record's board is after the opponent's reply Ke6.
    assert r2["fen"].startswith("8/8/4k3/8/8/8/8/5RK1 w")


def test_en_passant():
    [r] = build_records("ep", EP_FEN, "d7d5 e5d6")["records"]
    assert r["move_san"] == "exd6"
    assert r["is_capture"] and r["captured_piece"] == "pawn"


def test_black_to_play():
    # White sets up 1.e4, black's "solution" e5.
    [r] = build_records("blk", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "e2e4 e7e5")["records"]
    assert r["player_color"] == "black" and r["move_san"] == "e5"


def test_odd_move_count_fails():
    try:
        build_records("odd", CASTLE_FEN, "e8d7 e1g1 d7e6")
    except PuzzleDataError as e:
        assert "odd length" in str(e)
    else:
        raise AssertionError("expected PuzzleDataError")


def test_illegal_move_fails():
    try:
        build_records("bad", CASTLE_FEN, "e8d7 h1a2 d7e6 e1g1")
    except PuzzleDataError as e:
        assert "move 2" in str(e) and "illegal" in str(e)
    else:
        raise AssertionError("expected PuzzleDataError")


def test_normalize_themes():
    assert normalize_themes("fork middlegame") == ["fork", "middlegame"]
    assert normalize_themes("fork,pin") == ["fork", "pin"]
    assert normalize_themes(["fork"]) == ["fork"]
    assert normalize_themes(None) == []


def test_teaching_themes_from_rows():
    from generate_records import teaching_themes_from_rows
    rows = [
        {"PuzzleId": "x", "Themes_fork": "True", "Themes_pin": "False"},
        {"PuzzleId": "x", "Themes_fork": False, "Themes_pin": True},
    ]
    assert teaching_themes_from_rows(rows) == ["fork", "pin"]
    assert teaching_themes_from_rows([]) == []


def test_cli_and_api():
    import generate_records
    import records_api
    from flask import Flask

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        fixture = tmp / "fixture.json"
        fixture.write_text(json.dumps({
            "mate1": {"fen": MATE_FEN, "moves": "g8f6 h5f7", "themes": "mate", "teaching_themes": ["mate"]},
            "castle": {"fen": CASTLE_FEN, "moves": "e8d7 e1g1 d7e6 f1f6", "themes": "endgame"},
        }))
        out = tmp / "records"
        assert generate_records.main(["mate1", "castle", "--fixture", str(fixture), "--out", str(out)]) == 0
        assert generate_records.main(["missing", "--fixture", str(fixture), "--out", str(out)]) == 1

        records_api.RECORDS_DIR = out
        app = Flask(__name__)
        app.register_blueprint(records_api.records_bp)
        c = app.test_client()
        resp = c.get("/puzzles/castle/records")
        assert resp.status_code == 200 and len(resp.get_json()["records"]) == 2
        assert c.get("/puzzles/nope/records").status_code == 404
        assert c.get("/puzzles/..%2Fx/records").status_code == 404


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"✓ {t.__name__}")
    print(f"\n{len(tests)} passed")
