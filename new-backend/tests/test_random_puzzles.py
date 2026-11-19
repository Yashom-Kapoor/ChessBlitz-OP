"""Theme selection reuses the random endpoint without changing puzzle play."""
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import test_classroom_membership as fixtures


class RandomPuzzleRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = fixtures.backend.app.test_client()
        self.headers = {'Authorization': 'Bearer test-token'}
        self.database = MagicMock()
        self.puzzle = {'PuzzleId': 'pin-1', 'FEN': 'test-fen', 'Moves': 'e2e4', 'Rating': 1200,
                       'Themes': 'pin middlegame', 'GameUrl': 'unused'}
        self.database.rpc.return_value.execute.return_value = SimpleNamespace(data=[self.puzzle])
        auth = SimpleNamespace(get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id='alice')))
        for p in [patch.object(fixtures.backend, 'supabase', SimpleNamespace(auth=auth)),
                  patch.object(fixtures.backend, 'get_supabase_with_auth', return_value=self.database)]:
            p.start()
            self.addCleanup(p.stop)

    def get(self, query='?theme=pin'):
        return self.client.get('/puzzles/random/' + query, headers=self.headers)

    def test_filtered_requests_require_authentication(self):
        self.assertEqual(self.client.get('/puzzles/random/?theme=pin').status_code, 401)
        self.database.rpc.assert_not_called()

    def test_each_displayed_category_calls_sql_with_the_exact_tag(self):
        for theme in fixtures.backend.PUZZLE_THEMES:
            with self.subTest(theme=theme):
                response = self.get('?theme=' + theme)
                self.assertEqual(response.status_code, 200)
                self.database.rpc.assert_called_with('get_random_puzzle_by_themes', {'theme_filters': [theme]})
        self.assertEqual(response.json, {'puzzleid': 'pin-1', 'fen': 'test-fen', 'moves': 'e2e4',
                                         'rating': 1200, 'themes': 'pin middlegame'})

    def test_multiple_categories_are_passed_together_for_or_filtering(self):
        self.assertEqual(self.get('?theme=fork&theme=pin&theme=fork').status_code, 200)
        self.database.rpc.assert_called_once_with('get_random_puzzle_by_themes', {'theme_filters': ['fork', 'pin']})

    def test_unknown_empty_and_injected_categories_do_not_reach_the_database(self):
        for query in ['?theme=', '?theme=unknown', '?theme=pin&theme=unknown', '?theme=pin%27%20OR%201=1']:
            with self.subTest(query=query):
                self.assertEqual(self.get(query).status_code, 400)
        self.database.rpc.assert_not_called()

    def test_empty_category_returns_not_found_instead_of_an_unrelated_puzzle(self):
        self.database.rpc.return_value.execute.return_value = SimpleNamespace(data=[])
        response = self.get()
        self.assertEqual(response.status_code, 404)
        self.assertIn('theme', response.json['error'])

    def test_database_error_is_distinct_from_an_empty_category(self):
        self.database.rpc.return_value.execute.side_effect = RuntimeError('unavailable')
        with self.assertLogs(fixtures.backend.app.logger, level='ERROR'):
            response = self.get()
        self.assertEqual(response.status_code, 500)
        self.assertIn('try again', response.json['error'])

    def test_no_filter_keeps_the_existing_random_puzzle_flow(self):
        with patch.object(fixtures.backend, 'get_random_puzzle', return_value=self.puzzle) as original:
            self.assertEqual(self.get('').status_code, 200)
        original.assert_called_once_with(self.database)
        self.database.rpc.assert_not_called()

    def test_set_requires_authentication_and_one_valid_theme(self):
        self.assertEqual(self.client.get('/puzzles/random-set/?theme=pin').status_code, 401)
        for query in ['', '?theme=', '?theme=pinning', '?theme=pin&theme=fork', '?theme=pin&' + '&'.join('exclude=x' for _ in range(10))]:
            self.assertEqual(self.client.get('/puzzles/random-set/' + query, headers=self.headers).status_code, 400)
        self.database.rpc.assert_not_called()

    def test_set_returns_nine_puzzles_in_one_sql_draw_for_every_category(self):
        rows = [{**self.puzzle, 'PuzzleId': f'puzzle-{i}'} for i in range(9)]
        self.database.rpc.return_value.execute.return_value = SimpleNamespace(data=rows)
        for theme in fixtures.backend.PUZZLE_THEMES:
            with self.subTest(theme=theme):
                response = self.client.get(f'/puzzles/random-set/?theme={theme}&exclude=old-id', headers=self.headers)
                self.assertEqual(response.status_code, 200)
                self.assertEqual([p['puzzleid'] for p in response.json], [p['PuzzleId'] for p in rows])
                self.database.rpc.assert_called_with('get_random_puzzle_set', {'theme_filter': theme, 'excluded_ids': ['old-id']})

    def test_set_does_not_pad_an_incomplete_draw_with_unrelated_puzzles(self):
        response = self.client.get('/puzzles/random-set/?theme=pin', headers=self.headers)
        self.assertEqual(response.status_code, 404)
        self.assertIn('Not enough', response.json['error'])

    def test_set_database_failure_is_retryable(self):
        self.database.rpc.return_value.execute.side_effect = RuntimeError('unavailable')
        with self.assertLogs(fixtures.backend.app.logger, level='ERROR'):
            response = self.client.get('/puzzles/random-set/?theme=pin', headers=self.headers)
        self.assertEqual(response.status_code, 500)
        self.assertIn('try again', response.json['error'])
