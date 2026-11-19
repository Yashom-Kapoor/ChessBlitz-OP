"""Exercise the real migration in an isolated, temporary PostgreSQL cluster.

Run: python3 -m unittest discover -s supabase/tests -v
Requires initdb, pg_ctl and psql on PATH. Never connects to Supabase or an
existing local database; the temporary server accepts Unix-socket connections only.
"""

import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import unittest


MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "20261118000100_sync_leaderboard_profiles.sql"
ALICE = "11111111-1111-4111-8111-111111111111"
BOB = "22222222-2222-4222-8222-222222222222"
NEW_USER = "33333333-3333-4333-8333-333333333333"


class LeaderboardSyncTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for binary in ("initdb", "pg_ctl", "psql"):
            if not shutil.which(binary):
                raise unittest.SkipTest(f"{binary} is required for database integration tests")
        cls.temp = tempfile.TemporaryDirectory(prefix="chessblitz-ratings-")
        cls.addClassCleanup(cls.temp.cleanup)
        root = Path(cls.temp.name)
        cls.data = root / "data"
        cls.socket_dir = root / "socket"
        cls.socket_dir.mkdir()
        subprocess.run(
            ["initdb", "-D", str(cls.data), "-U", "postgres", "-A", "trust", "--no-locale"],
            check=True, capture_output=True, text=True,
        )
        options = shlex.join(["-F", "-k", str(cls.socket_dir), "-h", "", "-p", "55439"])
        subprocess.run(
            ["pg_ctl", "-D", str(cls.data), "-l", str(root / "server.log"), "-o", options, "-w", "start"],
            check=True, capture_output=True, text=True,
        )
        cls.addClassCleanup(cls.stop_server)
        cls.env = {**os.environ, "PGHOST": str(cls.socket_dir), "PGPORT": "55439",
                   "PGUSER": "postgres", "PGDATABASE": "postgres", "PGOPTIONS": ""}
        cls.sql("create role anon; create role authenticated;")

    @classmethod
    def stop_server(cls):
        subprocess.run(["pg_ctl", "-D", str(cls.data), "-m", "immediate", "-w", "stop"],
                       check=True, capture_output=True, text=True)

    @classmethod
    def sql(cls, statement):
        result = subprocess.run(
            ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q"],
            input=statement, env=cls.env, capture_output=True, text=True,
        )
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    def setUp(self):
        # This schema and all destructive fixture operations are confined to the
        # temporary cluster created above, never a developer's running server.
        self.sql(f"""
            drop schema public cascade;
            create schema public;
            grant usage on schema public to authenticated;
            create table public."Users" (
              user_id uuid primary key, name text, rating integer, role text
            );
            create table public."Ratings" (
              student_id uuid primary key references public."Users"(user_id) on delete cascade,
              name text, overall integer, fork integer
            );
            create function public.initialize_ratings_row() returns trigger
              language plpgsql security definer as $$
              begin
                insert into public."Ratings" (student_id) values (new.user_id);
                return new;
              end; $$;
            create trigger on_student_created_ratings after insert on public."Users"
              for each row execute function public.initialize_ratings_row();
            insert into public."Users" values
              ('{ALICE}', 'Alice Example', 0, 'student'),
              ('{BOB}', 'Bob Example', 1200, 'student');
            update public."Ratings" set fork = 950 where student_id = '{ALICE}';
            update public."Ratings" set name = 'Bob Example', overall = 1200, fork = 1350
              where student_id = '{BOB}';
            alter table public."Users" enable row level security;
            create policy own_profile on public."Users" to authenticated
              using (user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid)
              with check (user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
            grant select, insert, update on public."Users" to authenticated;
        """)

    def migrate(self):
        self.sql(MIGRATION.read_text())

    def rating(self, user_id):
        value = self.sql(f"""select row_to_json(r) from public."Ratings" r
                             where student_id = '{user_id}';""")
        return json.loads(value) if value else None

    def as_user(self, user_id, statement):
        return self.sql(f"set role authenticated; set request.jwt.claim.sub = '{user_id}'; {statement}")

    def test_backfills_incomplete_and_missing_rows_without_changing_theme_scores(self):
        self.sql(f"delete from public.\"Ratings\" where student_id = '{BOB}';")
        self.migrate()
        self.assertEqual(self.rating(ALICE), {
            "student_id": ALICE, "name": "Alice Example", "overall": 0, "fork": 950,
        })
        self.assertEqual(self.rating(BOB)["overall"], 1200)

    def test_new_signup_populates_name_and_zero_score_as_an_ordinary_user(self):
        self.migrate()
        self.as_user(NEW_USER, f"""insert into public."Users"
            values ('{NEW_USER}', 'New Player', null, 'student');""")
        self.assertEqual(self.rating(NEW_USER)["name"], "New Player")
        self.assertEqual(self.rating(NEW_USER)["overall"], 0)
        self.assertEqual(self.sql("""select has_table_privilege('authenticated', 'public."Ratings"', 'INSERT'),
            has_function_privilege('authenticated', 'public.initialize_ratings_row()', 'EXECUTE');"""), "f|f")

    def test_profile_rename_and_puzzle_score_update_sync_without_losing_theme_scores(self):
        self.migrate()
        self.as_user(ALICE, f"update public.\"Users\" set rating = 32 where user_id = '{ALICE}';")
        self.assertEqual(self.rating(ALICE)["overall"], 32)
        self.as_user(ALICE, f"update public.\"Users\" set name = 'Alice Updated' where user_id = '{ALICE}';")
        self.assertEqual(self.rating(ALICE), {
            "student_id": ALICE, "name": "Alice Updated", "overall": 32, "fork": 950,
        })

    def test_profile_update_recreates_a_missing_ratings_row(self):
        self.migrate()
        self.sql(f"delete from public.\"Ratings\" where student_id = '{ALICE}';")
        self.as_user(ALICE, f"update public.\"Users\" set rating = 64 where user_id = '{ALICE}';")
        self.assertEqual(self.rating(ALICE)["name"], "Alice Example")
        self.assertEqual(self.rating(ALICE)["overall"], 64)

    def test_other_accounts_remain_protected_by_profile_row_level_security(self):
        self.migrate()
        self.as_user(ALICE, f"update public.\"Users\" set rating = 9999 where user_id = '{BOB}';")
        self.assertEqual(self.rating(BOB)["overall"], 1200)
        self.assertEqual(self.sql("""select prosecdef, proconfig::text from pg_proc
            where oid = 'public.initialize_ratings_row()'::regprocedure;"""), 't|{"search_path=\\"\\""}')

    def test_migration_is_repeatable_and_preserves_existing_populated_values(self):
        self.sql(f"update public.\"Ratings\" set name = '  ', overall = null where student_id = '{ALICE}';")
        self.migrate()
        self.sql(f"update public.\"Ratings\" set overall = 1500 where student_id = '{BOB}';")
        self.migrate()
        self.assertEqual(self.rating(ALICE)["name"], "Alice Example")
        self.assertEqual(self.rating(BOB)["overall"], 1500)
        self.assertEqual(self.rating(BOB)["fork"], 1350)
        self.assertEqual(self.sql('select count(*) from public."Ratings";'), "2")
        self.assertEqual(self.sql("""select count(*) from pg_trigger
            where tgrelid = 'public."Users"'::regclass and not tgisinternal;"""), "1")


if __name__ == "__main__":
    unittest.main()
