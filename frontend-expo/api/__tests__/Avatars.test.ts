/// <reference types="jest" />

import { supabase } from '../SupabaseClient';
import { getAvatarUrls, uploadAvatar } from '../Avatars';

jest.mock('../SupabaseClient', () => ({ supabase: {
  auth: { getSession: jest.fn() }, from: jest.fn(), storage: { from: jest.fn() },
} }));

const userId = '11111111-1111-4111-8111-111111111111';
const photo = '/9j/2Q==';
const oldPath = `${userId}/old.jpg`;
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockSave = jest.fn();
const mockRead = jest.fn();
const mockList = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: userId } } } });
  mockRead.mockResolvedValue({ data: { storage_path: oldPath }, error: null });
  mockList.mockResolvedValue({ data: [], error: null });
  mockUpload.mockResolvedValue({ error: null });
  mockSave.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: mockRead, in: mockList, upsert: mockSave };
  (supabase.from as jest.Mock).mockReturnValue(query);
  (supabase.storage.from as jest.Mock).mockReturnValue({
    upload: mockUpload, remove: mockRemove,
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/avatars/${path}` } }),
  });
});

test('looks up photos by user ID, including other players with the same name', async () => {
  mockList.mockResolvedValue({ data: [
    { user_id: 'alice', storage_path: 'alice/photo.jpg' },
    { user_id: 'bob', storage_path: 'bob/photo.jpg' },
  ] });
  expect(await getAvatarUrls(['alice', 'bob', 'alice', ''])).toEqual({
    alice: 'https://storage.example/avatars/alice/photo.jpg',
    bob: 'https://storage.example/avatars/bob/photo.jpg',
  });
  expect(mockList).toHaveBeenCalledWith('user_id', ['alice', 'bob']);
});

test('does not request photos for an empty leaderboard', async () => {
  expect(await getAvatarUrls([])).toEqual({});
  expect(supabase.from).not.toHaveBeenCalled();
});

test('batches larger leaderboards', async () => {
  await getAvatarUrls(Array.from({ length: 205 }, (_, i) => `user-${i}`));
  expect(mockList.mock.calls.map(call => call[1].length)).toEqual([100, 100, 5]);
});

test('saves a new photo before deleting the old one', async () => {
  const url = await uploadAvatar(photo, userId);
  const [path, bytes, options] = mockUpload.mock.calls[0];
  expect(path).toMatch(new RegExp(`^${userId}/[a-z0-9-]+\\.jpg$`));
  expect(Array.from(new Uint8Array(bytes))).toEqual([255, 216, 255, 217]);
  expect(options).toMatchObject({ contentType: 'image/jpeg', upsert: false });
  expect(mockSave).toHaveBeenCalledWith({ user_id: userId, storage_path: path }, { onConflict: 'user_id' });
  expect(mockRemove).toHaveBeenCalledWith([oldPath]);
  expect(mockSave.mock.invocationCallOrder[0]).toBeLessThan(mockRemove.mock.invocationCallOrder[0]);
  expect(url).toBe(`https://storage.example/avatars/${path}`);
});

test('supports the first photo and generates a new URL for replacements', async () => {
  mockRead.mockResolvedValue({ data: null, error: null });
  const first = await uploadAvatar(photo, userId);
  const second = await uploadAvatar(photo, userId);
  expect(first).not.toBe(second);
  expect(mockRemove).not.toHaveBeenCalled();
});

test.each([null, { user: { id: 'another-user' } }])('rejects missing or changed sessions', async session => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } });
  await expect(uploadAvatar(photo, userId)).rejects.toThrow('session changed');
  expect(mockUpload).not.toHaveBeenCalled();
});

test.each(['', 'A'.repeat(4 * Math.ceil((2 * 1024 * 1024 + 1) / 3))])('rejects empty or oversized photos', async data => {
  await expect(uploadAvatar(data, userId)).rejects.toThrow('2 MB');
  expect(mockUpload).not.toHaveBeenCalled();
});

test('reports unavailable storage setup before attempting an upload', async () => {
  mockRead.mockResolvedValue({ data: null, error: { code: 'PGRST205' } });
  await expect(uploadAvatar(photo, userId)).rejects.toThrow('administrator');
  expect(mockUpload).not.toHaveBeenCalled();
});

test('keeps the old photo when the upload fails', async () => {
  mockUpload.mockResolvedValue({ error: { message: 'Network error' } });
  await expect(uploadAvatar(photo, userId)).rejects.toThrow('Could not upload');
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});

test('does not delete either photo when saving the database reference is unconfirmed', async () => {
  mockSave.mockResolvedValue({ error: { message: 'Connection lost' } });
  await expect(uploadAvatar(photo, userId)).rejects.toThrow('Could not confirm');
  expect(mockRemove).not.toHaveBeenCalled();
});

test('a cleanup failure does not fail an already saved photo', async () => {
  mockRemove.mockRejectedValue(new Error('Network error'));
  await expect(uploadAvatar(photo, userId)).resolves.toContain(userId);
});
