"""Exercise the real SQL theme filter and random sampling in a temporary database."""
import json
import unittest
from pathlib import Path
import test_leaderboard_sync as fixtures

MIGRATION = Path(__file__).resolve().parents[1] / 'migrations' / '20261118000300_random_puzzles_by_theme.sql'
SET_MIGRATION = MIGRATION.with_name('20261118000400_theme_puzzle_sets.sql')


class RandomPuzzleTests(unittest.TestCase):
    setUpClass = classmethod(fixtures.LeaderboardSyncTests.setUpClass.__func__)
    stop_server = classmethod(fixtures.LeaderboardSyncTests.stop_server.__func__)
    sql = classmethod(fixtures.LeaderboardSyncTests.sql.__func__)

    def setUp(self):
        self.sql('''
          drop schema public cascade;
          create schema public;
          grant usage on schema public to anon, authenticated;
          create table public."Puzzles" ("PuzzleId" text primary key, "Themes" text);
          grant select on public."Puzzles" to authenticated;
          insert into public."Puzzles" values
            ('fork-only', 'middlegame fork short'), ('pin-only', 'pin'),
            ('both', 'fork pin'), ('substring', 'pinning forked'),
            ('spaces', E'  fork\tendgame\n'), ('other', 'skewer'),
            ('null', null), ('empty', ''), ('camel', 'backRankMate mateIn1');
        ''')
        self.sql(MIGRATION.read_text())
        self.sql(SET_MIGRATION.read_text())

    def sample(self, themes, count=1):
        array = 'array[' + ','.join("'" + theme.replace("'", "''") + "'" for theme in themes) + ']::text[]'
        values = self.sql('set role authenticated; ' + '\n'.join(
            f'select row_to_json(p) from public.get_random_puzzle_by_themes({array}) p;' for _ in range(count)))
        return [json.loads(line) for line in values.splitlines() if line]

    def test_whole_tags_match_in_any_position_with_whitespace(self):
        rows = self.sample(['fork'], 100)
        self.assertEqual(len(rows), 100)
        self.assertEqual({row['PuzzleId'] for row in rows}, {'fork-only', 'both', 'spaces'})

    def test_multiple_themes_match_either_tag(self):
        self.assertEqual({row['PuzzleId'] for row in self.sample(['fork', 'pin'], 100)},
                         {'fork-only', 'pin-only', 'both', 'spaces'})

    def test_camel_case_tags_keep_their_exact_meaning(self):
        self.assertEqual(self.sample(['backRankMate']), [{'PuzzleId': 'camel', 'Themes': 'backRankMate mateIn1'}])

    def test_empty_and_unknown_filters_do_not_fall_back_to_random_unrelated_puzzles(self):
        self.assertEqual(self.sample([]), [])
        self.assertEqual(self.sample(['missing']), [])
        self.assertEqual(self.sample(["pin' OR true --"]), [])

    def test_randomness_is_not_limited_to_a_postgrest_page_of_ids(self):
        self.sql('''insert into public."Puzzles" select 'extra-' || n, 'pin' from generate_series(1, 1500) n;''')
        rows = self.sample(['pin'], 100)
        self.assertTrue(any(row['PuzzleId'].startswith('extra-') and int(row['PuzzleId'][6:]) > 1000 for row in rows))
        self.assertGreater(len({row['PuzzleId'] for row in rows}), 1)

    def test_function_permissions_and_row_level_security_are_respected(self):
        self.assertEqual(self.sql("select has_function_privilege('anon', 'public.get_random_puzzle_by_themes(text[])', 'EXECUTE');"), 'f')
        self.sql('''alter table public."Puzzles" enable row level security;
          create policy visible on public."Puzzles" to authenticated using ("PuzzleId" = 'pin-only');''')
        self.assertEqual(self.sample(['fork']), [])
        self.assertEqual(self.sample(['pin']), [{'PuzzleId': 'pin-only', 'Themes': 'pin'}])

    def test_migration_can_be_replayed_without_changing_puzzles(self):
        self.sql(MIGRATION.read_text())
        self.assertEqual(self.sql('select count(*) from public."Puzzles";'), '9')

    def batch(self, theme='pin', exclude=()):
        array = 'array[' + ','.join("'" + item.replace("'", "''") + "'" for item in exclude) + ']::text[]'
        rows = self.sql(f"set role authenticated; select row_to_json(p) from public.get_random_puzzle_set('{theme}', {array}) p;")
        return [json.loads(row) for row in rows.splitlines() if row]

    def test_set_draws_nine_distinct_exact_matches_and_reset_excludes_previous_set(self):
        self.sql('''insert into public."Puzzles" select 'extra-' || n, 'middlegame pin short' from generate_series(1, 1500) n;''')
        all_ids = set()
        previous = []
        for _ in range(20):
            rows = self.batch(exclude=previous)
            current = [row['PuzzleId'] for row in rows]
            self.assertEqual(len(set(current)), 9)
            self.assertFalse(set(current) & set(previous))
            self.assertTrue(all('pin' in row['Themes'].split() for row in rows))
            all_ids.update(current)
            previous = current
        self.assertGreater(len(all_ids), 9)
        self.assertTrue(any(item.startswith('extra-') and int(item[6:]) > 1000 for item in all_ids))

    def test_small_set_is_not_padded_and_unknown_theme_is_empty(self):
        self.assertEqual({row['PuzzleId'] for row in self.batch()}, {'pin-only', 'both'})
        self.assertEqual(self.batch('unknown'), [])
        self.assertEqual(self.batch('backRankMate'), [{'PuzzleId': 'camel', 'Themes': 'backRankMate mateIn1'}])

    def test_set_respects_permissions_and_row_level_security(self):
        self.assertEqual(self.sql("select has_function_privilege('anon', 'public.get_random_puzzle_set(text,text[])', 'EXECUTE');"), 'f')
        self.sql('''alter table public."Puzzles" enable row level security;
          create policy visible on public."Puzzles" to authenticated using ("PuzzleId" = 'pin-only');''')
        self.assertEqual(self.batch(), [{'PuzzleId': 'pin-only', 'Themes': 'pin'}])
        self.assertEqual(self.batch('fork'), [])

    def test_set_migration_replays_without_changing_existing_puzzles_or_single_random_function(self):
        self.sql(SET_MIGRATION.read_text())
        self.assertEqual(self.sql('select count(*) from public."Puzzles";'), '9')
        self.assertEqual(len(self.sample(['fork'])), 1)
