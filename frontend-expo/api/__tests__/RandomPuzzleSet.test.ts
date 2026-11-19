import { fetchRandomPuzzleSet } from '../RandomPuzzleSet';
import { supabase } from '../SupabaseClient';
jest.mock('../SupabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('@/constants/urls', () => ({ getApiUrl: () => 'http://192.168.1.50:5050' }));
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();
const puzzles = Array.from({ length: 9 }, (_, i) => ({ puzzleid: `pin-${i}`, fen: 'fen', moves: 'e2e4', themes: 'pin endgame' }));
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'token' } } });
  mockFetch.mockResolvedValue({ ok: true, json: async () => puzzles });
});
afterEach(() => { globalThis.fetch = originalFetch; });
test('loads all nine IDs in one authenticated request and escapes reset exclusions', async () => {
  await expect(fetchRandomPuzzleSet('pin', ['old&id'])).resolves.toEqual(puzzles.map(p => p.puzzleid));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.50:5050/puzzles/random-set/?theme=pin&exclude=old%26id',
    expect.objectContaining({ headers: { Authorization: 'Bearer token' } }));
});
test.each([
  ['too few', puzzles.slice(0, 8)],
  ['duplicates', puzzles.map(() => puzzles[0])],
  ['wrong theme', puzzles.map(p => ({ ...p, themes: 'pinning' }))],
  ['malformed themes', puzzles.map(p => ({ ...p, themes: [] }))],
  ['missing ID', puzzles.map(p => ({ ...p, puzzleid: '' }))],
  ['non-array', {}],
])('rejects %s instead of showing a broken grid', async (_label, response) => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => response });
  await expect(fetchRandomPuzzleSet('pin')).rejects.toThrow('incomplete');
});
test('reset rejects a puzzle from the previous set', async () => {
  await expect(fetchRandomPuzzleSet('pin', ['pin-0'])).rejects.toThrow('incomplete');
});
test('requires sign in and surfaces backend errors', async () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({ data: { session: null } });
  await expect(fetchRandomPuzzleSet('pin')).rejects.toThrow('sign in');
  expect(mockFetch).not.toHaveBeenCalled();
  mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Not enough puzzles available for this theme.' }) });
  await expect(fetchRandomPuzzleSet('pin')).rejects.toThrow('Not enough');
});
test('a stalled connection times out so the page can offer retry', async () => {
  jest.useFakeTimers();
  try {
    mockFetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = expect(fetchRandomPuzzleSet('pin')).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(15000);
    await result;
  } finally { jest.useRealTimers(); }
});
