"""Run nickname migrations and RLS against the same isolated PostgreSQL fixture."""
import unittest
from pathlib import Path
import test_leaderboard_sync as fixtures

MIGRATION = Path(__file__).resolve().parents[1] / 'migrations' / '20261118000200_optional_leaderboard_name.sql'
ALICE, BOB = fixtures.ALICE, fixtures.BOB


class LeaderboardNameTests(unittest.TestCase):
    setUpClass = classmethod(fixtures.LeaderboardSyncTests.setUpClass.__func__)
    stop_server = classmethod(fixtures.LeaderboardSyncTests.stop_server.__func__)
    sql = classmethod(fixtures.LeaderboardSyncTests.sql.__func__)
    rating = fixtures.LeaderboardSyncTests.rating
    as_user = fixtures.LeaderboardSyncTests.as_user

    def setUp(self):
        fixtures.LeaderboardSyncTests.setUp(self)
        self.sql(fixtures.MIGRATION.read_text())
        self.sql(MIGRATION.read_text())

    def nickname(self, value, user_id=ALICE):
        literal = 'null' if value is None else "'" + value.replace("'", "''") + "'"
        self.as_user(ALICE, f'update public."Users" set leaderboard_name = {literal} where user_id = \'{user_id}\';')

    def test_opt_in_and_reset_preserve_account_identity_rating_and_theme_scores(self):
        before = self.rating(ALICE)
        self.nickname('Knight Owl')
        self.assertEqual(self.rating(ALICE), {**before, 'name': 'Knight Owl'})
        self.assertEqual(self.sql(f'select name from public."Users" where user_id = \'{ALICE}\';'), 'Alice Example')
        self.nickname(None)
        self.assertEqual(self.rating(ALICE), before)

    def test_account_name_and_rating_updates_keep_opted_in_nickname(self):
        self.nickname('Knight Owl')
        self.as_user(ALICE, f'update public."Users" set name = \'Alice Renamed\', rating = 1400 where user_id = \'{ALICE}\';')
        self.assertEqual(self.rating(ALICE)['name'], 'Knight Owl')
        self.assertEqual(self.rating(ALICE)['overall'], 1400)
        self.assertEqual(self.rating(ALICE)['fork'], 950)
        self.nickname(None)
        self.assertEqual(self.rating(ALICE)['name'], 'Alice Renamed')

    def test_existing_and_new_users_do_not_require_a_nickname(self):
        self.assertEqual(self.rating(BOB)['name'], 'Bob Example')
        self.as_user(fixtures.NEW_USER, f'insert into public."Users" (user_id, name, rating) values (\'{fixtures.NEW_USER}\', \'New Player\', 0);')
        self.assertEqual(self.rating(fixtures.NEW_USER)['name'], 'New Player')

    def test_rls_prevents_another_users_nickname_changes(self):
        self.nickname('Stolen Name', BOB)
        self.assertEqual(self.rating(BOB)['name'], 'Bob Example')
        self.assertEqual(self.sql(f'select leaderboard_name is null from public."Users" where user_id = \'{BOB}\';'), 't')

    def test_constraints_reject_invalid_direct_database_writes(self):
        for value in ['', '   ', 'ab', 'a' * 25, ' padded ', 'two\nlines', 'two\twords', 'a\u2028b', 'unknown student']:
            with self.subTest(value=value), self.assertRaises(AssertionError):
                self.nickname(value)
        self.assertEqual(self.rating(ALICE)['name'], 'Alice Example')

    def test_nicknames_are_not_unique_and_replaying_migration_keeps_saved_values(self):
        self.nickname('Knight Owl')
        self.as_user(BOB, f'update public."Users" set leaderboard_name = \'Knight Owl\' where user_id = \'{BOB}\';')
        before = self.rating(ALICE)
        self.sql(MIGRATION.read_text())
        self.assertEqual(self.rating(ALICE), before)
        self.assertEqual(self.rating(BOB)['name'], 'Knight Owl')
