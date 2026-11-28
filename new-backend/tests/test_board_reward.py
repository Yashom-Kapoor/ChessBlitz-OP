"""Blitz is paid for a finished Rated board, not for each solved puzzle."""
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import test_classroom_membership as fixtures


class BoardRewardTest(unittest.TestCase):
    def setUp(self):
        self.client = fixtures.backend.app.test_client()
        self.headers = {'Authorization': 'Bearer test-token'}
        self.database = MagicMock()
        auth = SimpleNamespace(get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id='alice')))
        self.update_currency = MagicMock(return_value=True)
        for p in [patch.object(fixtures.backend, 'supabase', SimpleNamespace(auth=auth)),
                  patch.object(fixtures.backend, 'get_supabase_with_auth', return_value=self.database),
                  patch.object(fixtures.backend, 'update_currency', self.update_currency),
                  patch.object(fixtures.backend, 'get_shop_data', return_value={'currency': 1500})]:
            p.start()
            self.addCleanup(p.stop)

    def test_reward_requires_authentication(self):
        self.assertEqual(self.client.post('/puzzles/board-reward').status_code, 401)
        self.update_currency.assert_not_called()

    def test_reward_adds_one_thousand_blitz_and_returns_the_total(self):
        response = self.client.post('/puzzles/board-reward', headers=self.headers)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json, {'currency': 1500})
        self.update_currency.assert_called_once_with(self.database, 'test-token', 1000)

    def test_failed_currency_update_is_an_error(self):
        self.update_currency.return_value = False
        response = self.client.post('/puzzles/board-reward', headers=self.headers)
        self.assertEqual(response.status_code, 500)
        self.assertIn('try again', response.json['error'])

    def test_completing_a_puzzle_no_longer_pays_blitz(self):
        stubs = {
            'get_user_info': MagicMock(return_value={'rating': 1200, 'puzzles_completed': 3}),
            'get_puzzle_by_id': MagicMock(return_value={'Rating': 1200, 'Themes': 'pin'}),
            'record_puzzle_completion': MagicMock(return_value={'id': 1}),
            'update_user_info': MagicMock(),
            'update_theme_ratings': MagicMock(return_value=[]),
        }
        with patch.multiple(fixtures.backend, **stubs):
            response = self.client.post('/puzzles/completed', headers=self.headers,
                                        json={'puzzleid': 'p1', 'studentid': 'alice', 'completed': True})
        self.assertEqual(response.status_code, 201)
        self.update_currency.assert_not_called()


if __name__ == '__main__':
    unittest.main()
