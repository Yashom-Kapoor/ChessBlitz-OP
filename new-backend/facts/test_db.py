"""Database tests: the real sql/puzzles_mini_records.sql on a scratch Postgres, driven through the
same Python code that talks to Supabase (SupabaseStore, get_records, the batch runner).

Supabase's client speaks HTTP to PostgREST, which we don't run locally, so `FakeSupabase` below
turns the handful of query-builder calls our code uses into SQL. Everything past that layer
(the tables, constraints and replace_puzzle_records function) is the real thing.

Needs a THROWAWAY database (the tests drop and recreate tables in it) and psycopg:

    TEST_DATABASE_URL=postgresql://user:pw@localhost/scratch uv run --with "psycopg[binary]" \
        python -m pytest -q test_db.py

Skipped when TEST_DATABASE_URL isn't set. Never point it at Supabase.
The demo-puzzle comparison also needs Stockfish (skipped without it).
"""

import csv
import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

_HERE = Path(__file__).resolve().parent
for _p in (_HERE, _HERE.parent / "src" / "backend"):
    sys.path.insert(0, str(_p))

DB_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="set TEST_DATABASE_URL to a scratch Postgres")

SQL_FILE = _HERE.parent / "sql" / "puzzles_mini_records.sql"
REF_DIR = _HERE / "data" / "records"          # frozen schema-v2 JSON records
DEMO = ["00AhO", "00Kia", "01F1N", "04E5q", "0cUVg"]
CASTLE_FEN = "4k3/8/8/8/8/8/8/4K2R b K - 0 1"
MATE_FEN = "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3"


# --- a tiny PostgREST stand-in ------------------------------------------------------------------

class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, conn, table):
        self.conn, self.table = conn, table
        self.cols, self.where, self.params = "*", [], []
        self.order_by, self.lim, self.off = None, None, None

    def select(self, cols="*", count=None):
        self.cols = cols
        return self

    def eq(self, col, val):
        self.where.append(f'"{col}" = %s')
        self.params.append(val)
        return self

    def in_(self, col, vals):
        self.where.append(f'"{col}" = any(%s)')
        self.params.append(list(vals))
        return self

    def order(self, col, desc=False):
        self.order_by = f'"{col}"' + (" desc" if desc else "")
        return self

    def limit(self, n):
        self.lim = n
        return self

    def range(self, start, end):
        self.off, self.lim = start, end - start + 1
        return self

    def execute(self):
        from psycopg.rows import dict_row

        cols = "*" if self.cols == "*" else ", ".join(f'"{c.strip()}"' for c in self.cols.split(","))
        sql = f'select {cols} from public."{self.table}"'
        if self.where:
            sql += " where " + " and ".join(self.where)
        if self.order_by:
            sql += f" order by {self.order_by}"
        if self.lim is not None:
            sql += f" limit {self.lim}"
        if self.off is not None:
            sql += f" offset {self.off}"
        with self.conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, self.params)
            rows = cur.fetchall()
        for r in rows:   # PostgREST sends timestamps as strings
            for k, v in r.items():
                if hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
        return _Result(rows)


class _Rpc:
    def __init__(self, conn, name, params):
        self.conn, self.name, self.params = conn, name, params

    def execute(self):
        from psycopg.types.json import Jsonb

        # PostgREST sends the body as JSON, so do the same round trip here.
        params = json.loads(json.dumps(self.params))
        args = ", ".join(f"{k} => %s" for k in params)
        values = [Jsonb(v) if isinstance(v, (list, dict)) else v for v in params.values()]
        with self.conn.cursor() as cur:
            cur.execute(f"select public.{self.name}({args})", values)
        return _Result(None)


class FakeSupabase:
    def __init__(self, conn):
        self.conn = conn

    def table(self, name):
        return _Query(self.conn, name)

    def rpc(self, name, params):
        return _Rpc(self.conn, name, params)


# --- fixtures ---------------------------------------------------------------------------------

def _csv_rows():
    path = _HERE.parent.parent / "data" / "content" / "mini-puzzles.csv"
    if not path.is_file():
        return {}
    with open(path, newline="") as f:
        return {r["PuzzleId"]: r for r in csv.DictReader(f)}


@pytest.fixture()
def db():
    psycopg = pytest.importorskip("psycopg")
    conn = psycopg.connect(DB_URL, autocommit=True)
    with conn.cursor() as cur:
        for role in ("anon", "authenticated", "service_role"):   # Supabase's built-in roles
            cur.execute(f"do $$ begin create role {role} nologin; exception when duplicate_object then null; end $$")
        cur.execute('drop table if exists public."Puzzles_Mini_Records", public."Puzzles_Mini_Records_Status", '
                    'public."Puzzles_Mini", public."Puzzles" cascade')
        cur.execute('create table public."Puzzles" ("PuzzleId" text primary key, "Themes" text)')
        cur.execute('create table public."Puzzles_Mini" ("PuzzleId" text primary key, "FEN" text, "Moves" text, '
                    '"Themes_fork" boolean default false, "Themes_pin" boolean default false, '
                    '"Themes_promotion" boolean default false, "Themes_trappedPiece" boolean default false)')
        cur.execute(SQL_FILE.read_text())
    yield conn
    conn.close()


