"""Tests for engine.py and add_engine.py. Run: python test_engine.py  (or python -m pytest -q)

The pure tests always run. Tests marked "needs Stockfish" are skipped when no binary
is found ($STOCKFISH_PATH or `stockfish` on PATH).
"""

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _p in (_HERE, _HERE.parent / "src" / "backend"):
    sys.path.insert(0, str(_p))

import engine
from records import build_records, validate_document

MATE_FEN = "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3"
PROMO_FEN = "8/P7/8/8/8/8/k7/4K3 b - - 0 1"


def _line(move, score=None, mate=None):
    return {"move": move, "score": score, "mate_in": mate, "line": [move]}


# --- outcome --------------------------------------------------------------

def test_outcome_mate_in_one():
    [r] = build_records("m", MATE_FEN, "g8f6 h5f7")["records"]
    assert engine.compute_outcome(r["fen"], r["solution_line"]) == {
        "checkmate": True, "material_change": 1, "promotion": False}


def test_outcome_promotion_counts_queen_minus_pawn():
    [r] = build_records("p", PROMO_FEN, ["a2b2", "a7a8q"])["records"]
    assert engine.compute_outcome(r["fen"], r["solution_line"]) == {
        "checkmate": False, "material_change": 8, "promotion": True}


def test_outcome_counts_sacrifices():
    # Queen for queen: Qxd8+ Kxd8 -> 0
    fen = "3qk3/8/8/8/8/8/8/3QK3 w - - 0 1"
    assert engine.compute_outcome(fen, ["Qxd8+", "Kxd8"])["material_change"] == 0
    # Losing the queen for a pawn: Qxd7+ Kxd7 -> +1 - 9 = -8
    fen = "4k3/3p4/8/8/8/8/8/3QK3 w - - 0 1"
    assert engine.compute_outcome(fen, ["Qxd7+", "Kxd7"])["material_change"] == -8


def test_outcome_black_player():
    # Scores are from the player's side even when the player is Black: winning a rook is +5.
    fen = "4k3/8/8/8/8/8/3q4/R3K3 b - - 0 1"
    assert engine.compute_outcome(fen, ["Qd1+", "Kf2", "Qxa1"])["material_change"] == 5


# --- summary --------------------------------------------------------------

def test_win_chance():
    assert engine.win_chance(0.0, None) == 50.0
    assert engine.win_chance(None, 3) == 100.0
    assert engine.win_chance(None, -2) == 0.0
    assert 60 < engine.win_chance(2.0, None) < 70


def test_summary_clear_score_gap():
    e = engine.summarize_lines([_line("Bb7", 1.97), _line("Be7", -4.56), _line("Bd7", -4.66)], "Bb7", 20)
    assert e["solution_is_top"] and e["one_clear_solution"]
    assert e["gap"] == "+1.97 vs -4.56" and e["gap_pawns"] == 6.53
    assert e["depth"] == 20 and all("win_chance" in ln for ln in e["lines"])


def test_summary_big_gap_but_both_winning_is_not_clear():
    # +16 vs +10 is a 6-pawn gap, but both moves win easily.
    e = engine.summarize_lines([_line("Qxa8", 16.0), _line("Rxa8", 10.0)], "Qxa8", 20)
    assert not e["one_clear_solution"]


def test_summary_mate_vs_score():
    e = engine.summarize_lines([_line("Qxg7+", mate=2), _line("Rxf8+", 0.11)], "Qxg7+", 20)
    assert e["one_clear_solution"] and e["gap"] == "mate in 2 vs +0.11" and e["gap_pawns"] is None


def test_summary_mate_vs_mate_uses_distance():
    close = engine.summarize_lines([_line("Qh7#", mate=1), _line("Qg8+", mate=2)], "Qh7#", 20)
    far = engine.summarize_lines([_line("Qh7#", mate=1), _line("Rd8+", mate=4)], "Qh7#", 20)
    assert not close["one_clear_solution"] and far["one_clear_solution"]
    assert close["gap"] == "mate in 1 vs mate in 2"


def test_summary_flags_solution_not_top():
    e = engine.summarize_lines([_line("Nf3", 1.0), _line("e4", 0.9)], "e4", 20)
    assert not e["solution_is_top"] and not e["one_clear_solution"]


def test_summary_single_legal_move():
    e = engine.summarize_lines([_line("Kh1", 0.0)], "Kh1", 20)
    assert e["one_clear_solution"] and e["gap"] == "only legal move"


def test_summary_mated_second_line():
    e = engine.summarize_lines([_line("Qe5+", 2.81), _line("Qf3", mate=-15)], "Qe5+", 20)
    assert e["one_clear_solution"] and e["gap"] == "+2.81 vs mated in 15"


# --- with Stockfish -------------------------------------------------------

def _has_stockfish():
    try:
        engine.find_stockfish()
        return True
    except FileNotFoundError:
        return False


def test_engine_on_mate_in_one():
    if not _has_stockfish():
        print("  (skipped: needs Stockfish)")
        return
    doc = build_records("m", MATE_FEN, "g8f6 h5f7")
    with engine.Analyzer(depth=12) as a:
        assert engine.enrich_document(doc, a) == []
    validate_document(doc)
    e = doc["records"][0]["engine"]
    assert e["lines"][0] == {**e["lines"][0], "move": "Qxf7#", "score": None, "mate_in": 1}
    assert e["solution_is_top"] and e["depth"] == 12 and len(e["lines"]) == 3


def test_committed_records_are_filled():
    """Every committed record has engine + outcome (Ticket 4 'done when'), and the API serves them."""
    import records_api
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(records_api.records_bp)
    c = app.test_client()
    for path in sorted((_HERE / "data" / "records").glob("*.json")):
        doc = c.get(f"/puzzles/{path.stem}/records").get_json()
        validate_document(doc)
        for r in doc["records"]:
            assert r["engine"]["lines"] and r["engine"]["depth"] == engine.DEPTH, path.stem
            assert set(r["outcome"]) == {"checkmate", "material_change", "promotion"}, path.stem


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"✓ {t.__name__}")
    print(f"\n{len(tests)} passed")
