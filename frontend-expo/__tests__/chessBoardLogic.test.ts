import { describe, expect, it } from '@jest/globals';
import { Chess } from 'chess.js';
import { colRowToSquare, squareToColRow, squareToXY, xyToSquare } from '@/components/chess/geometry';
import { BoardPiece, checkedKingSquare, legalMovesFrom, needsPromotion, reconcilePieces } from '@/components/chess/logic';

describe('board geometry', () => {
    const size = 800; // 100px squares

    it('puts a1 bottom-left for white and top-right for black', () => {
        expect(squareToXY('a1', 'w', size)).toEqual({ x: 0, y: 700 });
        expect(squareToXY('a1', 'b', size)).toEqual({ x: 700, y: 0 });
        expect(squareToXY('h8', 'w', size)).toEqual({ x: 700, y: 0 });
        expect(squareToXY('h8', 'b', size)).toEqual({ x: 0, y: 700 });
    });

    it('maps touches back to the same square in both orientations', () => {
        for (const orientation of ['w', 'b'] as const) {
            for (let col = 0; col < 8; col++) {
                for (let row = 0; row < 8; row++) {
                    const square = colRowToSquare(col, row, orientation);
                    expect(squareToColRow(square, orientation)).toEqual({ col, row });
                    const { x, y } = squareToXY(square, orientation, size);
                    expect(xyToSquare(x + 50, y + 50, orientation, size)).toBe(square);
                }
            }
        }
    });

    it('a touch on the bottom-left is the player\'s own corner', () => {
        expect(xyToSquare(10, 790, 'w', size)).toBe('a1');
        expect(xyToSquare(10, 790, 'b', size)).toBe('h8');
    });

    it('returns null off the board', () => {
        expect(xyToSquare(-1, 10, 'w', size)).toBeNull();
        expect(xyToSquare(10, 800, 'w', size)).toBeNull();
    });
});

describe('piece reconciliation', () => {
    const idOn = (pieces: BoardPiece[], square: string) => pieces.find((p) => p.square === square)?.id;

    it('keeps the moving piece\'s id and drops the captured piece', () => {
        const chess = new Chess('4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1');
        const before = reconcilePieces([], chess);
        const knight = idOn(before, 'e4');
        const pawn = idOn(before, 'd5');
        chess.move({ from: 'e4', to: 'c5' });
        chess.move({ from: 'e8', to: 'e7' });
        const mid = reconcilePieces(before, chess);
        expect(idOn(mid, 'c5')).toBe(knight);
        expect(idOn(mid, 'd5')).toBe(pawn);

        const capture = new Chess('4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1');
        capture.move({ from: 'e4', to: 'f6' });
        capture.move({ from: 'e8', to: 'f7' });
        capture.move({ from: 'f6', to: 'd5' });
        const afterCapture = reconcilePieces(before, capture);
        expect(idOn(afterCapture, 'd5')).toBe(knight);
        expect(afterCapture.map((p) => p.id)).not.toContain(pawn);
    });

    it('moves both king and rook when castling', () => {
        const chess = new Chess('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
        const before = reconcilePieces([], chess);
        const king = idOn(before, 'e1');
        const rook = idOn(before, 'h1');
        chess.move('O-O');
        const after = reconcilePieces(before, chess);
        expect(idOn(after, 'g1')).toBe(king);
        expect(idOn(after, 'f1')).toBe(rook);
    });

    it('removes the pawn taken en passant', () => {
        const chess = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
        const before = reconcilePieces([], chess);
        const whitePawn = idOn(before, 'e5');
        chess.move({ from: 'e5', to: 'd6' });
        const after = reconcilePieces(before, chess);
        expect(idOn(after, 'd6')).toBe(whitePawn);
        expect(idOn(after, 'd5')).toBeUndefined();
        expect(after).toHaveLength(3);
    });

    it('keeps the id of a pawn that promotes, with its new type', () => {
        const chess = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
        const before = reconcilePieces([], chess);
        const pawn = idOn(before, 'a7');
        expect(needsPromotion(legalMovesFrom(chess, 'a7'), 'a8')).toBe(true);
        chess.move({ from: 'a7', to: 'a8', promotion: 'n' });
        const after = reconcilePieces(before, chess);
        expect(after.find((p) => p.square === 'a8')).toEqual({ id: pawn, code: 'wn', square: 'a8' });
    });

    it('slides a piece back on undo/reset', () => {
        const start = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
        const chess = new Chess(start);
        const before = reconcilePieces([], chess);
        const pawn = idOn(before, 'e2');
        chess.move({ from: 'e2', to: 'e4' });
        const moved = reconcilePieces(before, chess);
        chess.load(start);
        expect(idOn(reconcilePieces(moved, chess), 'e2')).toBe(pawn);
    });
});

describe('check detection', () => {
    it('finds the checked king of the side to move', () => {
        expect(checkedKingSquare(new Chess('4k3/8/8/8/8/8/8/4K2r w - - 0 1'))).toBe('e1');
        expect(checkedKingSquare(new Chess())).toBeNull();
    });
});