def _add_mini(conn, pid, fen, moves, **themes):
    cols = ", ".join(f'"Themes_{k}"' for k in themes)
    vals = ", ".join("%s" for _ in themes)
    with conn.cursor() as cur:
        cur.execute(f'insert into "Puzzles_Mini" ("PuzzleId", "FEN", "Moves"{", " + cols if themes else ""}) '
                    f'values (%s, %s, %s{", " + vals if themes else ""})', [pid, fen, moves, *themes.values()])


def _count(conn, table, pid=None):
    with conn.cursor() as cur:
        if pid:
            cur.execute(f'select count(*) from "{table}" where puzzle_id = %s', [pid])
        else:
            cur.execute(f'select count(*) from "{table}"')
        return cur.fetchone()[0]


# --- tests ------------------------------------------------------------------------------------

def test_save_twice_no_duplicates(db):
    from pipeline import SupabaseStore, build_records

    _add_mini(db, "c", CASTLE_FEN, "e8d7 e1g1 d7e6 f1f6")
    store = SupabaseStore(FakeSupabase(db))
    records, _ = build_records({"puzzle_id": "c", "fen": CASTLE_FEN, "moves": "e8d7 e1g1 d7e6 f1f6"})
    store.save_records("c", records, "ok", None)
    store.save_records("c", records, "ok", None)
    assert _count(db, "Puzzles_Mini_Records", "c") == 2
    assert _count(db, "Puzzles_Mini_Records_Status") == 1

    # Fewer records the second time: the old row 2 must be gone, not left behind.
    store.save_records("c", records[:1], "flagged", "move 1 O-O: no single clear solution (x)")
    assert _count(db, "Puzzles_Mini_Records", "c") == 1
    assert store.finished() == {"c": "flagged"}

    # failed clears the records and keeps the error.
    store.save_records("c", [], "failed", "c: invalid FEN")
    assert _count(db, "Puzzles_Mini_Records", "c") == 0
    with db.cursor() as cur:
        cur.execute('select status, message, schema_version from "Puzzles_Mini_Records_Status"')
        assert cur.fetchone() == ("failed", "c: invalid FEN", 3)


def test_bad_row_rolls_back_everything(db):
    from pipeline import SupabaseStore, build_records

    _add_mini(db, "c", CASTLE_FEN, "e8d7 e1g1 d7e6 f1f6")
    store = SupabaseStore(FakeSupabase(db))
    records, _ = build_records({"puzzle_id": "c", "fen": CASTLE_FEN, "moves": "e8d7 e1g1 d7e6 f1f6"})
    store.save_records("c", records, "ok", None)
    broken = [dict(records[0], fen=None)]
    with pytest.raises(Exception):
        store.save_records("c", broken, "ok", None)
    assert _count(db, "Puzzles_Mini_Records", "c") == 2   # old rows survived


def test_finished_pages_and_filters_by_version(db):
    from pipeline import SupabaseStore

    store = SupabaseStore(FakeSupabase(db))
    store.PAGE = 2   # force several pages
    with db.cursor() as cur:
        for i in range(5):
            _add_mini(db, f"p{i}", CASTLE_FEN, "e8d7 e1g1")
            cur.execute("select replace_puzzle_records(%s, null, 'failed', 'x', %s)", [f"p{i}", 3 if i < 4 else 2])
    assert store.finished(3) == {f"p{i}": "failed" for i in range(4)}


def test_get_records_shape(db):
    import records_api
    from pipeline import SupabaseStore, build_records

    _add_mini(db, "m", MATE_FEN, "g8f6 h5f7", fork=True, pin=False)
    with db.cursor() as cur:
        cur.execute('insert into "Puzzles" values (%s, %s)', ["m", "mate mateIn1 short"])
    records, _ = build_records({"puzzle_id": "m", "fen": MATE_FEN, "moves": "g8f6 h5f7"})
    SupabaseStore(FakeSupabase(db)).save_records("m", records, "ok", None)

    [rec] = records_api.get_records("m", FakeSupabase(db))
    assert list(rec) == list(records_api.API_FIELDS)
    assert (rec["from"], rec["to"], rec["move_san"]) == ("h5", "f7", "Qxf7#")
    assert rec["themes"] == ["mate", "mateIn1", "short"] and rec["teaching_themes"] == ["fork"]
    assert rec["solution_line"] == ["Qxf7#"]
    assert records_api.get_records("nope", FakeSupabase(db)) == []


