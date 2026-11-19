import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { UserProvider, useUser } from '../UserContext';
import { getCurrentUser } from '@/api/User';
import { uploadAvatar } from '@/api/Avatars';
import { updateLeaderboardName } from '@/api/LeaderboardName';
import { supabase } from '@/api/SupabaseClient';

jest.mock('@/api/User', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/api/Avatars', () => ({ uploadAvatar: jest.fn() }));
jest.mock('@/api/LeaderboardName', () => ({ updateLeaderboardName: jest.fn() }));
jest.mock('@/api/SupabaseClient', () => ({ supabase: { auth: { onAuthStateChange: jest.fn() } } }));

let root, context, authChanged;
const user = (id, avatar = `${id}-photo`) => ({
  user_id: id, name: id, email: `${id}@example.com`, created_at: '2026-01-01',
  puzzles_completed: 0, rating: 0, avatar_url: avatar,
});
function Probe() { context = useUser(); return null; }
async function signIn(id) {
  getCurrentUser.mockResolvedValue(user(id));
  await act(async () => {
    authChanged('SIGNED_IN', { user: { id } });
    jest.runOnlyPendingTimers();
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  supabase.auth.onAuthStateChange.mockImplementation(callback => {
    authChanged = callback;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
  await act(async () => { root = create(<UserProvider><Probe /></UserProvider>); });
  await signIn('alice');
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  jest.useRealTimers();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

test('updates the displayed photo only after the upload succeeds', async () => {
  let completeUpload;
  uploadAvatar.mockReturnValue(new Promise(resolve => { completeUpload = resolve; }));
  const saving = context.saveAvatar('photo', 'alice');
  expect(context.userData.avatarUrl).toBe('alice-photo');
  await act(async () => { completeUpload('new-photo'); await saving; });
  expect(context.userData.avatarUrl).toBe('new-photo');
});

test('does not let a stale profile response replace a newly saved photo', async () => {
  let completeLoad;
  getCurrentUser.mockReturnValue(new Promise(resolve => { completeLoad = resolve; }));
  const loading = context.loadUser();
  uploadAvatar.mockResolvedValue('new-photo');
  await act(async () => { await context.saveAvatar('photo', 'alice'); });
  await act(async () => { completeLoad(user('alice')); await loading; });
  expect(context.userData.avatarUrl).toBe('new-photo');
});

test('clears photos on sign-out and ignores an upload completing for the previous account', async () => {
  let completeUpload;
  uploadAvatar.mockReturnValue(new Promise(resolve => { completeUpload = resolve; }));
  const saving = context.saveAvatar('photo', 'alice');
  await act(async () => { authChanged('SIGNED_OUT', null); });
  expect(context.userData.avatarUrl).toBeNull();
  await signIn('bob');
  await act(async () => { completeUpload('alice-new-photo'); await saving; });
  expect(context.userData.userId).toBe('bob');
  expect(context.userData.avatarUrl).toBe('bob-photo');
});

test('retains the saved photo when a refresh cannot load photo metadata', async () => {
  getCurrentUser.mockResolvedValue({ ...user('alice'), avatar_url: undefined });
  await act(async () => { await context.loadUser(); });
  expect(context.userData.avatarUrl).toBe('alice-photo');
});

test('exposes auth state for navigation and clears it even before a pending profile load completes', async () => {
  expect(context.authReady).toBe(true);
  expect(context.authUserId).toBe('alice');
  let finish;
  getCurrentUser.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = context.loadUser();
  await act(async () => { authChanged('SIGNED_OUT', null); });
  expect(context.authUserId).toBeNull();
  await act(async () => { finish(user('alice')); await pending; });
  expect(context.userData.userId).toBe('');
  await act(async () => { authChanged('INITIAL_SESSION', null); });
  expect(context.authReady).toBe(true);
});

test('loads the nickname separately and only changes it after persistence succeeds', async () => {
  getCurrentUser.mockResolvedValue({ ...user('alice'), leaderboard_name: 'Knight Owl' });
  await act(async () => { await context.loadUser(); });
  expect(context.userData.leaderboardName).toBe('Knight Owl');
  expect(context.userData.name).toBe('alice');
  updateLeaderboardName.mockRejectedValueOnce(new Error('offline'));
  await expect(context.saveLeaderboardName(null, 'alice')).rejects.toThrow('offline');
  expect(context.userData.leaderboardName).toBe('Knight Owl');
  updateLeaderboardName.mockResolvedValue(null);
  await act(async () => { await context.saveLeaderboardName(null, 'alice'); });
  expect(context.userData.leaderboardName).toBeNull();
  expect(context.userData.name).toBe('alice');
});

test('ignores stale profile loads and nickname saves for a previous account', async () => {
  let finishLoad;
  getCurrentUser.mockReturnValue(new Promise(resolve => { finishLoad = resolve; }));
  const loading = context.loadUser();
  updateLeaderboardName.mockResolvedValue('Knight Owl');
  await act(async () => { await context.saveLeaderboardName('Knight Owl', 'alice'); });
  await act(async () => { finishLoad(user('alice')); await loading; });
  expect(context.userData.leaderboardName).toBe('Knight Owl');
  let finishSave;
  updateLeaderboardName.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
  const saving = context.saveLeaderboardName('Alice New', 'alice');
  await signIn('bob');
  await act(async () => { finishSave('Alice New'); await saving; });
  expect(context.userData.userId).toBe('bob');
  expect(context.userData.leaderboardName).toBeNull();
});
