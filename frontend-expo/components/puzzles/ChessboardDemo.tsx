import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Dimensions } from 'react-native';
import { fetchRandomPuzzle } from '@/api/RandomPuzzle';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';
import { SvgProps } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { fetchPuzzle } from '@/api/GetPuzzle';

import BBSvg from '@/assets/pieces/weird/bB.svg';
import BKSvg from '@/assets/pieces/weird/bK.svg';
import BNSvg from '@/assets/pieces/weird/bN.svg';
import BPSvg from '@/assets/pieces/weird/bP.svg';
import BQSvg from '@/assets/pieces/weird/bQ.svg';
import BRSvg from '@/assets/pieces/weird/bR.svg';
import WBSvg from '@/assets/pieces/weird/wB.svg';
import WKSvg from '@/assets/pieces/weird/wK.svg';
import WNSvg from '@/assets/pieces/weird/wN.svg';
import WPSvg from '@/assets/pieces/weird/wP.svg';
import WQSvg from '@/assets/pieces/weird/wQ.svg';
import WRSvg from '@/assets/pieces/weird/wR.svg';

const BOARD_SQUARES = Array.from({ length: 64 }, (_, index) => index);

// Type definitions for chess pieces
type Player = 'b' | 'w';
type Type = 'q' | 'r' | 'n' | 'b' | 'k' | 'p';
type PieceType = `${Player}${Type}`;
type PieceSvgComponent = React.ComponentType<SvgProps>;

// Define the props for ChessboardDemo
interface ChessboardDemoProps {
    onMove?: (info: any) => void; // Optional onMove callback
    onPuzzleLoaded?: (puzzle: any) => void;
    colors?: { black: string; white: string }; // Optional colors for the chessboard
    gestureEnabled?: boolean; // Optional gesture enabled flag
    boardSize?: number;
    isTablet?: boolean;
    puzzleId?: string;
    renderPiece?: (piece: string) => React.ReactElement | null;
    playerBlack?: boolean; // Optional flag to determine if the player is black
}

// Define the type of the ref object
interface ChessboardDemoRef {
    getPuzzle: () => any; // Function to return the puzzle state
    board: ChessboardRef | null; // Reference to the Chessboard
}

const ChessboardDemo = forwardRef<ChessboardDemoRef, ChessboardDemoProps>((props, ref) => {
    const chessboardRef = React.useRef<ChessboardRef>(null);
    const { theme } = useTheme();
    const defaultBoardSize = Math.floor(Dimensions.get('window').width / 8) * 8;
    const resolvedBoardSize = props.boardSize ?? defaultBoardSize;
    const pieceSize = resolvedBoardSize / 8;
    const boardColors = props.colors ?? { black: '#739552', white: '#ebecd0' };

    const [puzzle, setPuzzle] = useState<any | undefined>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;

        setLoading(true);
        setError(null);
        setPuzzle(undefined);

        const getPuzzle = async () => {
            try {
                const data = await (props.puzzleId ? fetchPuzzle(props.puzzleId) : fetchRandomPuzzle()); // Fetch the puzzle JSON

                if (!isActive) {
                    return;
                }

                setPuzzle(data); // Set the puzzle data
                props.onPuzzleLoaded?.(data);
            } catch (err) {
                if (isActive) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred'); // Set the error message
                }
            } finally {
                if (isActive) {
                    setLoading(false); // Stop loading
                }
            }
        };
        getPuzzle();

        return () => {
            isActive = false;
        };
    }, [props.puzzleId]);

    // Expose the chessboardRef and getPuzzle function to the parent component
    useImperativeHandle(ref, () => ({
        getPuzzle: () => puzzle, // Function to return the puzzle state
        board: chessboardRef.current, // Reference to the Chessboard
    }), [puzzle]);

    const defaultRenderPiece = (piece: string): React.ReactElement | null => {
        const pieceComponents: Record<PieceType, PieceSvgComponent> = {
            bb: BBSvg,
            bk: BKSvg,
            bn: BNSvg,
            bp: BPSvg,
            bq: BQSvg,
            br: BRSvg,
            wb: WBSvg,
            wk: WKSvg,
            wn: WNSvg,
            wp: WPSvg,
            wq: WQSvg,
            wr: WRSvg,
        };

        const PieceComponent = pieceComponents[piece as PieceType];

        if (!PieceComponent) {
            return null;
        }

        return (
            <View style={styles.pieceContainer}>
                <PieceComponent width={pieceSize} height={pieceSize} style={styles.pieceSvg} transform={props.playerBlack ? `scale(-1)` : `scale(1)`} />
            </View>
        );
    };

    const renderPieceHandler = props.renderPiece || defaultRenderPiece;

    if (loading) {
        return (
            <View
                accessibilityLabel="Loading puzzle board"
                accessibilityRole="progressbar"
                style={[
                    styles.loadingBoard,
                    {
                        width: resolvedBoardSize,
                        height: resolvedBoardSize,
                        transform: [{ scale: props.isTablet ? 0.95 : 1 }],
                    },
                ]}
            >
                <View style={styles.loadingGrid}>
                    {BOARD_SQUARES.map((index) => {
                        const row = Math.floor(index / 8);
                        const column = index % 8;
                        const isDarkSquare = (row + column) % 2 === 1;

                        return (
                            <View
                                key={index}
                                style={{
                                    width: pieceSize,
                                    height: pieceSize,
                                    backgroundColor: isDarkSquare ? boardColors.black : boardColors.white,
                                    opacity: 0.45,
                                }}
                            />
                        );
                    })}
                </View>

                <View style={[styles.loadingScrim, { backgroundColor: `${theme.background}2B` }]}>
                    <View
                        style={[
                            styles.loadingCard,
                            {
                                backgroundColor: `${theme.primaryButton}F2`,
                                borderColor: `${theme.primaryText}1F`,
                                boxShadow: `0 8px 24px ${theme.buttonShadow}`,
                            },
                        ]}
                    >
                        <ActivityIndicator size="large" color={theme.primaryText} />
                        <Text style={[styles.loadingTitle, { color: theme.primaryText }]}>Preparing puzzle</Text>
                        <Text style={[styles.loadingSubtitle, { color: `${theme.primaryText}A6` }]}>Setting up the board…</Text>
                    </View>
                </View>
            </View>
        );
    }
    if (error) {
        return (
            <View>
                <Text>Error: {error}</Text>
            </View>
        );
    }
    return (
        <View style={{ transform: `scale(${props.playerBlack ? '-1' : '1'})`}} >
            <GestureHandlerRootView style={[styles.boardContainer, { transform: `scale(${props.isTablet ? 0.95 : 1})` }]}>
                <Chessboard
                    withLetters={false}
                    withNumbers={false}
                    renderPiece={renderPieceHandler}
                    boardSize={resolvedBoardSize}

                    colors={boardColors} // Default colors if not provided
                    gestureEnabled={props.gestureEnabled} // Manage gestures
                    fen={puzzle?.fen} // Pass the fetched FEN to the chessboard
                    ref={chessboardRef}
                    onMove={props.onMove} // Pass the onMove callback
                />
            </GestureHandlerRootView>
        </View>
    );
});

const styles = StyleSheet.create({
    boardContainer: {
        marginTop: -10,
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBoard: {
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    loadingScrim: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCard: {
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 210,
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    loadingTitle: {
        fontFamily: 'Nunito',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
    },
    loadingSubtitle: {
        fontFamily: 'Nunito',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    pieceSvg: {
        alignSelf: 'center',
    },
    pieceContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChessboardDemo;
