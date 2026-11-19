import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { ThemePuzzleSessionProvider, useThemePuzzleSessions } from '../ThemePuzzleSessionContext';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';

jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));
let root: ReactTestRenderer;
let context: NonNullable<ReturnType<typeof useThemePuzzleSessions>>;
function Consumer() { context = useThemePuzzleSessions()!; return null; }
const render = (key = 'alice', visible = true) => <ThemePuzzleSessionProvider key={key}>{visible && <Consumer />}</ThemePuzzleSessionProvider>;
const ids = (theme: string) => Array.from({ length: 9 }, (_, i) => `${theme}-${i}`);
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  (fetchRandomPuzzleSet as jest.Mock).mockImplementation(async theme => ids(theme));
  await act(async () => { root = create(render()); });
});
afterEach(async () => { await act(async () => root.unmount()); });

test('one draw per theme survives navigation and keeps each theme separate', async () => {
  await act(async () => { context.ensure('fork'); context.ensure('fork'); context.ensure('pin'); });
  const fork = context.sessions.fork!;
  await act(async () => { context.complete('fork', fork.id, fork.puzzleIds[2]); root.update(render('alice', false)); });
  await act(async () => { root.update(render()); });
  await act(async () => { context.ensure('fork'); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(2);
  expect(context.sessions.fork!.puzzleIds).toEqual(ids('fork'));
  expect(context.sessions.fork!.completedIds).toEqual(['fork-2']);
  expect(context.sessions.pin!.completedIds).toEqual([]);
});

test('completion must belong to the current set and reset waits for all nine', async () => {
  await act(async () => { context.ensure('fork'); });
  const first = context.sessions.fork!;
  await act(async () => {
    expect(context.complete('fork', 'stale-session', 'fork-0')).toBe(false);
    expect(context.complete('fork', first.id, 'pin-0')).toBe(false);
    expect(context.complete('fork', first.id, 'fork-0')).toBe(true);
    expect(context.complete('fork', first.id, 'fork-0')).toBe(false);
    context.reset('fork');
  });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  await act(async () => { first.puzzleIds.slice(1).forEach(id => context.complete('fork', first.id, id)); });
  expect(context.sessions.fork!.completedIds).toHaveLength(9);
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(1);
  await act(async () => { context.reset('fork'); context.reset('fork'); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(2);
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith('fork', first.puzzleIds);
  expect(context.sessions.fork!.completedIds).toEqual([]);
  expect(context.complete('fork', first.id, 'fork-0')).toBe(false);
});

test('account changes discard selections and ignore requests and completions from the old account', async () => {
  let finish!: (ids: string[]) => void;
  (fetchRandomPuzzleSet as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => { context.ensure('fork'); });
  const previous = context;
  await act(async () => { root.update(render('bob')); });
  await act(async () => { context.ensure('pin'); });
  await act(async () => { finish(ids('fork')); });
  expect(context.sessions.fork).toBeUndefined();
  expect(previous.complete('fork', previous.sessions.fork!.id, 'fork-0')).toBe(false);
  await act(async () => { context.ensure('pin'); });
  expect(context.sessions.pin!.puzzleIds).toEqual(ids('pin'));
});

test('a new app mount starts empty; nothing is persisted', async () => {
  await act(async () => { context.ensure('fork'); });
  await act(async () => { context.complete('fork', context.sessions.fork!.id, 'fork-0'); root.unmount(); });
  await act(async () => { root = create(render()); });
  expect(context.sessions).toEqual({});
});

test('failed reset retries with the same exclusions and cannot mark old pieces', async () => {
  await act(async () => { context.ensure('fork'); });
  const first = context.sessions.fork!;
  await act(async () => { first.puzzleIds.forEach(id => context.complete('fork', first.id, id)); });
  (fetchRandomPuzzleSet as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { context.reset('fork'); });
  expect(context.sessions.fork!.status).toBe('error');
  expect(context.complete('fork', first.id, 'fork-0')).toBe(false);
  await act(async () => { context.retry('fork'); context.retry('fork'); });
  expect(fetchRandomPuzzleSet).toHaveBeenCalledTimes(3);
  expect(fetchRandomPuzzleSet).toHaveBeenLastCalledWith('fork', first.puzzleIds);
  expect(context.sessions.fork!.status).toBe('ready');
});
