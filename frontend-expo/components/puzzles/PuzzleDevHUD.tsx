import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { SHOW_SOLUTION_HUD } from '@/constants/hints';

/**
 * The puzzle solution/id readout, shown only in development.
 *
 * This used to be hardcoded and always visible in both `app/puzzles/demo_puzzle.tsx` and
 * `components/puzzles/LessonPuzzle.tsx` — a permanent solution spoiler shipping to users.
 * It is now behind `__DEV__` AND the `SHOW_SOLUTION_HUD` debug flag (constants/hints.ts, off by
 * default), so it never reaches a release build and dev builds only show it when asked.
 */
export default function PuzzleDevHUD({
  puzzleId,
  bestMove,
}: {
  puzzleId?: string;
  bestMove?: string;
}) {
  const { theme } = useTheme();

  if (!__DEV__ || !SHOW_SOLUTION_HUD) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 55,
        right: 5,
        zIndex: 1000,
        alignItems: 'flex-end',
      }}
    >
      <Text style={{ color: theme.primaryText, textAlign: 'right' }}>
        {`BEST: ${bestMove ?? '...'}`}
        {puzzleId ? `\nID: ${puzzleId}` : ''}
      </Text>
    </View>
  );
}
