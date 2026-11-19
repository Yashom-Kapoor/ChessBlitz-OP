/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import PuzzlesScreen from '@/app/(tabs)/puzzles';
import PuzzleThemeScreen from '@/app/puzzles/themes/[theme]';
import ThemePuzzleGrid from '@/components/puzzles/ThemePuzzleGrid';
import { ThemePuzzleSessionProvider, useThemePuzzleSessions } from '@/context/ThemePuzzleSessionContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
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
jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
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
let sessions: NonNullable<ReturnType<typeof useThemePuzzleSessions>>;
function Capture() { sessions = useThemePuzzleSessions()!; return null; }
const themePage = () => <ThemePuzzleSessionProvider><Capture /><PuzzleThemeScreen /></ThemePuzzleSessionProvider>;
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label)!;
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockParams = {};
  mockRouter.canGoBack.mockReturnValue(true);
  (getMyRatings as jest.Mock).mockResolvedValue({ fork: 1432, pin: 0, backrankmate: 1234 });
  (fetchRandomPuzzleSet as jest.Mock).mockImplementation(async theme => Array.from({ length: 9 }, (_, i) => `${theme}-${i}`));
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

test.each(PUZZLE_THEMES)('$title opens nine pieces, each routed to its assigned puzzle', async puzzle => {
  await act(async () => { root = create(<PuzzlesScreen />); });
  const row = root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityHint === `Open the ${puzzle.title} puzzle page`)!;
  await act(async () => { row.props.onPress(); });
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/puzzles/themes/[theme]', params: { theme: puzzle.key, isTablet: 'false' } });
  mockParams = mockRouter.push.mock.calls[0][0].params;
  (getMyRatings as jest.Mock).mockClear();
  await act(async () => { root.update(themePage()); });
  expect(root.root.findAllByType(Text).some(text => text.props.children === puzzle.title)).toBe(true);
  expect(root.root.findAllByType(Text).some(text => text.props.children === puzzle.description)).toBe(true);
  expect(root.root.findByType(ThemePuzzleGrid).props).toMatchObject({ color: puzzle.color, title: puzzle.title });
  expect(getMyRatings).not.toHaveBeenCalled();
  const pieces = root.root.findAllByType((Pressable as any).type ?? Pressable);
  expect(pieces).toHaveLength(9);
  for (const [index, piece] of pieces.entries()) {
    await act(async () => { piece.props.onPress(); });
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/puzzles/demo_puzzle', params: {
      theme: puzzle.key, puzzle: `${puzzle.key}-${index}`, themeSession: sessions.sessions[puzzle.key]!.id, isTablet: 'false',
    } });
  }
  expect(button(`Play ${puzzle.title} puzzle`)).toBeUndefined();
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
  await act(async () => { root = create(themePage()); });
  await act(async () => { button('Back to puzzles').props.onPress(); });
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('direct links have a return path even without navigation history', async () => {
  mockRouter.canGoBack.mockReturnValue(false);
  mockParams = { theme: 'pin', isTablet: 'true' };
  await act(async () => { root = create(themePage()); });
  await act(async () => { button('Back to puzzles').props.onPress(); });
  expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(tabs)/puzzles', params: { isTablet: 'true' } });
});

test('an unknown theme gives a safe way back instead of showing the wrong puzzle', async () => {
  mockParams = { theme: 'unknown-theme' };
  await act(async () => { root = create(themePage()); });
  expect(root.root.findAllByType(ThemePuzzleGrid)).toHaveLength(0);
  expect(root.root.findAllByType(TouchableOpacity).filter(b => b.props.accessibilityLabel?.startsWith('Play '))).toHaveLength(0);
  expect(root.root.findAllByType(Text).some(text => text.props.children === 'Theme not found')).toBe(true);
  expect(button('Back to puzzles')).toBeDefined();
  expect(getMyRatings).not.toHaveBeenCalled();
  expect(fetchRandomPuzzleSet).not.toHaveBeenCalled();
});

test('checkmarks stay visible, completed pieces are disabled, and reset appears only after all nine', async () => {
  mockParams = { theme: 'fork' };
  await act(async () => { root = create(themePage()); });
  const first = sessions.sessions.fork!;
  await act(async () => { sessions.complete('fork', first.id, first.puzzleIds[0]); });
  expect(root.root.findAllByType((Pressable as any).type ?? Pressable)[0].props).toMatchObject({ disabled: true, accessibilityLabel: 'Fork puzzle 1 of 9, completed' });
  expect(root.root.findAllByType(Text).filter(t => t.props.children === '✓')).toHaveLength(1);
  expect(button('Reset puzzles')).toBeUndefined();
  await act(async () => { root.update(themePage()); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  await act(async () => { first.puzzleIds.slice(1).forEach(id => sessions.complete('fork', first.id, id)); });
  expect(root.root.findAllByType(Text).filter(t => t.props.children === '✓')).toHaveLength(9);
  (fetchRandomPuzzleSet as jest.Mock).mockResolvedValueOnce(first.puzzleIds.map(id => `new-${id}`));
  await act(async () => { button('Reset puzzles').props.onPress(); });
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith('fork', first.puzzleIds);
  expect(root.root.findAllByType((Pressable as any).type ?? Pressable).every(piece => !piece.props.disabled)).toBe(true);
  expect(button('Reset puzzles')).toBeUndefined();
});

test('loading errors offer retry without showing selectable empty pieces', async () => {
  mockParams = { theme: 'pin' };
  (fetchRandomPuzzleSet as jest.Mock).mockRejectedValueOnce(new Error('Server unavailable'));
  await act(async () => { root = create(themePage()); });
  expect(root.root.findAllByType((Pressable as any).type ?? Pressable)).toHaveLength(0);
  expect(root.root.findAllByType(Text).some(t => t.props.children === 'Server unavailable')).toBe(true);
  await act(async () => { button('Retry loading puzzles').props.onPress(); });
  expect(root.root.findAllByType((Pressable as any).type ?? Pressable)).toHaveLength(9);
});
