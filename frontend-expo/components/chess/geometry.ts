import type { Square } from 'chess.js';

/** Which side sits at the bottom of the board. */
export type Orientation = 'w' | 'b';

export const FILES = 'abcdefgh';

/**
 * Screen column/row (0-7, top-left origin) for a square. The board is never mirrored with a
 * transform; orientation is applied here instead, so touch coordinates and piece artwork stay
 * upright and correct for both sides.
 *
 * Marked as worklets so gesture callbacks can call them on the UI thread.
 */
export function squareToColRow(square: string, orientation: Orientation) {
    'worklet';
    const file = square.charCodeAt(0) - 97; // a = 0
    const rank = Number(square[1]); // 1-8
    return orientation === 'w'
        ? { col: file, row: 8 - rank }
        : { col: 7 - file, row: rank - 1 };
}

export function colRowToSquare(col: number, row: number, orientation: Orientation): Square {
    'worklet';
    const file = orientation === 'w' ? col : 7 - col;
    const rank = orientation === 'w' ? 8 - row : row + 1;
    return `${'abcdefgh'[file]}${rank}` as Square;
}

/** Top-left pixel position of a square on a board `size` pixels wide. */
export function squareToXY(square: string, orientation: Orientation, size: number) {
    'worklet';
    const cell = size / 8;
    const { col, row } = squareToColRow(square, orientation);
    return { x: col * cell, y: row * cell };
}

/** The square under a point on the board, or null if the point is off the board. */
export function xyToSquare(x: number, y: number, orientation: Orientation, size: number): Square | null {
    'worklet';
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    const cell = size / 8;
    return colRowToSquare(Math.floor(x / cell), Math.floor(y / cell), orientation);
}

export function isDarkSquare(square: string) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    return (file + rank) % 2 === 0; // a1 is dark
}
