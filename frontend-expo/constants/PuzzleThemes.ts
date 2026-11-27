// Keys match the existing Lichess tags and Ratings columns.
export const PUZZLE_THEMES = [
  { title: 'Fork', key: 'fork', color: '#FF6B4A', description: 'Attack two or more pieces with a single move.' },
  { title: 'Pin', key: 'pin', color: '#14B89A', description: 'Hold a piece in place by threatening something behind it.' },
  { title: 'Promotion', key: 'promotion', color: '#FFB020', description: 'Reach the last rank and turn a pawn into a stronger piece.' },
  { title: 'Skewer', key: 'skewer', color: '#FF8A1F', description: 'Force a valuable piece to move and expose the piece behind it.' },
  { title: 'Back Rank', key: 'backRankMate', color: '#4C6EF5', description: 'Checkmate a king trapped behind its own pawns.' },
  { title: 'Discovered Attack', key: 'discoveredAttack', color: '#2D9CFF', description: 'Move one piece to reveal an attack from another.' },
  { title: 'Trapped Piece', key: 'trappedPiece', color: '#9B5DE5', description: 'Win a piece that has no safe square to escape to.' },
  { title: 'Removing Defender', key: 'capturingDefender', color: '#FF4D8D', description: 'Remove a defending piece to make another target vulnerable.' },
  { title: 'Smothered Mate', key: 'smotheredMate', color: '#00B377', description: 'Deliver checkmate with a knight when the king is boxed in.' },
  { title: 'Zugzwang', key: 'zugzwang', color: '#00A3E0', description: 'Find a position where every move makes the opponent worse off.' },
] as const;

export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

export const PUZZLE_THEME_TEXT_COLOR = '#FFFFFF';

/**
 * Themes a player can get on the Rated Puzzles board. Unlocking isn't designed yet, so everything
 * starts unlocked; `useUnlockedThemes` is the one place that will read real unlock data later.
 */
export const DEFAULT_UNLOCKED_THEMES: readonly string[] = PUZZLE_THEMES.map(theme => theme.key);

const channels = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
const toHex = (values: number[]) =>
  `#${values.map(value => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** Moves a color toward its own gray by `amount` (0 = unchanged, 1 = fully gray). */
export function desaturate(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return toHex([r, g, b].map(value => value + (gray - value) * amount));
}

/** A darker shade of the same color, for the chunky bottom edge on rating rows. */
export function darken(hex: string, amount: number): string {
  return toHex(channels(hex).map(value => value * (1 - amount)));
}
