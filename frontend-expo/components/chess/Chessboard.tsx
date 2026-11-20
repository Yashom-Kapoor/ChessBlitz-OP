import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Chess } from 'chess.js';
import type { Move, Square } from 'chess.js';
import { FILES, Orientation, colRowToSquare, isDarkSquare, squareToColRow, xyToSquare } from './geometry';
import {
    BoardPiece,
    ChessboardState,
    ChessMoveInfo,
    PieceCode,
    checkedKingSquare,
    getChessboardState,
    legalMovesFrom,
    needsPromotion,
    reconcilePieces,
} from './logic';
import Piece, { MOVE_DURATION } from './Piece';

export type { ChessMoveInfo, ChessboardState, PieceCode } from './logic';
export type { Orientation } from './geometry';

export type ChessboardColors = {
    white: string;
    black: string;
    lastMoveHighlight?: string;
    checkHighlight?: string;
    moveDot?: string;
};

export type ChessboardProps = {
    fen?: string;
    /** Which side is at the bottom. Defaults to white. */
    orientation?: Orientation;
    boardSize: number;
    colors?: ChessboardColors;
    renderPiece?: (piece: PieceCode) => React.ReactElement | null;
    gestureEnabled?: boolean;
    onMove?: (info: ChessMoveInfo) => void;
    showCoordinates?: boolean;
};

type MoveInput = { from: string; to: string; promotion?: string };

export type ChessboardRef = {
    /** Plays a move (if legal), animates it, then fires onMove. */
    move: (move: MoveInput) => Promise<void>;
    /** Loads a position; pieces slide to their new squares. */
    resetBoard: (fen?: string) => void;
    getState: () => ChessboardState;
};

const DEFAULT_COLORS: Required<ChessboardColors> = {
    white: '#ebecd0',
    black: '#739552',
    lastMoveHighlight: 'rgba(255, 214, 10, 0.42)',
    checkHighlight: 'rgba(230, 50, 50, 0.65)',
    moveDot: 'rgba(0, 0, 0, 0.22)',
};

