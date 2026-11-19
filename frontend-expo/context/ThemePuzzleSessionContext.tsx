import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchRandomPuzzleSet } from '@/api/RandomPuzzleSet';
import { PUZZLE_THEMES } from '@/constants/PuzzleThemes';

export type ThemePuzzleSession = {
  id: string;
  status: 'loading' | 'ready' | 'error';
  puzzleIds: string[];
  completedIds: string[];
  excludedIds: string[];
  error?: string;
};
type Sessions = Partial<Record<string, ThemePuzzleSession>>;
type SessionContext = {
  sessions: Sessions;
  ensure: (theme: string) => void;
  retry: (theme: string) => void;
  reset: (theme: string) => void;
  complete: (theme: string, sessionId: string, puzzleId: string) => boolean;
};
const ThemePuzzleSessionContext = createContext<SessionContext | null>(null);
let nextSessionId = 0;

// Deliberately memory-only. The root keys this provider by account so logout also clears it.
export function ThemePuzzleSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Sessions>({});
  const current = useRef(sessions);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const publish = useCallback((theme: string, session: ThemePuzzleSession) => {
    current.current = { ...current.current, [theme]: session };
    setSessions(current.current);
  }, []);
  const load = useCallback((theme: string, excludedIds: string[] = []) => {
    if (!mounted.current || !PUZZLE_THEMES.some(item => item.key === theme)) return;
    const pending: ThemePuzzleSession = {
      id: `${Date.now()}-${++nextSessionId}`, status: 'loading', puzzleIds: [], completedIds: [], excludedIds,
    };
    publish(theme, pending);
    void fetchRandomPuzzleSet(theme, excludedIds).then(puzzleIds => {
      if (mounted.current && current.current[theme] === pending) {
        publish(theme, { ...pending, status: 'ready', puzzleIds });
      }
    }).catch(error => {
      if (mounted.current && current.current[theme] === pending) {
        publish(theme, { ...pending, status: 'error', error: error instanceof Error ? error.message : 'Could not load puzzles. Please try again.' });
      }
    });
  }, [publish]);
  const ensure = useCallback((theme: string) => {
    if (!current.current[theme]) load(theme);
  }, [load]);
  const retry = useCallback((theme: string) => {
    const session = current.current[theme];
    if (session?.status === 'error') load(theme, session.excludedIds);
  }, [load]);
  const reset = useCallback((theme: string) => {
    const session = current.current[theme];
    if (session?.status === 'ready' && session.completedIds.length === 9) load(theme, session.puzzleIds);
  }, [load]);
  const complete = useCallback((theme: string, sessionId: string, puzzleId: string) => {
    const session = current.current[theme];
    if (!mounted.current || session?.status !== 'ready' || session.id !== sessionId ||
      !session.puzzleIds.includes(puzzleId) || session.completedIds.includes(puzzleId)) return false;
    publish(theme, { ...session, completedIds: [...session.completedIds, puzzleId] });
    return true;
  }, [publish]);
  const value = useMemo(() => ({ sessions, ensure, retry, reset, complete }), [sessions, ensure, retry, reset, complete]);
  return <ThemePuzzleSessionContext.Provider value={value}>{children}</ThemePuzzleSessionContext.Provider>;
}

// Ordinary practice puzzles also work outside a theme session.
export const useThemePuzzleSessions = () => useContext(ThemePuzzleSessionContext);
