import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
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
  error?: string;
};
type BoardContext = {
  board: PuzzleBoard | null;
  ensure: () => void;
  retry: () => void;
  reset: () => void;
  complete: (boardId: string, puzzleId: string) => boolean;
};
const PuzzleBoardContext = createContext<BoardContext | null>(null);
let nextBoardId = 0;

// Deliberately memory-only. The root keys this provider by account so logout also clears it.
export function PuzzleBoardProvider({ children }: { children: React.ReactNode }) {
  const unlockedThemes = useUnlockedThemes();
  const unlocked = useRef(unlockedThemes);
  unlocked.current = unlockedThemes;
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
  }, []);
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
    if (!current.current) load(unlocked.current);
  }, [load]);
  const retry = useCallback(() => {
    const failed = current.current;
    if (failed?.status === 'error') load(failed.themes, failed.excludedIds);
  }, [load]);
  const reset = useCallback(() => {
    const finished = current.current;
    if (finished?.status === 'ready' && finished.completedIds.length === 9) load(unlocked.current, finished.puzzleIds);
  }, [load]);
  const complete = useCallback((boardId: string, puzzleId: string) => {
    const active = current.current;
    if (!mounted.current || active?.status !== 'ready' || active.id !== boardId ||
      !active.puzzleIds.includes(puzzleId) || active.completedIds.includes(puzzleId)) return false;
    publish({ ...active, completedIds: [...active.completedIds, puzzleId] });
    return true;
  }, [publish]);
  const value = useMemo(() => ({ board, ensure, retry, reset, complete }), [board, ensure, retry, reset, complete]);
  return <PuzzleBoardContext.Provider value={value}>{children}</PuzzleBoardContext.Provider>;
}

// Random practice puzzles (no board) also work outside the provider.
export const usePuzzleBoard = () => useContext(PuzzleBoardContext);
