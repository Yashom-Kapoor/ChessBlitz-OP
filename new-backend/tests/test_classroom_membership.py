"""Exercise the authenticated classroom routes without changing hosted student data."""
import importlib
import os
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch

with patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co", "SUPABASE_KEY": "test-key"}):
    backend = importlib.import_module("backend.app")


class Query:
    def __init__(self, store, table):
        self.store, self.table = store, table
        self.filters = []
        self.values = None
        self.columns = None
        self.single = False

    def select(self, columns):
        self.columns = columns.split(",")
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def is_(self, column, _value):
        return self.eq(column, None)

    def maybe_single(self):
        self.single = True
        return self

    def update(self, values):
        self.values = values
        return self

    def execute(self):
        if self.store.fail:
            raise RuntimeError("Database unavailable")
        if self.values is not None and self.store.before_update:
            self.store.before_update()
        rows = [r for r in self.store.rows[self.table] if all(r.get(k) == v for k, v in self.filters)]
        if self.values is not None:
            for row in rows:
                row.update(self.values)
        if self.columns:
            rows = [{k: row[k] for k in self.columns} for row in rows]
        data = deepcopy(rows[0] if rows else None) if self.single else deepcopy(rows)
        return SimpleNamespace(data=data)


class Store:
    def __init__(self):
        self.rows = {
            "Users": [{"user_id": "alice", "classroom": None}, {"user_id": "bob", "classroom": 2}],
            "Classroom-DB": [
                {"classroom_id": 1, "name": "Chess Club", "join_code": "ABC123", "is_active": True},
                {"classroom_id": 2, "name": "Second Class", "join_code": "XYZ789", "is_active": True},
                {"classroom_id": 3, "name": "Archived", "join_code": "OLD123", "is_active": False},
            ],
        }
        self.fail = False
        self.before_update = None

    def table(self, name):
        return Query(self, name)


class MembershipRoutesTest(unittest.TestCase):
    def setUp(self):
        self.store = Store()
        self.client = backend.app.test_client()
        self.headers = {"Authorization": "Bearer alice-token"}
        auth = SimpleNamespace(get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id="alice")))
        self.patches = [patch.object(backend, "supabase", SimpleNamespace(auth=auth)),
                        patch.object(backend, "get_supabase_with_auth", return_value=self.store)]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def join(self, code="ABC123", **extra):
        return self.client.post('/classrooms/join', json={"join_code": code, **extra}, headers=self.headers)

    def test_all_membership_operations_require_authentication(self):
        for method, path in [('get', '/classrooms/me'), ('delete', '/classrooms/me'), ('post', '/classrooms/join')]:
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(path).status_code, 401)

    def test_get_reads_the_signed_in_students_membership(self):
        self.assertEqual(self.client.get('/classrooms/me', headers=self.headers).json, {"classroom": None})
        self.store.rows['Users'][0]['classroom'] = 1
        self.assertEqual(self.client.get('/classrooms/me', headers=self.headers).json,
                         {"classroom": {"classroom_id": 1, "name": "Chess Club"}})

    def test_join_persists_and_ignores_a_forged_student_id(self):
        result = self.join(' abc123 ', student_uid='bob')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['classroom']['name'], 'Chess Club')
        self.assertEqual(self.store.rows['Users'][0]['classroom'], 1)
        self.assertEqual(self.store.rows['Users'][1]['classroom'], 2)
        self.assertEqual(self.client.get('/classrooms/me', headers=self.headers).json['classroom']['classroom_id'], 1)

    def test_leave_persists_and_does_not_change_another_student(self):
        self.join()
        result = self.client.delete('/classrooms/me', headers=self.headers, json={'student_uid': 'bob'})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json, {'classroom': None})
        self.assertIsNone(self.store.rows['Users'][0]['classroom'])
        self.assertEqual(self.store.rows['Users'][1]['classroom'], 2)

    def test_join_and_leave_are_idempotent(self):
        self.join()
        self.assertEqual(self.join().status_code, 200)
        for _ in range(2):
            self.assertEqual(self.client.delete('/classrooms/me', headers=self.headers).status_code, 200)

    def test_invalid_or_inactive_codes_do_not_change_membership(self):
        for code in ['BAD123', 'OLD123']:
            with self.subTest(code=code):
                self.assertEqual(self.join(code).status_code, 404)
                self.assertIsNone(self.store.rows['Users'][0]['classroom'])

    def test_malformed_payloads_get_actionable_errors(self):
        for data in [None, [], {}, {'join_code': 123456}, {'join_code': '123'}, {'join_code': 'ABC!23'}]:
            with self.subTest(data=data):
                result = self.client.post('/classrooms/join', json=data, headers=self.headers)
                self.assertEqual(result.status_code, 400)
                self.assertIn('six-character', result.json['error'])

    def test_missing_profile_cannot_report_success(self):
        self.store.rows['Users'] = [self.store.rows['Users'][1]]
        for method, path in [('get', '/classrooms/me'), ('delete', '/classrooms/me'), ('post', '/classrooms/join')]:
            result = getattr(self.client, method)(path, json={'join_code': 'ABC123'}, headers=self.headers)
            self.assertEqual(result.status_code, 404)

    def test_join_does_not_silently_replace_an_existing_classroom(self):
        self.join()
        self.assertEqual(self.join('XYZ789').status_code, 409)
        self.assertEqual(self.store.rows['Users'][0]['classroom'], 1)

    def test_concurrent_enrollment_cannot_be_overwritten(self):
        self.store.before_update = lambda: self.store.rows['Users'][0].update(classroom=2)
        self.assertEqual(self.join().status_code, 409)
        self.assertEqual(self.store.rows['Users'][0]['classroom'], 2)

    def test_concurrent_classroom_change_cannot_be_unenrolled(self):
        self.join()
        self.store.before_update = lambda: self.store.rows['Users'][0].update(classroom=2)
        self.assertEqual(self.client.delete('/classrooms/me', headers=self.headers).status_code, 409)
        self.assertEqual(self.store.rows['Users'][0]['classroom'], 2)

    def test_database_failure_returns_an_error_not_success(self):
        self.store.fail = True
        with self.assertLogs(backend.app.logger, level='ERROR'):
            result = self.join()
        self.assertEqual(result.status_code, 500)
        self.assertNotIn('Database unavailable', result.json['error'])


if __name__ == '__main__':
    unittest.main()
