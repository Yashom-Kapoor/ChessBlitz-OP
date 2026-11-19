import '@/test-utils/puzzleScreenMocks';
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import DemoPuzzle from '@/app/puzzles/demo_puzzle';
import { PUZZLES, fakeBoard, toSupabasePuzzle } from '@/test-utils/puzzleScreen';

let root: ReactTestRenderer;
beforeEach(() => {
  jest.useFakeTimers();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  fakeBoard.puzzle = toSupabasePuzzle(PUZZLES[0]);
});
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test.each(['pin', 'fork', 'backRankMate'])('passes the %s category to the existing board loader', async theme => {
  jest.spyOn(jest.requireMock('expo-router'), 'useLocalSearchParams').mockReturnValue({ theme });
  await act(async () => { root = create(<DemoPuzzle />); });
  expect(fakeBoard.props.puzzleTheme).toBe(theme);
  expect(fakeBoard.props.puzzleId).toBeUndefined();
});

test('keeps specific puzzle links and ordinary Practice Puzzle working', async () => {
  const params = jest.spyOn(jest.requireMock('expo-router'), 'useLocalSearchParams').mockReturnValue({ puzzle: 'example-id' });
  await act(async () => { root = create(<DemoPuzzle />); });
  expect(fakeBoard.props.puzzleId).toBe('example-id');
  expect(fakeBoard.props.puzzleTheme).toBeUndefined();
  params.mockReturnValue({});
  await act(async () => { root.update(<DemoPuzzle />); });
  expect(fakeBoard.props.puzzleTheme).toBeUndefined();
  expect(fakeBoard.props.puzzleId).toBeUndefined();
});
