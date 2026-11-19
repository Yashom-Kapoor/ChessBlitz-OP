/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import LeaderboardName from '../LeaderboardName';
import Avatar from '@/components/Avatar';

const mockSave = jest.fn();
let mockUser = { userId: 'alice', name: 'Alice Account', avatarUrl: 'alice-photo', leaderboardName: null as string | null };
jest.mock('@/context/UserContext', () => ({ useUser: () => ({ authUserId: 'alice', userData: mockUser, saveLeaderboardName: mockSave }) }));
jest.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: { primaryText: '#111111', primaryButton: '#eeeeee', buttonShadow: '#444444' } }) }));
jest.mock('@/context/GlobalStyle', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@/components/Avatar', () => () => null);
jest.mock('@/api/SupabaseClient', () => ({ supabase: {} }));
jest.mock('@/constants/urls', () => ({ getApiUrl: jest.fn() }));
let root: ReactTestRenderer;
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label)!;
const text = () => JSON.stringify(root.toJSON());
async function render() { await act(async () => { root = create(<LeaderboardName isTablet={false} />); }); }
async function type(value: string) { await act(async () => { root.root.findByType(TextInput).props.onChangeText(value); }); }
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockUser = { userId: 'alice', name: 'Alice Account', avatarUrl: 'alice-photo', leaderboardName: null };
  mockSave.mockResolvedValue(undefined);
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

test('leaves the nickname optional and previews the account name and existing photo', async () => {
  await render();
  expect(root.root.findByType(TextInput).props.value).toBe('');
  expect(button('Save leaderboard nickname').props.disabled).toBe(true);
  expect(button('Use account name')).toBeUndefined();
  expect(root.root.findByType(Avatar).props).toMatchObject({ name: 'Alice Account', uri: 'alice-photo' });
  expect(mockSave).not.toHaveBeenCalled();
});
test('previews the draft and prevents duplicate saves while persistence is pending', async () => {
  let finish!: () => void;
  mockSave.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  await render(); await type('Knight Owl');
  expect(root.root.findByType(Avatar).props.name).toBe('Knight Owl');
  await act(async () => { button('Save leaderboard nickname').props.onPress(); button('Save leaderboard nickname').props.onPress(); });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave).toHaveBeenCalledWith('Knight Owl', 'alice');
  expect(button('Save leaderboard nickname').props.disabled).toBe(true);
  expect(text()).not.toContain('nickname saved');
  await act(async () => { finish(); });
  expect(text()).toContain('nickname saved');
  expect(mockUser.name).toBe('Alice Account');
});
test('rejects invalid input without changing the saved nickname', async () => {
  mockUser.leaderboardName = 'Knight Owl';
  await render(); await type('   ');
  await act(async () => { button('Save leaderboard nickname').props.onPress(); });
  expect(mockSave).not.toHaveBeenCalled();
  expect(text()).toContain('3–24 characters');
});
test('keeps the draft after a failed save and allows retry', async () => {
  mockSave.mockRejectedValueOnce(new Error('Server unavailable'));
  await render(); await type('Knight Owl');
  await act(async () => { button('Save leaderboard nickname').props.onPress(); });
  expect(text()).toContain('Server unavailable');
  expect(root.root.findByType(TextInput).props.value).toBe('Knight Owl');
  expect(button('Save leaderboard nickname').props.disabled).toBe(false);
  await act(async () => { button('Save leaderboard nickname').props.onPress(); });
  expect(text()).toContain('nickname saved');
});
test('Use account name explicitly clears the nickname and restores its preview', async () => {
  mockUser.leaderboardName = 'Knight Owl';
  await render();
  await act(async () => { button('Use account name').props.onPress(); });
  expect(mockSave).toHaveBeenCalledWith(null, 'alice');
  expect(root.root.findByType(TextInput).props.value).toBe('');
  expect(root.root.findByType(Avatar).props.name).toBe('Alice Account');
});
