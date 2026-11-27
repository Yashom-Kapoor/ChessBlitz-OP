/// <reference types="jest" />
import React, { act } from 'react';
import { Text } from 'react-native';
import { create, ReactTestRenderer } from 'react-test-renderer';
import TopBar, { formatElo } from '../TopBar';

const mockNavigate = jest.fn();
let mockUser: any;
let mockCurrency = 0;

jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock('@/context/UserContext', () => ({ useUser: () => ({ userData: mockUser }) }));
jest.mock('@/context/ShopContext', () => ({ useShop: () => ({ currency: mockCurrency }) }));
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { background: '#1e2233', primaryText: '#fff', hintBubble: '#333', secondaryText: '#fff', dark: true } }),
}));
jest.mock('@/hooks/useIsTablet', () => ({ useIsTablet: () => false }));
jest.mock('@/utils/Glass', () => ({ useGlassAvailable: () => false, glassColorSchemeFor: () => 'dark' }));
jest.mock('expo-blur', () => ({ BlurView: () => null }));
jest.mock('expo-glass-effect', () => ({ GlassView: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

let root: ReactTestRenderer;
const texts = () => root.root.findAllByType(Text).map(t => t.props.children);

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockNavigate.mockClear();
  mockCurrency = 1250;
  mockUser = { name: 'Alex Parker', leaderboardName: null, avatarUrl: null, overallRating: 1487.6 };
});
afterEach(async () => { await act(async () => { root.unmount(); }); });

test('shows blitz and rounded elo', async () => {
  await act(async () => { root = create(<TopBar />); });
  expect(texts()).toEqual(expect.arrayContaining([1250, '1488']));
});

test('prefers the leaderboard nickname and falls back to the name', async () => {
  await act(async () => { root = create(<TopBar />); });
  expect(texts()).toContain('Alex Parker');
  mockUser = { ...mockUser, leaderboardName: 'KnightRider' };
  await act(async () => { root.update(<TopBar />); });
  expect(texts()).toContain('KnightRider');
  expect(texts()).not.toContain('Alex Parker');
});

test('tapping the name and photo opens the profile tab', async () => {
  await act(async () => { root = create(<TopBar />); });
  await act(async () => { root.root.findByProps({ testID: 'top-bar-profile' }).props.onPress(); });
  expect(mockNavigate).toHaveBeenCalledWith('/profile');
});

test('formatElo shows a dash until the rating is numeric', () => {
  expect(formatElo('Loading...')).toBe('—');
  expect(formatElo(null)).toBe('—');
  expect(formatElo('1500')).toBe('1500');
});