const GLYPHS: Record<PieceCode, string> = {
    wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
    bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

const PROMOTION_PIECES = ['q', 'n', 'r', 'b'] as const;
const DRAG_THRESHOLD = 6;

const SQUARES: Square[] = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}` as Square);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createChess(fen?: string) {
    const chess = new Chess();
    if (fen) {
        try {
            chess.load(fen);
        } catch (error) {
            console.warn('Chessboard: invalid FEN', fen, error);
        }
    }
    return chess;
}

const Chessboard = forwardRef<ChessboardRef, ChessboardProps>(function Chessboard(props, ref) {
    const {
        fen,
        orientation = 'w',
        boardSize,
        renderPiece,
        gestureEnabled = true,
        onMove,
        showCoordinates = true,
    } = props;
    const colors = { ...DEFAULT_COLORS, ...props.colors };
    const cell = boardSize / 8;

    const [chess] = useState(() => createChess(fen));
    const [pieces, setPieces] = useState<BoardPiece[]>(() => reconcilePieces([], chess));
    const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
    const [selected, setSelected] = useState<Square | null>(null);
    const [targets, setTargets] = useState<Move[]>([]);
    const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);
    const [checkSquare, setCheckSquare] = useState<Square | null>(() => checkedKingSquare(chess));

    // Gesture callbacks run via runOnJS, so read live state through refs.
    const piecesRef = useRef(pieces);
    piecesRef.current = pieces;
    const selectedRef = useRef(selected);
    selectedRef.current = selected;
    const targetsRef = useRef(targets);
    targetsRef.current = targets;
    const onMoveRef = useRef(onMove);
    onMoveRef.current = onMove;

    const draggedId = useSharedValue('');
    const dragActive = useSharedValue(0);
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);
    // Set when a dragged piece was dropped on a legal square: let the piece learn its new square
    // (child effects run first) before releasing it, so it settles there instead of flying back.
    const releaseAfterRender = useRef(false);
    const touch = useRef<{ square: Square | null; tapMove: boolean; wasSelected: boolean }>({
        square: null,
        tapMove: false,
        wasSelected: false,
    });

    const release = useCallback(() => {
        draggedId.value = '';
        dragActive.value = 0;
    }, [draggedId, dragActive]);

    const clearSelection = useCallback(() => {
        setSelected(null);
        setTargets([]);
    }, []);

    const sync = useCallback(() => {
        setPieces((previous) => reconcilePieces(previous, chess));
        setCheckSquare(checkedKingSquare(chess));
    }, [chess]);

    useEffect(() => {
        if (releaseAfterRender.current) {
            releaseAfterRender.current = false;
            release();
        }
    }, [pieces, release]);

    // A new position from the parent (a different puzzle).
    useEffect(() => {
        if (!fen || fen === chess.fen()) return;
        try {
            chess.load(fen);
        } catch (error) {
            console.warn('Chessboard: invalid FEN', fen, error);
            return;
        }
        setLastMove(null);
        setPromotion(null);
        clearSelection();
        sync();
    }, [fen]);

    useEffect(() => {
        if (!gestureEnabled) {
            clearSelection();
            setPromotion(null);
            release();
        }
    }, [gestureEnabled]);

    const applyMove = useCallback((move: MoveInput): ChessMoveInfo | null => {
        let played: Move;
        try {
            played = chess.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
        } catch {
            return null;
        }
        setLastMove({ from: played.from, to: played.to });
        clearSelection();
        sync();
        return {
            move: played,
            state: { ...getChessboardState(chess), in_promotion: Boolean(played.promotion) },
        };
    }, [chess, clearSelection, sync]);

    const select = useCallback((square: Square) => {
        setSelected(square);
        setTargets(legalMovesFrom(chess, square));
    }, [chess]);

    const tryUserMove = useCallback((from: Square, to: Square, dragged: boolean) => {
        const moves = legalMovesFrom(chess, from);
        if (needsPromotion(moves, to)) {
            release();
            setPromotion({ from, to, color: chess.turn() });
            return;
        }
        const info = applyMove({ from, to });
        if (dragged && info) {
            releaseAfterRender.current = true;
        } else {
            release();
        }
        if (info) onMoveRef.current?.(info);
    }, [chess, applyMove, release]);

    const onTouchStart = useCallback((x: number, y: number) => {
        const square = xyToSquare(x, y, orientation, boardSize);
        touch.current = { square, tapMove: false, wasSelected: false };
        if (!square) return;

        // Tapping a highlighted target of the selected piece moves there on release.
        if (selectedRef.current && targetsRef.current.some((m) => m.to === square)) {
            touch.current.tapMove = true;
            return;
        }

        const piece = chess.get(square);
        if (piece && piece.color === chess.turn()) {
            touch.current.wasSelected = selectedRef.current === square;
            select(square);
            const boardPiece = piecesRef.current.find((p) => p.square === square);
            if (boardPiece) draggedId.value = boardPiece.id;
        }
    }, [chess, orientation, boardSize, select, draggedId]);

    const onTouchEnd = useCallback((x: number, y: number, wasDrag: boolean) => {
        const { square: from, tapMove, wasSelected } = touch.current;
        touch.current = { square: null, tapMove: false, wasSelected: false };

        if (!from) {
            release();
            clearSelection();
            return;
        }

        if (wasDrag) {
            const to = xyToSquare(x, y, orientation, boardSize);
            if (to && to !== from && targetsRef.current.some((m) => m.to === to)) {
                tryUserMove(from, to, true);
                return;
            }
            release();
            if (to !== from) clearSelection();
            return;
        }

        release();
        if (tapMove && selectedRef.current) {
            tryUserMove(selectedRef.current, from, false);
            return;
        }
        const piece = chess.get(from);
        if (piece && piece.color === chess.turn()) {
            if (wasSelected) clearSelection();
            return;
        }
        clearSelection();
    }, [chess, orientation, boardSize, release, clearSelection, tryUserMove]);

    const choosePromotion = (type: (typeof PROMOTION_PIECES)[number]) => {
        if (!promotion) return;
        const { from, to } = promotion;
        setPromotion(null);
        const info = applyMove({ from, to, promotion: type });
        if (info) onMoveRef.current?.(info);
    };

    useImperativeHandle(ref, () => ({
        move: async (move) => {
            const info = applyMove(move);
            if (!info) return;
            await wait(MOVE_DURATION);
            onMoveRef.current?.(info);
        },
        resetBoard: (nextFen) => {
            try {
                if (nextFen) chess.load(nextFen);
                else chess.reset();
            } catch (error) {
                console.warn('Chessboard: invalid FEN', nextFen, error);
                return;
            }
            setLastMove(null);
            setPromotion(null);
            clearSelection();
            release();
            sync();
        },
        getState: () => getChessboardState(chess),
    }), [chess, applyMove, clearSelection, release, sync]);

    const pan = Gesture.Pan()
        .enabled(Boolean(gestureEnabled) && !promotion)
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
            runOnJS(onTouchStart)(event.x, event.y);
        })
        .onUpdate((event) => {
            if (draggedId.value === '') return;
            if (dragActive.value === 0
                && Math.hypot(event.translationX, event.translationY) > DRAG_THRESHOLD) {
                dragActive.value = 1;
            }
            if (dragActive.value === 1) {
                dragX.value = event.x - cell / 2;
                dragY.value = event.y - cell / 2;
            }
        })
        .onFinalize((event) => {
            runOnJS(onTouchEnd)(event.x, event.y, dragActive.value === 1);
        });

    const drawPiece = (code: PieceCode) => renderPiece?.(code) ?? (
        <Text style={[styles.glyph, { fontSize: cell * 0.8, lineHeight: cell }]}>{GLYPHS[code]}</Text>
    );

    const squareStyle = (square: Square) => {
        const { col, row } = squareToColRow(square, orientation);
        return { left: col * cell, top: row * cell, width: cell, height: cell };
    };

    const highlighted = new Map<Square, string>();
    if (lastMove) {
        highlighted.set(lastMove.from, colors.lastMoveHighlight);
        highlighted.set(lastMove.to, colors.lastMoveHighlight);
    }
    if (selected) highlighted.set(selected, colors.lastMoveHighlight);
    if (checkSquare) highlighted.set(checkSquare, colors.checkHighlight);

    const promotionColumn = promotion ? squareToColRow(promotion.to, orientation) : null;

    return (
        <View style={{ width: boardSize, height: boardSize }} accessibilityLabel="Chess board">
            <GestureDetector gesture={pan}>
                <View style={StyleSheet.absoluteFill}>
                    {SQUARES.map((square) => {
                        const dark = isDarkSquare(square);
                        const { col, row } = squareToColRow(square, orientation);
                        const labelColor = dark ? colors.white : colors.black;
                        return (
                            <View key={square} style={[styles.square, squareStyle(square), { backgroundColor: dark ? colors.black : colors.white }]}>
                                {highlighted.has(square) && (
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: highlighted.get(square) }]} />
                                )}
                                {showCoordinates && col === 0 && (
                                    <Text style={[styles.rankLabel, { color: labelColor, fontSize: cell * 0.2 }]}>{square[1]}</Text>
                                )}
                                {showCoordinates && row === 7 && (
                                    <Text style={[styles.fileLabel, { color: labelColor, fontSize: cell * 0.2 }]}>{square[0]}</Text>
                                )}
                            </View>
                        );
                    })}

                    {targets.map((move) => {
                        const capture = Boolean(chess.get(move.to)) || move.flags.includes('e');
                        return (
                            <View key={`${move.to}${move.promotion ?? ''}`} pointerEvents="none" style={[styles.square, styles.center, squareStyle(move.to)]}>
                                {capture ? (
                                    <View style={{ width: cell * 0.92, height: cell * 0.92, borderRadius: cell, borderWidth: cell * 0.08, borderColor: colors.moveDot }} />
                                ) : (
                                    <View style={{ width: cell * 0.3, height: cell * 0.3, borderRadius: cell, backgroundColor: colors.moveDot }} />
                                )}
                            </View>
                        );
                    })}

                    {pieces.map((piece) => (
                        <Piece key={piece.id} piece={piece} orientation={orientation} boardSize={boardSize}
                            draggedId={draggedId} dragActive={dragActive} dragX={dragX} dragY={dragY}>
                            {drawPiece(piece.code)}
                        </Piece>
                    ))}
                </View>
            </GestureDetector>

            {promotion && promotionColumn && (
                <View style={StyleSheet.absoluteFill}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Cancel promotion"
                        style={[StyleSheet.absoluteFill, styles.promotionBackdrop]} onPress={() => setPromotion(null)} />
                    {PROMOTION_PIECES.map((type, index) => {
                        // Stack the choices from the promotion square towards the middle of the board.
                        const row = promotionColumn.row === 0 ? index : 7 - index;
                        const code = `${promotion.color}${type}` as PieceCode;
                        return (
                            <Pressable key={type} accessibilityRole="button" accessibilityLabel={`Promote to ${{ q: 'queen', n: 'knight', r: 'rook', b: 'bishop' }[type]}`}
                                onPress={() => choosePromotion(type)}
                                style={[styles.square, styles.center, squareStyle(colRowToSquare(promotionColumn.col, row, orientation)), styles.promotionOption]}>
                                <View style={{ width: cell, height: cell }}>{drawPiece(code)}</View>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    square: { position: 'absolute' },
    center: { alignItems: 'center', justifyContent: 'center' },
    rankLabel: { position: 'absolute', top: 2, left: 3, fontWeight: '700' },
    fileLabel: { position: 'absolute', bottom: 1, right: 3, fontWeight: '700' },
    glyph: { textAlign: 'center' },
    promotionBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
    promotionOption: { backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 999 },
});

export default Chessboard;
