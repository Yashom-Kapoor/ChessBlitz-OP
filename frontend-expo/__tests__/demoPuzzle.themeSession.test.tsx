import '@/test-utils/puzzleScreenMocks';
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Chess } from 'chess.js';
import DemoPuzzle from '@/app/puzzles/demo_puzzle';
import { ThemePuzzleSessionProvider, useThemePuzzleSessions } from '@/context/ThemePuzzleSessionContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { PUZZLES, fakeBoard, toSupabasePuzzle } from '@/test-utils/puzzleScreen';

jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
let root: ReactTestRenderer;
let context: NonNullable<ReturnType<typeof useThemePuzzleSessions>>;
const dismissTo = jest.fn();
let params: Record<string, string>;
function Capture() { context = useThemePuzzleSessions()!; return null; }
const tree = (play = false) => <ThemePuzzleSessionProvider><Capture />{play && <DemoPuzzle />}</ThemePuzzleSessionProvider>;
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
  await act(async () => { context.ensure('fork'); });
  params = { puzzle: fakeBoard.puzzle.puzzleid, theme: 'fork', themeSession: context.sessions.fork!.id };
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

test('only a solved puzzle checks its piece and returns to its category, while normal completion is still submitted', async () => {
  const supabase = jest.requireMock('@/api/SupabaseClient').supabase;
  jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'alice' } } });
  const submit = jest.spyOn(jest.requireMock('@/api/PostCompleted'), 'postCompletedPuzzle');
  await act(async () => { root.update(tree(true)); });
  await wait(600);
  const expected = fakeBoard.puzzle.moves.split(' ')[1];
  const wrong = new Chess(fakeBoard.game.fen()).moves({ verbose: true })
    .map(move => move.from + move.to + (move.promotion ?? '')).find(move => move !== expected)!;
  await act(async () => { fakeBoard.userMove(wrong); });
  await wait();
  expect(context.sessions.fork!.completedIds).toEqual([]);
  expect(dismissTo).not.toHaveBeenCalled();
  await solve();
  expect(context.sessions.fork!.completedIds).toEqual([fakeBoard.puzzle.puzzleid]);
  expect(dismissTo).toHaveBeenCalledTimes(1);
  expect(dismissTo).toHaveBeenCalledWith({ pathname: '/puzzles/themes/[theme]', params: { theme: 'fork', isTablet: 'false' } });
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ puzzleid: fakeBoard.puzzle.puzzleid, completed: true }));
  await wait();
  expect(dismissTo).toHaveBeenCalledTimes(1);
});

test('leaving an unfinished puzzle does not complete its piece', async () => {
  await act(async () => { root.update(tree(true)); });
  await wait(600);
  await act(async () => { root.update(tree(false)); });
  expect(context.sessions.fork!.completedIds).toEqual([]);
  expect(dismissTo).not.toHaveBeenCalled();
});

test.each(['practice', 'expired set'])('%s completion never checks a piece or forces a return', async kind => {
  params = kind === 'practice' ? {} : { ...params, themeSession: 'expired' };
  await act(async () => { root.update(tree(true)); });
  await wait(600);
  await solve();
  expect(context.sessions.fork!.completedIds).toEqual([]);
  expect(dismissTo).not.toHaveBeenCalled();
});
