import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { boardStorageKey, PuzzleBoardProvider, usePuzzleBoard } from '../PuzzleBoardContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { claimBoardReward } from '@/api/BoardReward';
import { useUnlockedThemes } from '@/hooks/useUnlockedThemes';
import { DEFAULT_UNLOCKED_THEMES } from '@/constants/PuzzleThemes';

jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
jest.mock('@/api/BoardReward', () => ({ claimBoardReward: jest.fn() }));
jest.mock('@/hooks/useUnlockedThemes', () => ({ useUnlockedThemes: jest.fn() }));
let root: ReactTestRenderer;
let context: NonNullable<ReturnType<typeof usePuzzleBoard>>;
function Consumer() { context = usePuzzleBoard()!; return null; }
const render = (key = 'alice', visible = true) => <PuzzleBoardProvider key={key} userId={key}>{visible && <Consumer />}</PuzzleBoardProvider>;
let draw = 0;
const ids = () => { draw += 1; return Array.from({ length: 9 }, (_, i) => `draw${draw}-${i}`); };
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  await AsyncStorage.clear();
  draw = 0;
  (useUnlockedThemes as jest.Mock).mockReturnValue(DEFAULT_UNLOCKED_THEMES);
  (fetchRandomPuzzleSet as jest.Mock).mockImplementation(async () => ids());
  (claimBoardReward as jest.Mock).mockResolvedValue(1000);
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
  await act(async () => { await context.claim(); });
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(['fork', 'pin', 'skewer'], first.puzzleIds);
  expect(context.board!.themes).toEqual(['fork', 'pin', 'skewer']);
});

test('completion must belong to the current board and claiming waits for all nine', async () => {
  await act(async () => { context.ensure(); });
  const first = context.board!;
  await act(async () => {
    expect(context.complete('stale-board', first.puzzleIds[0])).toBe(false);
    expect(context.complete(first.id, 'not-on-board')).toBe(false);
    expect(context.complete(first.id, first.puzzleIds[0])).toBe(true);
    expect(context.complete(first.id, first.puzzleIds[0])).toBe(false);
    await context.claim();
  });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  expect(claimBoardReward).not.toHaveBeenCalled();
  await act(async () => { first.puzzleIds.slice(1).forEach(id => context.complete(first.id, id)); });
  expect(context.board!.completedIds).toHaveLength(9);
  await act(async () => { await Promise.all([context.claim(), context.claim()]); });
  expect(claimBoardReward).toHaveBeenCalledTimes(1);
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

const remount = async (key = 'alice') => {
  await act(async () => root.unmount());
  await act(async () => { root = create(render(key)); });
};

test('checkmarks survive an app restart without drawing a new board', async () => {
  await act(async () => { context.ensure(); });
  const board = context.board!;
  await act(async () => { context.complete(board.id, board.puzzleIds[0]); context.complete(board.id, board.puzzleIds[4]); });
  await remount();
  expect(context.board).toMatchObject({ id: board.id, status: 'ready', puzzleIds: board.puzzleIds,
    completedIds: [board.puzzleIds[0], board.puzzleIds[4]] });
  await act(async () => { context.ensure(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  await act(async () => { expect(context.complete(board.id, board.puzzleIds[1])).toBe(true); });
});

test('ensure() before the saved board is read does not draw a new one', async () => {
  await act(async () => { context.ensure(); });
  const board = context.board!;
  await act(async () => root.unmount());
  await act(async () => { root = create(render()); context.ensure(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  expect(context.board!.puzzleIds).toEqual(board.puzzleIds);
});

test('a new board after all nine replaces the saved one', async () => {
  await act(async () => { context.ensure(); });
  const first = context.board!;
  await act(async () => { first.puzzleIds.forEach(id => context.complete(first.id, id)); });
  await act(async () => { await context.claim(); });
  const second = context.board!;
  await remount();
  expect(context.board).toMatchObject({ id: second.id, puzzleIds: second.puzzleIds, completedIds: [] });
});

test('each account only sees its own saved board', async () => {
  await act(async () => { context.ensure(); });
  const alice = context.board!;
  await act(async () => { context.complete(alice.id, alice.puzzleIds[0]); });
  await remount('bob');
  expect(context.board).toBeNull();
  await act(async () => { context.ensure(); });
  expect(context.board!.puzzleIds).not.toEqual(alice.puzzleIds);
  await remount('alice');
  expect(context.board).toMatchObject({ id: alice.id, completedIds: [alice.puzzleIds[0]] });
});

test('a failed claim pays nothing and leaves the finished board to try again', async () => {
  await act(async () => { context.ensure(); });
  const first = context.board!;
  await act(async () => { first.puzzleIds.forEach(id => context.complete(first.id, id)); });
  (claimBoardReward as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(context.claim()).rejects.toThrow('offline'); });
  expect(context.board).toMatchObject({ id: first.id, completedIds: first.puzzleIds });
  expect(context.board!.claimed).toBeUndefined();
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  await act(async () => { await context.claim(); });
  expect(claimBoardReward).toHaveBeenCalledTimes(2);
  expect(context.board!.id).not.toBe(first.id);
});

test('a board already paid out before a restart is not restored, so it cannot be claimed twice', async () => {
  await act(async () => root.unmount());
  const puzzleIds = Array.from({ length: 9 }, (_, i) => `paid-${i}`);
  await AsyncStorage.setItem(boardStorageKey('alice'), JSON.stringify({
    id: 'paid', themes: ['fork'], puzzleIds, completedIds: puzzleIds, excludedIds: [], claimed: true,
  }));
  await act(async () => { root = create(render()); });
  await act(async () => { context.ensure(); });
  expect(context.board!.id).not.toBe('paid');
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
});

test('a corrupt saved board is ignored and a fresh one is drawn', async () => {
  await act(async () => root.unmount());
  await AsyncStorage.setItem(boardStorageKey('alice'), '{not json');
  await act(async () => { root = create(render()); });
  expect(context.board).toBeNull();
  await act(async () => { context.ensure(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  expect(context.board!.status).toBe('ready');
});

test('a failed next board after claiming retries with the same themes and exclusions and cannot mark old pieces', async () => {
  await act(async () => { context.ensure(); });
  const first = context.board!;
  await act(async () => { first.puzzleIds.forEach(id => context.complete(first.id, id)); });
  (fetchRandomPuzzleSet as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await context.claim(); });
  expect(context.board!.status).toBe('error');
  expect(context.board!.error).toBe('offline');
  expect(context.complete(first.id, first.puzzleIds[0])).toBe(false);
  await act(async () => { context.retry(); context.retry(); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(3);
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith(DEFAULT_UNLOCKED_THEMES, first.puzzleIds);
  expect(context.board!.status).toBe('ready');
});
