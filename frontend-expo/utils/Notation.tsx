import { Chess } from 'chess.js';

/**
 * Takes two FEN strings and returns the move made between them in algebraic notation (e.g., "e2e4").
 * If no move was made or something is invalid, returns null.
 *
 * @param {string} fenBefore - FEN string before the move.
 * @param {string} fenAfter - FEN string after the move.
 * @returns {string | null} - The move made in 'from-to' algebraic notation (e.g., "e2e4"), or null.
 */
export function detectMoveFromFEN(fenBefore: string | null, fenAfter: string | null): string | null {
  try {
    if (!fenBefore || !fenAfter) {
      console.error('FEN strings cannot be null');
      return null;
    }

    // Validate the "before" FEN by attempting to load it
    const chess = new Chess();
    chess.load(fenBefore);

    // Generate all possible moves from the "before" state
    const moves = chess.moves({ verbose: true });

    // Compare each move's resulting FEN with the "after" FEN
    for (const move of moves) {
      const testChess = new Chess(fenBefore);
      testChess.move(move);

      if (testChess.fen() === fenAfter) {
        return move.from + move.to + (move.promotion ? move.promotion : '');
      }
    }
  } catch (error) {
    console.error('Error detecting move from FEN:', error);
  }

  return null;
}

/**
 * Determines whose turn it is based on the given FEN string.
 * @param {string} fen - The FEN string representing the board state.
 * @returns {string | null} - Returns "white" if it's white's turn, "black" if it's black's turn, or null if the FEN is invalid.
 */
export function getTurnFromFEN(fen: string | null): string | null {
  try {
    if (!fen) {
      return null;
    }

    // Split the FEN string into its components
    const fenParts = fen.split(' ');
    if (fenParts.length < 2) {
      console.error('Invalid FEN string format');
      return null;
    }

    // The second part of the FEN string indicates the active player ("w" or "b")
    const activePlayer = fenParts[1];
    if (activePlayer === 'w') {
      return 'white';
    } else if (activePlayer === 'b') {
      return 'black';
    } else {
      console.error('Invalid active player in FEN string');
      return null;
    }
  } catch (error) {
    console.error('Error determining turn from FEN:', error);
    return null;
  }
}