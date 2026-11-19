/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import ChessboardDemo from '../ChessboardDemo';
import { fetchRandomPuzzle } from '@/api/RandomPuzzle';
import { fetchPuzzle } from '@/api/GetPuzzle';

jest.mock('@/api/RandomPuzzle', () => ({ fetchRandomPuzzle: jest.fn() }));
jest.mock('@/api/GetPuzzle', () => ({ fetchPuzzle: jest.fn() }));
jest.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: require('@/constants/Themes').Themes.default }) }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: require('react-native').View }));
jest.mock('@/components/chess/Chessboard', () => ({ __esModule: true, default: require('react').forwardRef(
  (props: any, _ref: any) => require('react').createElement('board', props)
) }));
let root: ReactTestRenderer;
const puzzle = (id: string) => ({ puzzleid: id, fen: `${id}-fen`, moves: 'e2e4', rating: 1200 });
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (fetchRandomPuzzle as jest.Mock).mockResolvedValue(puzzle('random'));
  (fetchPuzzle as jest.Mock).mockResolvedValue(puzzle('specific'));
});
afterEach(async () => { await act(async () => { root?.unmount(); }); });

test('loads a random puzzle with the chosen theme and initializes the existing board', async () => {
  const loaded = jest.fn();
  await act(async () => { root = create(<ChessboardDemo puzzleTheme="pin" onPuzzleLoaded={loaded} />); });
  expect(fetchRandomPuzzle).toHaveBeenCalledWith('pin');
  expect(fetchPuzzle).not.toHaveBeenCalled();
  expect(loaded).toHaveBeenCalledWith(puzzle('random'));
  expect(root.root.findByType('board' as any).props.fen).toBe('random-fen');
});

test('specific puzzle links keep priority over a theme parameter', async () => {
  await act(async () => { root = create(<ChessboardDemo puzzleId="known-id" puzzleTheme="pin" />); });
  expect(fetchPuzzle).toHaveBeenCalledWith('known-id');
  expect(fetchRandomPuzzle).not.toHaveBeenCalled();
});

test('changing themes ignores a late result from the previous theme', async () => {
  let finish!: (value: ReturnType<typeof puzzle>) => void;
  (fetchRandomPuzzle as jest.Mock).mockImplementation((theme: string) => theme === 'pin'
    ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(puzzle('fork')));
  const loaded = jest.fn();
  await act(async () => { root = create(<ChessboardDemo puzzleTheme="pin" onPuzzleLoaded={loaded} />); });
  await act(async () => { root.update(<ChessboardDemo puzzleTheme="fork" onPuzzleLoaded={loaded} />); });
  await act(async () => { finish(puzzle('pin')); });
  expect(loaded).toHaveBeenCalledTimes(1);
  expect(loaded).toHaveBeenCalledWith(puzzle('fork'));
  expect(root.root.findByType('board' as any).props.fen).toBe('fork-fen');
});

test('a failed category lookup shows the error and never initializes an unrelated board', async () => {
  (fetchRandomPuzzle as jest.Mock).mockRejectedValue(new Error('No puzzles found for this theme.'));
  const loaded = jest.fn();
  await act(async () => { root = create(<ChessboardDemo puzzleTheme="pin" onPuzzleLoaded={loaded} />); });
  expect(loaded).not.toHaveBeenCalled();
  expect(root.root.findAllByType('board' as any)).toHaveLength(0);
  expect(JSON.stringify(root.toJSON())).toContain('No puzzles found for this theme.');
});
