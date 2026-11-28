"""Exercise the real SQL theme filter and random sampling in a temporary database."""
import json
import unittest
from pathlib import Path
import test_leaderboard_sync as fixtures

MIGRATION = Path(__file__).resolve().parents[1] / 'migrations' / '20261118000300_random_puzzles_by_theme.sql'
SET_MIGRATION = MIGRATION.with_name('20261118000400_theme_puzzle_sets.sql')
MIXED_MIGRATION = MIGRATION.with_name('20261126000100_puzzle_set_by_themes.sql')
RATING_MIGRATION = MIGRATION.with_name('20261127000100_puzzle_set_rating_window.sql')


def strip(row):
    """Older assertions predate the Rating column."""
    row.pop('Rating', None)
    return row


class RandomPuzzleTests(unittest.TestCase):
    setUpClass = classmethod(fixtures.LeaderboardSyncTests.setUpClass.__func__)
    stop_server = classmethod(fixtures.LeaderboardSyncTests.stop_server.__func__)
    sql = classmethod(fixtures.LeaderboardSyncTests.sql.__func__)

    def setUp(self):
        self.sql('''
          drop schema public cascade;
          create schema public;
          grant usage on schema public to anon, authenticated;
          create table public."Puzzles" ("PuzzleId" text primary key, "Themes" text, "Rating" integer);
          grant select on public."Puzzles" to authenticated;
          insert into public."Puzzles" values
            ('fork-only', 'middlegame fork short'), ('pin-only', 'pin'),
            ('both', 'fork pin'), ('substring', 'pinning forked'),
            ('spaces', E'  fork\tendgame\n'), ('other', 'skewer'),
            ('null', null), ('empty', ''), ('camel', 'backRankMate mateIn1');
        ''')
        self.sql(MIGRATION.read_text())
        self.sql(SET_MIGRATION.read_text())
        self.sql(MIXED_MIGRATION.read_text())
        self.sql(RATING_MIGRATION.read_text())

    def sample(self, themes, count=1):
        array = 'array[' + ','.join("'" + theme.replace("'", "''") + "'" for theme in themes) + ']::text[]'
        values = self.sql('set role authenticated; ' + '\n'.join(
            f'select row_to_json(p) from public.get_random_puzzle_by_themes({array}) p;' for _ in range(count)))
        return [strip(json.loads(line)) for line in values.splitlines() if line]

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
        return [strip(json.loads(row)) for row in rows.splitlines() if row]

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

    def mixed(self, themes, exclude=()):
        def arr(items):
            return 'array[' + ','.join("'" + item.replace("'", "''") + "'" for item in items) + ']::text[]'
        rows = self.sql(f"set role authenticated; select row_to_json(p) from public.get_random_puzzle_set_by_themes({arr(themes)}, {arr(exclude)}) p;")
        return [strip(json.loads(row)) for row in rows.splitlines() if row]

    def test_mixed_set_draws_nine_distinct_puzzles_from_only_the_requested_themes(self):
        self.sql('''insert into public."Puzzles" select 'fork-' || n, 'middlegame fork' from generate_series(1, 30) n;
          insert into public."Puzzles" select 'pin-' || n, 'pin short' from generate_series(1, 30) n;
          insert into public."Puzzles" select 'skewer-' || n, 'skewer' from generate_series(1, 30) n;''')
        seen = set()
        previous = []
        for _ in range(20):
            rows = self.mixed(['fork', 'pin'], previous)
            current = [row['PuzzleId'] for row in rows]
            self.assertEqual(len(set(current)), 9)
            self.assertFalse(set(current) & set(previous))
            self.assertTrue(all({'fork', 'pin'} & set(row['Themes'].split()) for row in rows))
            seen.update(row['PuzzleId'].split('-')[0] for row in rows)
            previous = current
        self.assertIn('fork', seen)
        self.assertIn('pin', seen)
        self.assertNotIn('skewer', seen)

    def test_mixed_set_with_no_themes_or_unknown_themes_is_empty(self):
        self.assertEqual(self.mixed([]), [])
        self.assertEqual(self.mixed(['missing', "pin' OR true --"]), [])
        self.assertEqual({row['PuzzleId'] for row in self.mixed(['backRankMate', 'skewer'])}, {'camel', 'other'})

    def test_mixed_set_respects_permissions_and_row_level_security(self):
        self.assertEqual(self.sql("select has_function_privilege('anon', 'public.get_random_puzzle_set_by_themes(text[],text[],integer)', 'EXECUTE');"), 'f')
        self.sql('''alter table public."Puzzles" enable row level security;
          create policy visible on public."Puzzles" to authenticated using ("PuzzleId" = 'pin-only');''')
        self.assertEqual(self.mixed(['fork', 'pin']), [{'PuzzleId': 'pin-only', 'Themes': 'pin'}])

    def rated(self, themes, target, exclude=()):
        def arr(items):
            return 'array[' + ','.join("'" + item + "'" for item in items) + ']::text[]'
        target_sql = 'null' if target is None else str(target)
        rows = self.sql(f"set role authenticated; select row_to_json(p) from public.get_random_puzzle_set_by_themes({arr(themes)}, {arr(exclude)}, {target_sql}) p;")
        return [json.loads(row) for row in rows.splitlines() if row]

    def test_rated_set_stays_within_100_when_enough_puzzles_are_close(self):
        self.sql('''insert into public."Puzzles" select 'r-' || n, 'fork', 700 + n * 10 from generate_series(0, 80) n;''')
        for _ in range(10):
            ratings = [row['Rating'] for row in self.rated(['fork'], 1100)]
            self.assertEqual(len(ratings), 9)
            self.assertTrue(all(1000 <= rating <= 1200 for rating in ratings), ratings)

    def test_rated_set_widens_closest_first_when_few_are_close(self):
        self.sql('''insert into public."Puzzles" values
            ('near-1', 'pin', 1050), ('near-2', 'pin', 950), ('near-3', 'pin', 1100),
            ('mid-1', 'pin', 1150), ('mid-2', 'pin', 820),
            ('wide-1', 'pin', 1390), ('wide-2', 'pin', 650),
            ('far-1', 'pin', 2000), ('far-2', 'pin', 100), ('far-3', 'pin', 2500), ('far-4', 'pin', 3000);
          update public."Puzzles" set "Rating" = 1000 where "PuzzleId" in ('pin-only', 'both');''')
        expected = {'near-1', 'near-2', 'near-3', 'pin-only', 'both', 'mid-1', 'mid-2', 'wide-1', 'wide-2'}
        for _ in range(10):
            self.assertEqual({row['PuzzleId'] for row in self.rated(['pin'], 1000)}, expected)

    def test_rated_set_falls_back_to_any_rating_including_unrated(self):
        self.sql('''insert into public."Puzzles" select 'far-' || n, 'skewer', 2500 + n from generate_series(1, 8) n;''')
        ids = {row['PuzzleId'] for row in self.rated(['skewer'], 800)}
        self.assertEqual(ids, {'other'} | {f'far-{n}' for n in range(1, 9)})

    def test_rated_set_keeps_theme_filter_and_exclusions(self):
        self.sql('''insert into public."Puzzles" select 'fork-' || n, 'fork', 1000 from generate_series(1, 20) n;
          insert into public."Puzzles" select 'skewer-' || n, 'skewer', 1000 from generate_series(1, 20) n;''')
        excluded = [f'fork-{n}' for n in range(1, 10)]
        for _ in range(10):
            rows = self.rated(['fork'], 1000, excluded)
            self.assertEqual(len(rows), 9)
            self.assertTrue(all('fork' in row['Themes'].split() and row['PuzzleId'] not in excluded for row in rows))

    def test_null_target_and_two_argument_calls_still_work(self):
        self.sql('''insert into public."Puzzles" select 'fork-' || n, 'fork', n * 100 from generate_series(1, 20) n;''')
        self.assertEqual(len(self.rated(['fork'], None)), 9)
        self.assertEqual(len(self.mixed(['fork'])), 9)
        self.assertEqual(self.sql("select count(*) from pg_proc where proname = 'get_random_puzzle_set_by_themes';"), '1')

    def test_rated_migration_replays_cleanly(self):
        self.sql(RATING_MIGRATION.read_text())
        self.assertEqual(self.sql('select count(*) from public."Puzzles";'), '9')
