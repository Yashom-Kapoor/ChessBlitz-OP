/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Alert, Text, TouchableOpacity } from 'react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { supabase } from '@/api/SupabaseClient';

jest.mock('@/api/SupabaseClient', () => ({ supabase: { auth: { signOut: jest.fn() } } }));
jest.mock('@/context/UserContext', () => ({ useUser: () => ({
  userData: { userId: 'alice', name: 'Alice', email: 'alice@example.com' },
  loadUser: jest.fn().mockResolvedValue(undefined), updateUserData: jest.fn(), saveAvatar: jest.fn(),
}) }));
jest.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: { primaryText: '#111111', primaryButton: '#eeeeee', buttonShadow: '#444444' } }) }));
jest.mock('@/context/GlobalStyle', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@/context/Backgrounds', () => ({ BackgroundContext: ({ children }: any) => children }));
jest.mock('@/components/GlassBlurView', () => () => null);
jest.mock('@/components/Avatar', () => () => null);
jest.mock('@/components/profile/ClassroomMembership', () => () => null);
jest.mock('@/utils/profilePhoto', () => ({ chooseProfilePhoto: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({}), useGlobalSearchParams: () => ({}), useFocusEffect: jest.fn() }));
let root: ReactTestRenderer;
const button = () => root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === 'Log out')!;
beforeEach(async () => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => { root = create(<ProfileScreen />); });
});
afterEach(async () => { await act(async () => { root.unmount(); }); jest.restoreAllMocks(); });
test('signs out this device once and shows progress during the request', async () => {
  let finish!: (value: { error: null }) => void;
  (supabase.auth.signOut as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await act(async () => { button().props.onPress(); button().props.onPress(); });
  expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(button().props.disabled).toBe(true);
  expect(button().findByType(Text).props.children).toBe('Logging out…');
  await act(async () => { finish({ error: null }); });
  expect(Alert.alert).not.toHaveBeenCalled();
});
test.each(['returned', 'thrown'])('shows %s sign-out errors and permits retry', async kind => {
  const error = new Error('Connection failed');
  if (kind === 'returned') (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error });
  else (supabase.auth.signOut as jest.Mock).mockRejectedValue(error);
  await act(async () => { await button().props.onPress(); });
  expect(Alert.alert).toHaveBeenCalledWith('Could not log out', 'Connection failed');
  expect(button().props.disabled).toBe(false);
});
