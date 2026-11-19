/// <reference types="jest" />
import { supabase } from '../SupabaseClient';
import { updateLeaderboardName, validateLeaderboardName } from '../LeaderboardName';

jest.mock('../SupabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('@/constants/urls', () => ({ getApiUrl: () => 'http://192.168.1.50:5050' }));
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'alice' }, access_token: 'token' } } });
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ leaderboard_name: 'Knight Owl' }) });
});
afterEach(() => { globalThis.fetch = originalFetch; });

test('saves only the optional nickname through the phone-accessible backend', async () => {
  await expect(updateLeaderboardName('alice', '  Knight Owl  ')).resolves.toBe('Knight Owl');
  expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.50:5050/users/me/leaderboard-name', expect.objectContaining({
    method: 'PATCH', headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    body: JSON.stringify({ leaderboard_name: 'Knight Owl' }),
  }));
});
test('explicit null resets the nickname', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ leaderboard_name: null }) });
  await expect(updateLeaderboardName('alice', null)).resolves.toBeNull();
});
test.each(['', '  ', 'ab', 'a'.repeat(25), 'abc\n', 'two\twords', 'a\u0000b', 'a\u2028b', 'Unknown Student'])('rejects invalid nickname %j', async value => {
  await expect(updateLeaderboardName('alice', value)).rejects.toThrow();
  expect(mockFetch).not.toHaveBeenCalled();
});
test('allows spaces and counts Unicode code points consistently with the backend', () => {
  expect(validateLeaderboardName('Knight Owl')).toBeNull();
  expect(validateLeaderboardName('😀'.repeat(24))).toBeNull();
  expect(validateLeaderboardName('😀'.repeat(25))).not.toBeNull();
});
test.each([null, { user: { id: 'bob' } }])('rejects a missing or changed session', async session => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } });
  await expect(updateLeaderboardName('alice', 'Knight Owl')).rejects.toThrow('session changed');
  expect(mockFetch).not.toHaveBeenCalled();
});
test('surfaces backend errors and rejects malformed success responses', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Try again later.' }) });
  await expect(updateLeaderboardName('alice', 'Knight Owl')).rejects.toThrow('Try again later');
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await expect(updateLeaderboardName('alice', 'Knight Owl')).rejects.toThrow('Could not confirm');
});
test('times out unreachable servers instead of leaving save pending forever', async () => {
  jest.useFakeTimers();
  try {
    mockFetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = expect(updateLeaderboardName('alice', 'Knight Owl')).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(15000);
    await result;
  } finally { jest.useRealTimers(); }
});
