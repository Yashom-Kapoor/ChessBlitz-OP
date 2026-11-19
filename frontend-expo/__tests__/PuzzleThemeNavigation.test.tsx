/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Text, TouchableOpacity, View } from 'react-native';
import PuzzlesScreen from '@/app/(tabs)/puzzles';
import PuzzleThemeScreen from '@/app/puzzles/themes/[theme]';
import ThemePuzzlePlaceholder from '@/components/puzzles/ThemePuzzlePlaceholder';
import { PUZZLE_THEMES } from '@/constants/PuzzleThemes';
import { getMyRatings } from '@/api/Ratings';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: { theme?: string; isTablet?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useGlobalSearchParams: () => mockParams,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/api/Ratings', () => ({ ...jest.requireActual('@/api/Ratings'), getMyRatings: jest.fn() }));
jest.mock('@/api/SupabaseClient', () => ({ supabase: {} }));
jest.mock('@/constants/urls', () => ({ getApiUrl: jest.fn() }));
jest.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: require('@/constants/Themes').Themes.default }) }));
jest.mock('@/context/Backgrounds', () => ({ BackgroundContext: ({ children }: any) => children }));
jest.mock('@/components/GlassBlurView', () => () => null);
jest.mock('@expo/vector-icons/FontAwesome6', () => () => null);
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 34, left: 0, right: 0 }) }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: require('react-native').View }));
jest.mock('react-native-reanimated', () => {
  const { View, Image, ScrollView } = require('react-native');
  return { __esModule: true, default: { View, Image, ScrollView }, useAnimatedRef: () => require('react').useRef(null),
    useScrollViewOffset: () => ({ value: 0 }), useAnimatedStyle: () => ({}) };
});

let root: ReactTestRenderer;
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label)!;
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockParams = {};
  mockRouter.canGoBack.mockReturnValue(true);
  (getMyRatings as jest.Mock).mockResolvedValue({ fork: 1432, pin: 0, backrankmate: 1234 });
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

test.each(PUZZLE_THEMES)('$title opens its matching placeholder through a theme route', async puzzle => {
  await act(async () => { root = create(<PuzzlesScreen />); });
  const row = root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityHint === `Open the ${puzzle.title} puzzle page`)!;
  await act(async () => { row.props.onPress(); });
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/puzzles/themes/[theme]', params: { theme: puzzle.key, isTablet: 'false' } });
  mockParams = mockRouter.push.mock.calls[0][0].params;
  (getMyRatings as jest.Mock).mockClear();
  await act(async () => { root.update(<PuzzleThemeScreen />); });
  expect(root.root.findAllByType(Text).some(text => text.props.children === puzzle.title)).toBe(true);
  expect(root.root.findAllByType(Text).some(text => text.props.children === puzzle.description)).toBe(true);
  expect(root.root.findByType(ThemePuzzlePlaceholder).props).toEqual({ color: puzzle.color, title: puzzle.title });
  expect(getMyRatings).not.toHaveBeenCalled();
});

test('keeps existing ratings, including zero, and does not invent missing scores', async () => {
  await act(async () => { root = create(<PuzzlesScreen />); });
  expect(button('Fork, rating 1432')).toBeDefined();
  expect(button('Pin, rating 0')).toBeDefined();
  expect(button('Back Rank, rating 1234')).toBeDefined();
  expect(button('Skewer, rating unavailable')).toBeDefined();
  const locked = root.root.findAllByType(View).find(v => v.props.accessibilityLabel === 'Coming Soon, locked')!;
  expect(locked.props.accessibilityState.disabled).toBe(true);
  expect(locked.props.onPress).toBeUndefined();
});

test('keeps Practice Puzzle routed to the existing playable board', async () => {
  mockParams = { isTablet: 'true' };
  await act(async () => { root = create(<PuzzlesScreen />); });
  const practice = root.root.findAllByType(TouchableOpacity).find(b => b.findAllByType(Text).some(t => t.props.children === 'Practice Puzzle'))!;
  await act(async () => { practice.props.onPress(); });
  expect(mockRouter.push).toHaveBeenCalledWith('/puzzles/demo_puzzle?isTablet=true');
  await act(async () => { button('Fork, rating 1432').props.onPress(); });
  expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/puzzles/themes/[theme]', params: { theme: 'fork', isTablet: 'true' } });
});

test('back returns to the existing navigation history', async () => {
  mockParams = { theme: 'fork' };
  await act(async () => { root = create(<PuzzleThemeScreen />); });
  await act(async () => { button('Back to puzzles').props.onPress(); });
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('direct links have a return path even without navigation history', async () => {
  mockRouter.canGoBack.mockReturnValue(false);
  mockParams = { theme: 'pin', isTablet: 'true' };
  await act(async () => { root = create(<PuzzleThemeScreen />); });
  await act(async () => { button('Back to puzzles').props.onPress(); });
  expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(tabs)/puzzles', params: { isTablet: 'true' } });
});

test('an unknown theme gives a safe way back instead of showing the wrong puzzle', async () => {
  mockParams = { theme: 'unknown-theme' };
  await act(async () => { root = create(<PuzzleThemeScreen />); });
  expect(root.root.findAllByType(ThemePuzzlePlaceholder)).toHaveLength(0);
  expect(root.root.findAllByType(Text).some(text => text.props.children === 'Theme not found')).toBe(true);
  expect(button('Back to puzzles')).toBeDefined();
  expect(getMyRatings).not.toHaveBeenCalled();
});
