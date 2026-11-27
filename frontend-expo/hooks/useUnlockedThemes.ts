import { DEFAULT_UNLOCKED_THEMES } from '@/constants/PuzzleThemes';

/**
 * The puzzle themes this player has unlocked. The Rated Puzzles board only draws from these, and
 * locked themes show as washed-out rows in Puzzle Ratings.
 *
 * Unlocking isn't designed yet, so every theme is unlocked. When it is, read the player's unlocks
 * here (keep returning a stable array reference) and nothing else has to change.
 */
export function useUnlockedThemes(): readonly string[] {
  return DEFAULT_UNLOCKED_THEMES;
}
