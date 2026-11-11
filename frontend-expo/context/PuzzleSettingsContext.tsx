import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type OpponentSpeed = 'slow' | 'normal' | 'fast';

export type PuzzleSettings = {
  /** Show the board from the solver's side (flips it when you play black). */
  autoFlip: boolean;
  /** How quickly the opponent's replies are played. */
  opponentSpeed: OpponentSpeed;
  /** Haptic feedback on moves. */
  haptics: boolean;
  /** Show the elapsed-time clock under the board. */
  showTimer: boolean;
};

type PuzzleSettingsContextType = PuzzleSettings & {
  update: (changes: Partial<PuzzleSettings>) => void;
};

export const DEFAULT_PUZZLE_SETTINGS: PuzzleSettings = {
  autoFlip: true,
  opponentSpeed: 'normal',
  haptics: true,
  showTimer: true,
};

const SPEED_FACTORS: Record<OpponentSpeed, number> = { slow: 1.6, normal: 1, fast: 0.4 };

/** Scales an opponent-move delay (in ms) by the chosen speed. */
export const opponentDelay = (baseMs: number, speed: OpponentSpeed) =>
  Math.round(baseMs * SPEED_FACTORS[speed]);

const PuzzleSettingsContext = createContext<PuzzleSettingsContextType | undefined>(undefined);

// Settings live in memory for now, so they reset when the app restarts.
export const PuzzleSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PuzzleSettings>(DEFAULT_PUZZLE_SETTINGS);
  const update = useCallback((changes: Partial<PuzzleSettings>) => {
    setSettings((current) => ({ ...current, ...changes }));
  }, []);
  const value = useMemo(() => ({ ...settings, update }), [settings, update]);

  return <PuzzleSettingsContext.Provider value={value}>{children}</PuzzleSettingsContext.Provider>;
};

const fallback: PuzzleSettingsContextType = { ...DEFAULT_PUZZLE_SETTINGS, update: () => {} };

/** Falls back to the defaults outside a provider (e.g. in screen tests). */
export const usePuzzleSettings = () => useContext(PuzzleSettingsContext) ?? fallback;
