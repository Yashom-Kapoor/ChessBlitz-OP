import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { PuzzleBoardProvider, usePuzzleBoard } from '../PuzzleBoardContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { useUnlockedThemes } from '@/hooks/useUnlockedThemes';
import { DEFAULT_UNLOCKED_THEMES } from '@/constants/PuzzleThemes';

jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
jest.mock('@/hooks/useUnlockedThemes', () => ({ useUnlockedThemes: jest.fn() }));
let root: ReactTestRenderer;
let context: NonNullable<ReturnType<typeof usePuzzleBoard>>;
function Consumer() { context = usePuzzleBoard()!; return null; }
const render = (key = 'alice', visible = true) => <PuzzleBoardProvider key={key}>{visible && <Consumer />}</PuzzleBoardProvider>;
let draw = 0;
const ids = () => { draw += 1; return Array.from({ length: 9 }, (_, i) => `draw${draw}-${i}`); };
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  draw = 0;
  (useUnlockedThemes as jest.Mock).mockReturnValue(DEFAULT_UNLOCKED_THEMES);
  (fetchRandomPuzzleSet as jest.Mock).mockImplementation(async () => ids());
  await act(async () => { root = create(render()); });
});
afterEach(async () => { await act(async () => root.unmount()); });

test('every unlocked theme is used by default and one draw survives navigation', async () => {
  expect(DEFAULT_UNLOCKED_THEMES).toHaveLength(10);
  await act(async () => { context.ensure(); context.ensure(); });
  const board = context.board!;
  expect(fetchRandomPuzzleSet).toHaveBeenCalledWith(DEFAULT_UNLOCKED_THEMES, []);
  await act(async () => { context.complete(board.id, board.puzzleIds[2]); root.update(render('alice', false)); });
  await act(async () => { root.update(render()); });
  await act(async () => { context.ensure(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  expect(context.board!.completedIds).toEqual([board.puzzleIds[2]]);
});

test('the board draws only from unlocked themes, and new unlocks apply from the next board', async () => {
  (useUnlockedThemes as jest.Mock).mockReturnValue(['fork', 'pin']);
  await act(async () => { root.update(render()); });
  await act(async () => { context.ensure(); });
  const first = context.board!;
  expect(first.themes).toEqual(['fork', 'pin']);
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(['fork', 'pin'], []);

  (useUnlockedThemes as jest.Mock).mockReturnValue(['fork', 'pin', 'skewer']);
  await act(async () => { root.update(render()); });
  expect(context.board!.themes).toEqual(['fork', 'pin']);
  await act(async () => { first.puzzleIds.forEach(id => context.complete(first.id, id)); });
  await act(async () => { context.reset(); });
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(['fork', 'pin', 'skewer'], first.puzzleIds);
  expect(context.board!.themes).toEqual(['fork', 'pin', 'skewer']);
});

test('completion must belong to the current board and reset waits for all nine', async () => {
  await act(async () => { context.ensure(); });
  const first = context.board!;
  await act(async () => {
    expect(context.complete('stale-board', first.puzzleIds[0])).toBe(false);
    expect(context.complete(first.id, 'not-on-board')).toBe(false);
    expect(context.complete(first.id, first.puzzleIds[0])).toBe(true);
    expect(context.complete(first.id, first.puzzleIds[0])).toBe(false);
    context.reset();
  });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  await act(async () => { first.puzzleIds.slice(1).forEach(id => context.complete(first.id, id)); });
  expect(context.board!.completedIds).toHaveLength(9);
  await act(async () => { context.reset(); context.reset(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(2);
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(DEFAULT_UNLOCKED_THEMES, first.puzzleIds);
  expect(context.board!.completedIds).toEqual([]);
  expect(context.complete(first.id, first.puzzleIds[0])).toBe(false);
});

test('account changes discard the board and ignore requests and completions from the old account', async () => {
  let finish!: (ids: string[]) => void;
  (fetchRandomPuzzleSet as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => { context.ensure(); });
  const previous = context;
  await act(async () => { root.update(render('bob')); });
  expect(context.board).toBeNull();
  await act(async () => { finish(['old-0', 'old-1', 'old-2', 'old-3', 'old-4', 'old-5', 'old-6', 'old-7', 'old-8']); });
  expect(context.board).toBeNull();
  expect(previous.complete(previous.board!.id, 'old-0')).toBe(false);
  await act(async () => { context.ensure(); });
  expect(context.board!.status).toBe('ready');
});

test('a new app mount starts empty; nothing is persisted', async () => {
  await act(async () => { context.ensure(); });
  await act(async () => { context.complete(context.board!.id, context.board!.puzzleIds[0]); root.unmount(); });
  await act(async () => { root = create(render()); });
  expect(context.board).toBeNull();
});

test('failed reset retries with the same themes and exclusions and cannot mark old pieces', async () => {
  await act(async () => { context.ensure(); });
  const first = context.board!;
  await act(async () => { first.puzzleIds.forEach(id => context.complete(first.id, id)); });
  (fetchRandomPuzzleSet as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { context.reset(); });
  expect(context.board!.status).toBe('error');
  expect(context.board!.error).toBe('offline');
  expect(context.complete(first.id, first.puzzleIds[0])).toBe(false);
  await act(async () => { context.retry(); context.retry(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(3);
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(DEFAULT_UNLOCKED_THEMES, first.puzzleIds);
  expect(context.board!.status).toBe('ready');
});
