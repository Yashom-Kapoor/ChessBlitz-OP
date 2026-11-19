/// <reference types="jest" />
import { supabase } from '../SupabaseClient';
import { enrollInClassroom, getMyClassroom, unenrollFromClassroom } from '../Classrooms';

jest.mock('../SupabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('@/constants/urls', () => ({ getApiUrl: () => 'http://192.168.1.50:5050' }));
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'alice' }, access_token: 'token' } } });
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ classroom: { classroom_id: 1, name: 'Chess Club' } }) });
});
afterAll(() => { globalThis.fetch = originalFetch; });

test('loads the saved classroom using the configured phone-accessible backend', async () => {
  await expect(getMyClassroom('alice')).resolves.toEqual({ classroom_id: 1, name: 'Chess Club' });
  expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.50:5050/classrooms/me', expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer token' }),
  }));
});
test('enrolls with a normalized code and no caller-controlled student ID', async () => {
  await enrollInClassroom('alice', ' abc123 ');
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/classrooms/join'), expect.objectContaining({
    method: 'POST', body: JSON.stringify({ join_code: 'ABC123' }),
  }));
});
test('unenrolls through the backend and accepts an empty membership', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ classroom: null }) });
  await expect(unenrollFromClassroom('alice')).resolves.toBeNull();
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/classrooms/me'), expect.objectContaining({ method: 'DELETE' }));
});
test.each([null, { user: { id: 'bob' } }])('rejects a missing or changed session before sending a request', async session => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } });
  await expect(enrollInClassroom('alice', 'ABC123')).rejects.toThrow('session changed');
  expect(mockFetch).not.toHaveBeenCalled();
});
test('surfaces invalid-code errors from the backend', async () => {
  mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'No active classroom matches that join code.' }) });
  await expect(enrollInClassroom('alice', 'BAD123')).rejects.toThrow('No active classroom');
});
test('does not interpret malformed or non-JSON responses as an unenrollment', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await expect(getMyClassroom('alice')).rejects.toThrow('Could not load');
  mockFetch.mockResolvedValue({ ok: false, json: async () => { throw new Error('HTML'); } });
  await expect(unenrollFromClassroom('alice')).rejects.toThrow('Could not update');
});
