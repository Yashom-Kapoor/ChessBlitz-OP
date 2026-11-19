import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { UserProvider, useUser } from '../UserContext';
import { getCurrentUser } from '@/api/User';
import { uploadAvatar } from '@/api/Avatars';
import { supabase } from '@/api/SupabaseClient';

jest.mock('@/api/User', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/api/Avatars', () => ({ uploadAvatar: jest.fn() }));
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
