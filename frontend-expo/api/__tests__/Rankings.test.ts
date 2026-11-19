/// <reference types="jest" />

import { supabase } from '../SupabaseClient';
import { getAvatarUrls } from '../Avatars';
import { getRankings } from '../Rankings';

jest.mock('../SupabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../Avatars', () => ({ getAvatarUrls: jest.fn() }));
jest.mock('@/constants/urls', () => ({ getApiUrl: () => 'http://192.168.1.50:5000' }));
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: {
    session: { user: { id: 'me' }, access_token: 'test-token' },
  } });
  (getAvatarUrls as jest.Mock).mockResolvedValue({ me: 'my-photo', other: 'their-photo' });
  mockFetch.mockResolvedValue({ ok: true, json: async () => [
    { student_id: 'me', name: ' Alex ', overall: 0 },
    { student_id: 'other', name: 'Alex', overall: 2000 },
    { student_id: 'missing-name', name: ' ', overall: 3000 },
    { student_id: 'unknown', name: 'Unknown Student', overall: 3000 },
    { student_id: 'missing-rating', name: 'Pat', overall: null },
    { student_id: 'bad-rating', name: 'Sam', overall: '9999' },
  ] });
});
afterAll(() => { globalThis.fetch = originalFetch; });

test('preserves ranking filters and associates each photo by ID, not display name', async () => {
  const result = await getRankings();
  expect(result.rankings).toEqual([
    { userId: 'other', rank: 1, name: 'Alex', rating: 2000, avatarUrl: 'their-photo', isYou: false },
    { userId: 'me', rank: 2, name: 'Alex', rating: 0, avatarUrl: 'my-photo', isYou: true },
  ]);
  expect(result.photosUnavailable).toBe(false);
  expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.50:5000/leaderboards/35/elo', {
    headers: { Authorization: 'Bearer test-token' },
  });
});

test('keeps rankings usable when photo storage is unavailable', async () => {
  (getAvatarUrls as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
  const result = await getRankings();
  expect(result.photosUnavailable).toBe(true);
  expect(result.rankings).toHaveLength(2);
  expect(result.rankings.every(row => row.avatarUrl === null)).toBe(true);
});

test('uses initials for players without photos', async () => {
  (getAvatarUrls as jest.Mock).mockResolvedValue({});
  const result = await getRankings();
  expect(result.photosUnavailable).toBe(false);
  expect(result.rankings.every(row => row.avatarUrl === null)).toBe(true);
});

test('rejects an API error before reading photos', async () => {
  mockFetch.mockResolvedValue({ ok: false });
  await expect(getRankings()).rejects.toThrow('Failed to fetch rankings');
  expect(getAvatarUrls).not.toHaveBeenCalled();
});

test('does not make unauthenticated requests', async () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
  await expect(getRankings()).rejects.toThrow('No session');
  expect(mockFetch).not.toHaveBeenCalled();
});