def test_runner_resume_and_failures(db, monkeypatch, capsys):
    """End to end through the batch runner: a broken puzzle is marked failed and the run goes on;
    a second run skips everything; --retry-failed reruns only the failure."""
    import build_all_records as bar
    import engine
    from pipeline import SupabaseStore

    if not _has_stockfish():
        pytest.skip("needs Stockfish")
    _add_mini(db, "good1", MATE_FEN, "g8f6 h5f7")
    _add_mini(db, "good2", CASTLE_FEN, "e8d7 e1g1 d7e6 f1f6")
    _add_mini(db, "broken", "not a fen", "e2e4 e7e5")
    fake = FakeSupabase(db)
    monkeypatch.setattr(bar, "supabase_client", lambda read_only=False: fake)

    assert bar.main(["--workers", "2", "--depth", str(engine.DEPTH), "--limit", "1"]) == 0
    assert len(SupabaseStore(fake).finished()) == 1           # stopped after one puzzle

    assert bar.main(["--workers", "2"]) == 0                  # resume: does the other two
    finished = SupabaseStore(fake).finished()
    assert finished["broken"] == "failed" and finished["good1"] in ("ok", "flagged")
    assert _count(db, "Puzzles_Mini_Records") == 3            # 1 + 2 records, no duplicates
    out = capsys.readouterr().out
    assert "1 already done" in out and "2 to run" in out

    assert bar.main(["--workers", "2"]) == 0
    assert "3 already done" in capsys.readouterr().out and _count(db, "Puzzles_Mini_Records") == 3

    assert bar.main(["--workers", "1", "--retry-failed"]) == 0
    assert "1 to run" in capsys.readouterr().out


def test_runner_json_out(tmp_path, capsys):
    import build_all_records as bar

    if not _has_stockfish():
        pytest.skip("needs Stockfish")
    csv_path = tmp_path / "mini.csv"
    csv_path.write_text("PuzzleId,FEN,Moves\n"
                        f"m,{MATE_FEN},g8f6 h5f7\n"
                        "bad,8/8/8/8/8/8/8/8 w - - 0 1,e2e4 e7e5\n")
    out = tmp_path / "out"
    assert bar.main(["--csv", str(csv_path), "--json-out", str(out), "--workers", "1", "--depth", "10"]) == 0
    assert json.loads((out / "m.json").read_text())["status"] == "ok"
    assert json.loads((out / "bad.json").read_text())["status"] == "failed"


def _has_stockfish():
    import engine
    try:
        engine.find_stockfish()
        return True
    except FileNotFoundError:
        return False


def test_demo_puzzles_match_v2_json(db):
    """Ticket test: get_records for the five demo puzzles == the committed JSON records.

    Ignored: generated_at, schema_version. Everything else exact, except `engine`, which must match
    exactly only when the Stockfish version matches the JSON's (Stockfish 17.1); otherwise compare
    the top move, solution_is_top, one_clear_solution and whether the top line is a mate.
    """
    import build_all_records as bar
    import engine
    import records_api

    if not _has_stockfish():
        pytest.skip("needs Stockfish")
    rows = _csv_rows()
    if not all(p in rows for p in DEMO):
        pytest.skip("needs data/content/mini-puzzles.csv")

    refs = {p: json.loads((REF_DIR / f"{p}.json").read_text()) for p in DEMO}
    with db.cursor() as cur:
        for p in DEMO:
            r = rows[p]
            teaching = sorted({t for rec in refs[p]["records"] for t in rec["teaching_themes"]})
            _add_mini(db, p, r["FEN"], r["Moves"], **{t: True for t in teaching})
            cur.execute('insert into "Puzzles" values (%s, %s)', [p, " ".join(refs[p]["records"][0]["themes"])])

    fake = FakeSupabase(db)
    old = bar.supabase_client
    bar.supabase_client = lambda read_only=False: fake
    try:
        assert bar.main(["--puzzle-ids", *DEMO, "--workers", "2"]) == 0
    finally:
        bar.supabase_client = old

    with engine.Analyzer() as a:
        same_engine = a.name == refs[DEMO[0]]["records"][0]["engine"]["engine_name"]

    for p in DEMO:
        got = records_api.get_records(p, fake)
        want = refs[p]["records"]
        assert len(got) == len(want), p
        for g, w in zip(got, want):
            where = f"{p} move {w['move_index']}"
            g_rest = {k: v for k, v in g.items() if k != "engine"}
            w_rest = {k: v for k, v in w.items() if k != "engine"}
            assert g_rest == w_rest, where
            if same_engine:
                assert g["engine"] == w["engine"], where
            else:
                ge, we = g["engine"], w["engine"]
                assert ge["lines"][0]["move"] == we["lines"][0]["move"], where
                assert ge["solution_is_top"] == we["solution_is_top"], where
                assert ge["one_clear_solution"] == we["one_clear_solution"], where
                assert (ge["lines"][0]["mate_in"] is not None) == (we["lines"][0]["mate_in"] is not None), where
