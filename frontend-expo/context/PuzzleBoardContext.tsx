import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { claimBoardReward } from '@/api/BoardReward';
import { useUnlockedThemes } from '@/hooks/useUnlockedThemes';

/** The Rated Puzzles board: nine puzzles mixed across the player's unlocked themes. */
export type PuzzleBoard = {
  id: string;
  status: 'loading' | 'ready' | 'error';
  /** The unlocked themes this board was drawn from. New unlocks apply from the next board. */
  themes: readonly string[];
  puzzleIds: string[];
  completedIds: string[];
  excludedIds: string[];
  /** Set once the reward for finishing this board has been paid; the next board is then drawn. */
  claimed?: boolean;
  error?: string;
};
type BoardContext = {
  board: PuzzleBoard | null;
  ensure: () => void;
  retry: () => void;
  /** Pays the reward for a finished board, then draws the next one. Rejects if the reward fails. */
  claim: () => Promise<void>;
  complete: (boardId: string, puzzleId: string) => boolean;
};
const PuzzleBoardContext = createContext<BoardContext | null>(null);
let nextBoardId = 0;

const BOARD_SIZE = 9;
export const boardStorageKey = (userId: string) => `ratedBoard:v1:${userId}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

/** Reads a saved board back, or null if it is missing or doesn't look like a board. */
function parseSavedBoard(raw: string | null): PuzzleBoard | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (typeof saved?.id !== 'string' || !isStringArray(saved.puzzleIds) || saved.puzzleIds.length !== BOARD_SIZE ||
      !isStringArray(saved.completedIds) || !saved.completedIds.every((id: string) => saved.puzzleIds.includes(id)) ||
      !isStringArray(saved.themes) || !isStringArray(saved.excludedIds)) return null;
    // Already paid out (the app closed before the next board arrived): draw a fresh board instead.
    if (saved.claimed === true) return null;
    return {
      id: saved.id, status: 'ready', themes: saved.themes, puzzleIds: saved.puzzleIds,
      completedIds: saved.completedIds, excludedIds: saved.excludedIds,
    };
  } catch {
    return null;
  }
}

// A ready board is saved on this device per account, so checkmarks survive an app restart.
// The root keys this provider by account, so switching accounts remounts it and reads that account's board.
export function PuzzleBoardProvider({ userId = null, children }: { userId?: string | null; children: React.ReactNode }) {
  const unlockedThemes = useUnlockedThemes();
  const unlocked = useRef(unlockedThemes);
  unlocked.current = unlockedThemes;
  const storageKey = userId ? boardStorageKey(userId) : null;
  const [board, setBoard] = useState<PuzzleBoard | null>(null);
  const current = useRef(board);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const publish = useCallback((next: PuzzleBoard) => {
    current.current = next;
    setBoard(next);
    if (storageKey && next.status === 'ready') {
      const { id, themes, puzzleIds, completedIds, excludedIds, claimed } = next;
      AsyncStorage.setItem(storageKey, JSON.stringify({ id, themes, puzzleIds, completedIds, excludedIds, claimed }))
        .catch(error => console.warn('Could not save the puzzle board:', error));
    }
  }, [storageKey]);
  // One read per mount. Screens call ensure() from their own effects, which run before ours, so both share this.
  const hydration = useRef<Promise<void> | null>(null);
  const hydrate = useCallback(() => {
    if (!hydration.current) {
      const read = storageKey ? AsyncStorage.getItem(storageKey).then(parseSavedBoard, () => null) : Promise.resolve(null);
      hydration.current = read.then(saved => {
        if (saved && mounted.current && !current.current) publish(saved);
      });
    }
    return hydration.current;
  }, [storageKey, publish]);
  useEffect(() => { void hydrate(); }, [hydrate]);
  const load = useCallback((themes: readonly string[], excludedIds: string[] = []) => {
    if (!mounted.current) return;
    const pending: PuzzleBoard = {
      id: `${Date.now()}-${++nextBoardId}`, status: 'loading', themes, puzzleIds: [], completedIds: [], excludedIds,
    };
    publish(pending);
    void fetchRandomPuzzleSet(themes, excludedIds).then(puzzleIds => {
      if (mounted.current && current.current === pending) publish({ ...pending, status: 'ready', puzzleIds });
    }).catch(error => {
      if (mounted.current && current.current === pending) {
        publish({ ...pending, status: 'error', error: error instanceof Error ? error.message : 'Could not load puzzles. Please try again.' });
      }
    });
  }, [publish]);
  const ensure = useCallback(() => {
    void hydrate().then(() => {
      if (!current.current) load(unlocked.current);
    });
  }, [hydrate, load]);
  const retry = useCallback(() => {
    const failed = current.current;
    if (failed?.status === 'error') load(failed.themes, failed.excludedIds);
  }, [load]);
  const claiming = useRef(false);
  const claim = useCallback(async () => {
    const finished = current.current;
    if (claiming.current || finished?.status !== 'ready' || finished.claimed ||
      finished.completedIds.length !== BOARD_SIZE) return;
    claiming.current = true;
    try {
      await claimBoardReward();
    } finally {
      claiming.current = false;
    }
    // Paid: never pay this board again, even if the app closes before the next board arrives.
    if (!mounted.current || current.current !== finished) return;
    publish({ ...finished, claimed: true });
    load(unlocked.current, finished.puzzleIds);
  }, [load, publish]);
  const complete = useCallback((boardId: string, puzzleId: string) => {
    const active = current.current;
    if (!mounted.current || active?.status !== 'ready' || active.id !== boardId ||
      !active.puzzleIds.includes(puzzleId) || active.completedIds.includes(puzzleId)) return false;
    publish({ ...active, completedIds: [...active.completedIds, puzzleId] });
    return true;
  }, [publish]);
  const value = useMemo(() => ({ board, ensure, retry, claim, complete }), [board, ensure, retry, claim, complete]);
  return <PuzzleBoardContext.Provider value={value}>{children}</PuzzleBoardContext.Provider>;
}

// Random practice puzzles (no board) also work outside the provider.
export const usePuzzleBoard = () => useContext(PuzzleBoardContext);
