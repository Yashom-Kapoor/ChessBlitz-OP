import '@/test-utils/puzzleScreenMocks';
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Chess } from 'chess.js';
import DemoPuzzle from '@/app/puzzles/demo_puzzle';
import { PuzzleBoardProvider, usePuzzleBoard } from '@/context/PuzzleBoardContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { PUZZLES, fakeBoard, toSupabasePuzzle } from '@/test-utils/puzzleScreen';

jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
let root: ReactTestRenderer;
let context: NonNullable<ReturnType<typeof usePuzzleBoard>>;
const dismissTo = jest.fn();
let params: Record<string, string>;
function Capture() { context = usePuzzleBoard()!; return null; }
const tree = (play = false) => <PuzzleBoardProvider><Capture />{play && <DemoPuzzle />}</PuzzleBoardProvider>;
const wait = async (ms = 1000) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
beforeEach(async () => {
  jest.useFakeTimers();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  dismissTo.mockClear();
  params = {};
  jest.spyOn(jest.requireMock('expo-router'), 'useLocalSearchParams').mockImplementation(() => params);
  jest.spyOn(jest.requireMock('expo-router'), 'useRouter').mockReturnValue({ dismissTo });
  fakeBoard.puzzle = toSupabasePuzzle(PUZZLES[0]);
  (fetchRandomPuzzleSet as jest.Mock).mockResolvedValue([fakeBoard.puzzle.puzzleid, ...Array.from({ length: 8 }, (_, i) => `other-${i}`)]);
  await act(async () => { root = create(tree()); });
  await act(async () => { context.ensure(); });
  params = { puzzle: fakeBoard.puzzle.puzzleid, boardSession: context.board!.id };
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function solve() {
  const moves = fakeBoard.puzzle.moves.split(' ');
  for (let i = 1; i < moves.length; i += 2) {
    await act(async () => { fakeBoard.userMove(moves[i]); });
    await wait();
  }
}

test('only a solved puzzle checks its piece and returns to the Puzzles tab, while completion is still submitted', async () => {
  const supabase = jest.requireMock('@/api/SupabaseClient').supabase;
  jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'alice' } } });
  const submit = jest.spyOn(jest.requireMock('@/api/PostCompleted'), 'postCompletedPuzzle');
  await act(async () => { root.update(tree(true)); });
  await wait(600);
  expect(fakeBoard.props.puzzleId).toBe(fakeBoard.puzzle.puzzleid);
  const expected = fakeBoard.puzzle.moves.split(' ')[1];
  const wrong = new Chess(fakeBoard.game.fen()).moves({ verbose: true })
    .map(move => move.from + move.to + (move.promotion ?? '')).find(move => move !== expected)!;
  await act(async () => { fakeBoard.userMove(wrong); });
  await wait();
  expect(context.board!.completedIds).toEqual([]);
  expect(dismissTo).not.toHaveBeenCalled();
  await solve();
  expect(context.board!.completedIds).toEqual([fakeBoard.puzzle.puzzleid]);
  expect(dismissTo).toHaveBeenCalledTimes(1);
  expect(dismissTo).toHaveBeenCalledWith('/(tabs)/puzzles');
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ puzzleid: fakeBoard.puzzle.puzzleid, completed: true }));
  await wait();
  expect(dismissTo).toHaveBeenCalledTimes(1);
});

test('leaving an unfinished puzzle does not complete its piece', async () => {
  await act(async () => { root.update(tree(true)); });
  await wait(600);
  await act(async () => { root.update(tree(false)); });
  expect(context.board!.completedIds).toEqual([]);
  expect(dismissTo).not.toHaveBeenCalled();
});

test.each(['random', 'expired board'])('%s completion never checks a piece or forces a return', async kind => {
  params = kind === 'random' ? {} : { ...params, boardSession: 'expired' };
  await act(async () => { root.update(tree(true)); });
  await wait(600);
  await solve();
  expect(context.board!.completedIds).toEqual([]);
  expect(dismissTo).not.toHaveBeenCalled();
});
