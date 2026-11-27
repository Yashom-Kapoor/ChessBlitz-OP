/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import PuzzlesScreen, { RATED_BOARD_COLOR, RATED_PUZZLES_SUBTITLE, RATED_PUZZLES_TITLE } from '@/app/(tabs)/puzzles';
import ThemePuzzleGrid from '@/components/puzzles/ThemePuzzleGrid';
import ThemeRatingsList, { LOCKED_DESATURATION } from '@/components/puzzles/ThemeRatingsList';
import { PuzzleBoardProvider, usePuzzleBoard } from '@/context/PuzzleBoardContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { DEFAULT_UNLOCKED_THEMES, desaturate, PUZZLE_THEMES } from '@/constants/PuzzleThemes';
import { getMyRatings } from '@/api/Ratings';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
let mockIsTablet = false;
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useGlobalSearchParams: () => mockParams,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/hooks/useIsTablet', () => ({ useIsTablet: () => mockIsTablet }));
jest.mock('@/api/Ratings', () => ({ ...jest.requireActual('@/api/Ratings'), getMyRatings: jest.fn() }));
jest.mock('@/api/SupabaseClient', () => ({ supabase: {} }));
jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
jest.mock('@/constants/urls', () => ({ getApiUrl: jest.fn() }));
jest.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: require('@/constants/Themes').Themes.default }) }));
jest.mock('@/context/Backgrounds', () => ({ BackgroundContext: ({ children }: any) => children }));
jest.mock('@expo/vector-icons/FontAwesome6', () => () => null);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 34, left: 0, right: 0 }) }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: require('react-native').View }));

let root: ReactTestRenderer;
let board: NonNullable<ReturnType<typeof usePuzzleBoard>>;
function Capture() { board = usePuzzleBoard()!; return null; }
const tab = () => <PuzzleBoardProvider><Capture /><PuzzlesScreen /></PuzzleBoardProvider>;
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label);
const pieces = () => root.root.findAllByType((Pressable as any).type ?? Pressable);
const texts = () => root.root.findAllByType(Text).map(t => t.props.children);
const ratingRow = (label: string) => root.root.findAllByType(View).find(v => v.props.accessibilityLabel === label);
let draw = 0;
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockParams = {};
  mockIsTablet = false;
  draw = 0;
  (getMyRatings as jest.Mock).mockResolvedValue({ fork: 1432, pin: 0, backrankmate: 1234 });
  (fetchRandomPuzzleSet as jest.Mock).mockImplementation(async () => {
    draw += 1;
    return Array.from({ length: 9 }, (_, i) => `draw${draw}-${i}`);
  });
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

test('the tab leads with the Rated Puzzles board drawn from every unlocked theme', async () => {
  await act(async () => { root = create(tab()); });
  expect(texts()).toEqual(expect.arrayContaining([RATED_PUZZLES_TITLE, RATED_PUZZLES_SUBTITLE, 'Puzzle Ratings']));
  expect(texts()).not.toContain('Practice Puzzle');
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  expect(fetchRandomPuzzleSet).toHaveBeenCalledWith(DEFAULT_UNLOCKED_THEMES, []);
  expect(root.root.findByType(ThemePuzzleGrid).props).toMatchObject({ color: RATED_BOARD_COLOR, title: 'Rated' });
  expect(pieces()).toHaveLength(9);
  for (const [index, piece] of pieces().entries()) {
    await act(async () => { piece.props.onPress(); });
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/puzzles/demo_puzzle', params: {
      puzzle: `draw1-${index}`, boardSession: board.board!.id,
    } });
  }
});

test('returning to the tab keeps the same board instead of drawing a new one', async () => {
  await act(async () => { root = create(tab()); });
  await act(async () => { root.update(tab()); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
});

test('solved pieces are checked and disabled, and a new board appears only after all nine', async () => {
  mockIsTablet = true;
  await act(async () => { root = create(tab()); });
  const first = board.board!;
  await act(async () => { board.complete(first.id, first.puzzleIds[0]); });
  expect(pieces()[0].props).toMatchObject({ disabled: true, accessibilityLabel: 'Rated puzzle 1 of 9, completed' });
  expect(texts().filter(t => t === '✓')).toHaveLength(1);
  expect(root.root.findAllByType(Text).some(t => Array.isArray(t.props.children) && t.props.children.join('') === '1 of 9 solved')).toBe(true);
  expect(button('New board')).toBeUndefined();
  await act(async () => { first.puzzleIds.slice(1).forEach(id => board.complete(first.id, id)); });
  expect(texts().filter(t => t === '✓')).toHaveLength(9);
  await act(async () => { button('New board')!.props.onPress(); });
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(DEFAULT_UNLOCKED_THEMES, first.puzzleIds);
  expect(pieces().every(piece => !piece.props.disabled)).toBe(true);
  expect(button('New board')).toBeUndefined();
});

test('loading errors offer retry without showing selectable empty pieces', async () => {
  (fetchRandomPuzzleSet as jest.Mock).mockRejectedValueOnce(new Error('Server unavailable'));
  await act(async () => { root = create(tab()); });
  expect(pieces()).toHaveLength(0);
  expect(texts()).toContain('Server unavailable');
  await act(async () => { button('Retry loading puzzles')!.props.onPress(); });
  expect(pieces()).toHaveLength(9);
});

test('rating rows are display only, keep zero ratings and do not invent missing scores', async () => {
  await act(async () => { root = create(tab()); });
  expect(ratingRow('Fork, rating 1432')).toBeDefined();
  expect(ratingRow('Pin, rating 0')).toBeDefined();
  expect(ratingRow('Back Rank, rating 1234')).toBeDefined();
  expect(ratingRow('Skewer, rating unavailable')).toBeDefined();
  expect(ratingRow('Coming Soon, locked')).toBeDefined();
  // Only the board's pieces are tappable; no row opens a theme page.
  expect(root.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  for (const theme of PUZZLE_THEMES) {
    const row = root.root.findByProps({ testID: `theme-rating-${theme.key}` });
    expect(row.props.onPress).toBeUndefined();
    expect(row.props.accessibilityRole).toBeUndefined();
  }
});

test('locked themes show a washed-out tint of their own color with a lock instead of a rating', async () => {
  await act(async () => {
    root = create(<ThemeRatingsList ratings={{ fork: 1432, pin: 900 }} isTablet={false} unlockedThemes={['fork']} />);
  });
  const fork = root.root.findByProps({ testID: 'theme-rating-fork' });
  const pin = root.root.findByProps({ testID: 'theme-rating-pin' });
  const skewer = root.root.findByProps({ testID: 'theme-rating-skewer' });
  const color = (node: typeof fork) => Object.assign({}, ...[node.props.style].flat(2)).backgroundColor;
  expect(fork.props.accessibilityLabel).toBe('Fork, rating 1432');
  expect(pin.props.accessibilityLabel).toBe('Pin, locked');
  expect(color(fork)).toBe(PUZZLE_THEMES[0].color);
  expect(color(pin)).toBe(desaturate(PUZZLE_THEMES[1].color, LOCKED_DESATURATION));
  // Each locked row keeps its own tint rather than one shared gray.
  expect(color(pin)).not.toBe(color(skewer));
  expect(pin.findAllByType(Text).map(t => t.props.children)).not.toContain(900);
});
