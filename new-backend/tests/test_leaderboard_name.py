"""Nickname routes must never update account identity or another user's profile."""
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch
import test_classroom_membership as fixtures


class LeaderboardNameRoutesTest(unittest.TestCase):
    def setUp(self):
        self.store = fixtures.Store()
        for row in self.store.rows['Users']:
            row.update(name=row['user_id'].title(), leaderboard_name=None, rating=1234, email='private@example.com')
        self.original = deepcopy(self.store.rows['Users'])
        self.client = fixtures.backend.app.test_client()
        self.headers = {'Authorization': 'Bearer alice-token'}
        auth = SimpleNamespace(get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id='alice')))
        for p in [patch.object(fixtures.backend, 'supabase', SimpleNamespace(auth=auth)),
                  patch.object(fixtures.backend, 'get_supabase_with_auth', return_value=self.store)]:
            p.start()
            self.addCleanup(p.stop)

    def save(self, nickname, **extra):
        return self.client.patch('/users/me/leaderboard-name', json={'leaderboard_name': nickname, **extra}, headers=self.headers)

    def test_requires_authentication(self):
        self.assertEqual(self.client.patch('/users/me/leaderboard-name', json={'leaderboard_name': 'Knight'}).status_code, 401)

    def test_normalizes_and_updates_only_the_verified_users_nickname(self):
        result = self.save('  Knight Owl  ', user_id='bob', name='Replaced', rating=9999)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json, {'leaderboard_name': 'Knight Owl'})
        expected = deepcopy(self.original)
        expected[0]['leaderboard_name'] = 'Knight Owl'
        self.assertEqual(self.store.rows['Users'], expected)

    def test_null_restores_account_name_and_is_repeatable(self):
        self.save('Knight Owl')
        for _ in range(2):
            result = self.save(None)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json, {'leaderboard_name': None})
        self.assertEqual(self.store.rows['Users'], self.original)

    def test_invalid_names_do_not_change_saved_profile(self):
        for nickname in ['', '  ', 'ab', 'a' * 25, 42, [], {}, 'abc\n', 'two\twords', 'a\x00b', 'abc\u2028', 'Unknown Student']:
            with self.subTest(nickname=nickname):
                self.assertEqual(self.save(nickname).status_code, 400)
        self.assertEqual(self.store.rows['Users'], self.original)

    def test_missing_payload_is_not_treated_as_a_reset(self):
        self.save('Knight Owl')
        for data in [None, {}, [], {'name': 'Another'}]:
            self.assertEqual(self.client.patch('/users/me/leaderboard-name', json=data, headers=self.headers).status_code, 400)
        self.assertEqual(self.store.rows['Users'][0]['leaderboard_name'], 'Knight Owl')

    def test_accepts_unicode_at_character_limit_and_duplicate_nicknames(self):
        self.assertEqual(self.save('♞' * 24).status_code, 200)
        self.assertEqual(self.save('😀' * 24).status_code, 200)
        self.store.rows['Users'][1]['leaderboard_name'] = 'Knight Owl'
        self.assertEqual(self.save('Knight Owl').status_code, 200)

    def test_missing_profile_and_database_failure_cannot_report_success(self):
        self.store.rows['Users'] = [self.store.rows['Users'][1]]
        self.assertEqual(self.save('Knight Owl').status_code, 404)
        self.store.fail = True
        with self.assertLogs(fixtures.backend.app.logger, level='ERROR'):
            result = self.save('Knight Owl')
        self.assertEqual(result.status_code, 500)
        self.assertIn('Please try again', result.json['error'])
