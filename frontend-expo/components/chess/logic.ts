import type { Chess, Move, Square } from 'chess.js';

export type PieceCode = `${'w' | 'b'}${'p' | 'n' | 'b' | 'r' | 'q' | 'k'}`;

/** A piece on the board with an id that survives moves, so it can animate between squares. */
export type BoardPiece = {
    id: string;
    code: PieceCode;
    square: Square;
};

/** Same shape the old react-native-chessboard reported, so existing onMove handlers keep working. */
export type ChessboardState = {
    in_check: boolean;
    in_checkmate: boolean;
    in_draw: boolean;
    in_stalemate: boolean;
    in_threefold_repetition: boolean;
    insufficient_material: boolean;
    game_over: boolean;
    fen: string;
};

export type ChessMoveInfo = {
    move: Move;
    state: ChessboardState & { in_promotion: boolean };
};

export function getChessboardState(chess: Chess): ChessboardState {
    return {
        in_check: chess.isCheck(),
        in_checkmate: chess.isCheckmate(),
        in_draw: chess.isDraw(),
        in_stalemate: chess.isStalemate(),
        in_threefold_repetition: chess.isThreefoldRepetition(),
        insufficient_material: chess.isInsufficientMaterial(),
        game_over: chess.isGameOver(),
        fen: chess.fen(),
    };
}

function boardEntries(chess: Chess): { code: PieceCode; square: Square }[] {
    const entries: { code: PieceCode; square: Square }[] = [];
    for (const row of chess.board()) {
        for (const cell of row) {
            if (cell) entries.push({ code: `${cell.color}${cell.type}` as PieceCode, square: cell.square });
        }
    }
    return entries;
}

function distance(a: Square, b: Square) {
    return Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));
}

let nextId = 0;
const newId = () => `p${nextId++}`;

/**
 * Builds the piece list for the board's current position, reusing ids from `previous` wherever a
 * piece plausibly stayed or moved. That's what makes moves, undos and resets animate:
 *   1. same piece on the same square keeps its id;
 *   2. otherwise the nearest unmatched piece of the same colour and type (a normal move, or a
 *      piece sliding back on undo);
 *   3. otherwise the nearest unmatched piece of the same colour (a pawn that promoted).
 * Anything left over is new (fresh id) or gone (captured).
 */
export function reconcilePieces(previous: BoardPiece[], chess: Chess): BoardPiece[] {
    const entries = boardEntries(chess);
    const unmatched = new Set(previous);
    const result: (BoardPiece | null)[] = entries.map(() => null);

    const claim = (index: number, candidate: BoardPiece) => {
        unmatched.delete(candidate);
        result[index] = { id: candidate.id, code: entries[index].code, square: entries[index].square };
    };

    entries.forEach((entry, index) => {
        const same = [...unmatched].find((p) => p.code === entry.code && p.square === entry.square);
        if (same) claim(index, same);
    });

    const nearest = (index: number, match: (p: BoardPiece) => boolean) => {
        const square = entries[index].square;
        let best: BoardPiece | null = null;
        for (const p of unmatched) {
            if (match(p) && (!best || distance(p.square, square) < distance(best.square, square))) best = p;
        }
        if (best) claim(index, best);
    };

    entries.forEach((entry, index) => {
        if (!result[index]) nearest(index, (p) => p.code === entry.code);
    });
    entries.forEach((entry, index) => {
        if (!result[index]) nearest(index, (p) => p.code[0] === entry.code[0]);
    });

    return entries.map((entry, index) => result[index] ?? { id: newId(), code: entry.code, square: entry.square });
}

/** Legal moves for the piece on `square` (empty if it isn't that side's turn). */
export function legalMovesFrom(chess: Chess, square: Square): Move[] {
    return chess.moves({ square, verbose: true }) as Move[];
}

/** The king square of the side to move, if it is in check. */
export function checkedKingSquare(chess: Chess): Square | null {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
        for (const cell of row) {
            if (cell && cell.type === 'k' && cell.color === turn) return cell.square;
        }
    }
    return null;
}

/** Whether moving from → to needs a promotion choice. */
export function needsPromotion(moves: Move[], to: Square) {
    return moves.some((m) => m.to === to && m.promotion);
}
