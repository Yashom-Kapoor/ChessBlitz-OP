/// <reference types="jest" />
import { fetchRandomPuzzle } from '../RandomPuzzle';
import { supabase } from '../SupabaseClient';

jest.mock('../SupabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('@/constants/urls', () => ({ getApiUrl: () => 'http://192.168.1.50:5050' }));
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();
const puzzle = { puzzleid: 'pin-1', fen: 'test-fen', moves: 'e2e4', themes: 'pin', rating: 1200 };
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'token' } } });
  mockFetch.mockResolvedValue({ ok: true, json: async () => puzzle });
});
afterEach(() => { globalThis.fetch = originalFetch; });

test('requests the chosen theme through the configured mobile backend', async () => {
  await expect(fetchRandomPuzzle('pin')).resolves.toEqual(puzzle);
  expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.50:5050/puzzles/random/?theme=pin', expect.objectContaining({
    headers: { Authorization: 'Bearer token' }, signal: expect.anything(),
  }));
});
test('supports matching either fork or pin', async () => {
  await fetchRandomPuzzle(['fork', 'pin']);
  expect(mockFetch.mock.calls[0][0]).toBe('http://192.168.1.50:5050/puzzles/random/?theme=fork&theme=pin');
});
test('keeps the unfiltered request for the original Practice Puzzle', async () => {
  await fetchRandomPuzzle();
  expect(mockFetch.mock.calls[0][0]).toBe('http://192.168.1.50:5050/puzzles/random/');
});
test('escapes filter values instead of allowing extra query parameters', async () => {
  await fetchRandomPuzzle('fork&theme=pin');
  expect(mockFetch.mock.calls[0][0]).toContain('?theme=fork%26theme%3Dpin');
});
test('requires a session before loading puzzles', async () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
  await expect(fetchRandomPuzzle('pin')).rejects.toThrow('sign in');
  expect(mockFetch).not.toHaveBeenCalled();
});
test.each([404, 500])('surfaces a %i failure without requesting an unrelated fallback puzzle', async status => {
  mockFetch.mockResolvedValue({ ok: false, status, json: async () => ({ error: 'No matching puzzle.' }) });
  await expect(fetchRandomPuzzle('pin')).rejects.toThrow('No matching puzzle');
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
test('does not pass a malformed response to the board', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await expect(fetchRandomPuzzle('pin')).rejects.toThrow('incomplete');
});
test('stops an unreachable backend request after 15 seconds', async () => {
  jest.useFakeTimers();
  try {
    mockFetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = expect(fetchRandomPuzzle('pin')).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(15000);
    await result;
  } finally { jest.useRealTimers(); }
});
