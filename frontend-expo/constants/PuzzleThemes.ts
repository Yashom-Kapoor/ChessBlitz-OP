// Keys match the existing Lichess tags and Ratings columns.
export const PUZZLE_THEMES = [
  { title: 'Fork', key: 'fork', color: '#E76F51', description: 'Attack two or more pieces with a single move.' },
  { title: 'Pin', key: 'pin', color: '#2A9D8F', description: 'Hold a piece in place by threatening something behind it.' },
  { title: 'Promotion', key: 'promotion', color: '#E9C46A', description: 'Reach the last rank and turn a pawn into a stronger piece.' },
  { title: 'Skewer', key: 'skewer', color: '#F4A261', description: 'Force a valuable piece to move and expose the piece behind it.' },
  { title: 'Back Rank', key: 'backRankMate', color: '#264653', description: 'Checkmate a king trapped behind its own pawns.' },
  { title: 'Discovered Attack', key: 'discoveredAttack', color: '#3A86FF', description: 'Move one piece to reveal an attack from another.' },
  { title: 'Trapped Piece', key: 'trappedPiece', color: '#6C757D', description: 'Win a piece that has no safe square to escape to.' },
  { title: 'Removing Defender', key: 'capturingDefender', color: '#EF476F', description: 'Remove a defending piece to make another target vulnerable.' },
  { title: 'Smothered Mate', key: 'smotheredMate', color: '#8D99AE', description: 'Deliver checkmate with a knight when the king is boxed in.' },
  { title: 'Zugzwang', key: 'zugzwang', color: '#118AB2', description: 'Find a position where every move makes the opponent worse off.' },
] as const;

export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

export const PUZZLE_THEME_TEXT_COLOR = '#FFFFFF';
