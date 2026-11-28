import '@/test-utils/puzzleScreenMocks';
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import DemoPuzzle from '@/app/puzzles/demo_puzzle';
import { PuzzleBoardProvider, usePuzzleBoard } from '@/context/PuzzleBoardContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { waitForPendingCompletion } from '@/utils/pendingCompletion';
import { PUZZLES, fakeBoard, toSupabasePuzzle } from '@/test-utils/puzzleScreen';

// Returning to the board refetches ratings straight away. That refetch has to wait for the save,
// even while the save is still looking up the signed-in user.
jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
let root: ReactTestRenderer;
let context: NonNullable<ReturnType<typeof usePuzzleBoard>>;
let params: Record<string, string>;
function Capture() { context = usePuzzleBoard()!; return null; }
const tree = (play = false) => <PuzzleBoardProvider><Capture />{play && <DemoPuzzle />}</PuzzleBoardProvider>;
const wait = async (ms = 1000) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
const settledFlag = (promise: Promise<unknown>) => {
  const flag = { done: false };
  void promise.then(() => { flag.done = true; });
  return flag;
};

beforeEach(async () => {
  jest.useFakeTimers();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  params = {};
  jest.spyOn(jest.requireMock('expo-router'), 'useLocalSearchParams').mockImplementation(() => params);
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

test('the reload started on return to the board waits for the whole save, including the user lookup', async () => {
  let finishLookup!: () => void;
  const supabase = jest.requireMock('@/api/SupabaseClient').supabase;
  jest.spyOn(supabase.auth, 'getUser').mockImplementation(() => new Promise(resolve => {
    finishLookup = () => resolve({ data: { user: { id: 'alice' } } });
  }));
  let finishPost!: () => void;
  jest.spyOn(jest.requireMock('@/api/PostCompleted'), 'postCompletedPuzzle')
    .mockImplementation(() => new Promise<void>(resolve => { finishPost = resolve; }));
  // The Puzzles tab regains focus as soon as dismissTo runs and starts its reload then.
  let reload: { done: boolean } | null = null;
  jest.spyOn(jest.requireMock('expo-router'), 'useRouter')
    .mockReturnValue({ dismissTo: () => { reload = settledFlag(waitForPendingCompletion(60000)); } });

  await act(async () => { root.update(tree(true)); });
  await wait(600);
  const moves = fakeBoard.puzzle.moves.split(' ');
  for (let i = 1; i < moves.length; i += 2) {
    await act(async () => { fakeBoard.userMove(moves[i]); });
    await wait();
  }

  expect(reload).not.toBeNull();
  expect(reload!.done).toBe(false);
  await act(async () => { finishLookup(); });
  expect(reload!.done).toBe(false);
  await act(async () => { finishPost(); });
  expect(reload!.done).toBe(true);
});
