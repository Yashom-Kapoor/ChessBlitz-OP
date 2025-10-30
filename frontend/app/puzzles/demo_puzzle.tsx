import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ImageBackground, Platform } from 'react-native';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import ChessboardDemo from '@/components/puzzles/ChessboardDemo';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { secondsToHMS } from '@/utils/Time';
import { fetchHint } from '@/api/GetHint';
import { detectMoveFromFEN, getTurnFromFEN } from '@/utils/Notation';
import { Chess } from 'chess.js';
import { useTheme } from '@/context/ThemeContext';
import backgroundImages, { BackgroundContext } from '@/context/Backgrounds';
import { BlurView } from 'expo-blur';
import PuzzleBar from '@/components/puzzles/PuzzleBar';
import GlobalStyle from '@/context/GlobalStyle';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import GlassBlurView from '@/components/GlassBlurView';

export default function DemoPuzzle() {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';
    const [hint, setHint] = useState<string | null>(null);

    const expanded = 200;
    const collapsed = isTablet ? 100 : 70;
    const height = useSharedValue(collapsed);
    const topMargin = useSharedValue(0);
    const expandedMargin = isTablet ? -20 : -70;

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(height.value, { duration: 500 }),
            marginTop: withTiming(topMargin.value, { duration: 500 }),
        };
    });
    const toggleHeight = () => {
        height.value = (height.value === expanded || !hint) ? collapsed : expanded;
        topMargin.value = (topMargin.value === 0 && hint) ? expandedMargin : 0;
    };

    const styles = GlobalStyle(theme, isTablet);

    const puzzleStyles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            backgroundColor: theme.background,
            paddingBottom: 150,
        },
        hintContainer: {
            position: 'absolute',
            top: isTablet ? '8%' : '25%',
            width: '100%',
            flexDirection: 'row',
            marginBottom: isTablet ? 0 : 20,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
        },
        hintSpeech: {
            padding: isTablet ? 13 : 10,
            paddingHorizontal: isTablet ? 22 : 18,
            textAlign: 'left',
            justifyContent: 'center',
            alignItems: 'center',
            userSelect: 'none',
            pointerEvents: 'none',
        },
        ratingContainer: {
            flex: 1,
            padding: 15,
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexDirection: 'row',
            backgroundColor: theme.primaryButton,
            marginVertical: 10,
            marginRight: 20,
            borderRadius: isTablet ? 30 : 20,
            borderStartStartRadius: 0,
            borderBottomStartRadius: 0,
            boxShadow: `${isTablet ? ' -14 14' : '-7 7'} 0 ${theme.buttonShadow}`,
        },
        timeElapsed: {
            flex: 1,
            padding: 25,
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexDirection: 'row',
        },

        characterImage: {
            width: isTablet ? 140 : 100,
            height: isTablet ? 140 : 100,
        },
        clockIcon: {
            marginRight: 5,
        },
    });

    const chessboardRef = useRef<any>(null); // Create a ref for ChessboardDemo, forwardRef
    const [chess] = useState<Chess>(new Chess);
    
    const [elapsedTime, setElapsedTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [moveNumber, setMoveNumber] = useState(1);
    const [loadingHint, setLoadingHint] = useState(false); // Track whether the hint is loading
    const [puzzleLoaded, setPuzzleLoaded] = useState(false); // Track when the puzzle is loaded

    const [moves, setMoves] = useState<string[]>([]); // Store the moves
    const [lastFEN, setLastFEN] = useState<string | null>(null); // Store the last FEN
    const [turn, setTurn] = useState<string | null>(null); // Track the turn
    const [redoUnlocked, setRedoUnlocked] = useState<number | null>(1); // Track the redo max state
    const [puzzleCompleted, setPuzzleCompleted] = useState<boolean | null>(false); // Track puzzle completion stat

    const handleGetHint = async () => {
        try {
            height.value = collapsed;
            topMargin.value = 0;
            setLoadingHint(true); // Start loading
            const fetchedHint = await fetchHint(chessboardRef.current?.getPuzzle().ID, 2 * moveNumber);
            setHint(fetchedHint);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            setHint(null);
        } finally {
            setLoadingHint(false); // Stop loading
            height.value = expanded;
            topMargin.value = expandedMargin;
        }
    };

    // Timer logic
    useEffect(() => {
        if (!puzzleCompleted) {
            const interval = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [puzzleCompleted]);

    // Load puzzle and set moves
    const updateMoves = () => {
        if (chessboardRef.current) {
            const puzzle = chessboardRef.current.getPuzzle();
            if (puzzle) {
                setMoves(puzzle.Moves.split(' ')); // Set the moves from the puzzle
                setLastFEN(puzzle.FEN); // Set the last FEN
                chess.load(puzzle.FEN); // Load the FEN into the chess instance
                setTurn(getTurnFromFEN(puzzle.FEN)); // Get the turn from the FEN
            }
        }
    };

    useEffect(() => {
        if (puzzleLoaded) {
            updateMoves();
        }
    }, [puzzleLoaded]);
    useEffect(() => {
        if (chessboardRef.current) {
            const puzzle = chessboardRef.current.getPuzzle();
            if (puzzle) {
                setPuzzleLoaded(true); // Signal that the puzzle is loaded
            }
        }
    }, [chessboardRef.current]);
    useEffect(() => {
        setRedoUnlocked(Math.max(moveNumber, redoUnlocked || 0))
    }, [moveNumber])

    const handleFirstMove = () => {
        if (chessboardRef.current) {
            const puzzle = chessboardRef.current.getPuzzle();
            if (puzzle) {
                setLastFEN(puzzle.FEN); // Set the last FEN
                chess.move({ from: moves[0].substring(0, 2), to: moves[0].substring(2, 4), promotion: moves[0].substring(4) }); // Make the first move
                setTimeout(async () => {
                    await chessboardRef.current?.board.move({ from: moves[0].substring(0, 2), to: moves[0].substring(2, 4), promotion: moves[0].substring(4) });
                }, 500); // Delay the first move by 1 second
            }
        }
    };
    useEffect(() => {
        if (puzzleLoaded && chessboardRef.current && moves.length > 0) {
            handleFirstMove();
        }
    }, [moves]);

    const handleReset = () => {
        if (chessboardRef.current) {
            chess.load(chessboardRef.current.getPuzzle().FEN); // Reset the chess board to starting position
            chessboardRef.current.board.resetBoard(chessboardRef.current.getPuzzle().FEN); // Call the reset method on the chessboard
            setMoveNumber(1); // Reset move number
            setPuzzleCompleted(false);
            setRedoUnlocked(1);
            setHint(null); // Reset hint
            height.value = collapsed;
            topMargin.value = 0;
            setLastFEN(chessboardRef.current.getPuzzle().FEN); // Reset last FEN
            setElapsedTime(0); // Reset elapsed time
            setTurn(getTurnFromFEN(chessboardRef.current.getPuzzle().FEN)); // Reset turn

            handleFirstMove(); // Make the first move
        }
    };
    const handleUndo = () => {
        if (chessboardRef.current) {
            chess.undo(); // Undo the last move
            if (getTurnFromFEN(chess.fen()) === turn) {
                chess.undo();
                setMoveNumber(moveNumber - 1);
            }
            setLastFEN(chess.fen());
            setHint(null);

            if (moveNumber <= 1) {
                chess.load(chessboardRef.current.getPuzzle().FEN); // Reset the chess board to starting position
                chessboardRef.current.board.resetBoard(chessboardRef.current.getPuzzle().FEN); // Call the reset method on the chessboard
                setMoveNumber(1); // Reset move number
                setLastFEN(chessboardRef.current.getPuzzle().FEN); // Reset last FEN

                handleFirstMove(); // Make the first move
            } else {
                chessboardRef.current.board.resetBoard(chess.fen()); // Call the reset method on the chessboard
                setTurn(getTurnFromFEN(chessboardRef.current.getPuzzle().FEN)); // Reset turn
            }

        }
    };
    const handleRedo = () => {
        if (chessboardRef.current && redoUnlocked !== null) {
            if (moveNumber < redoUnlocked) {
                setTimeout(async () => {
                    await chessboardRef.current?.board.move({
                        from: moves[moveNumber * 2 - 1].substring(0, 2),
                        to: moves[moveNumber * 2 - 1].substring(2, 4),
                        promotion: moves[moveNumber * 2 - 1].substring(4)
                    });
                }), (200);
            }
        }
    };

    return (
        <BackgroundContext theme={theme} style={puzzleStyles.container}>
            <Text style={{ color: theme.primaryText, position: 'absolute', textAlign: 'right', top: 55, right: 5, zIndex: 1000 }}>
                {`BEST: ${moves[2 * moveNumber - 1]}\n`}
                {`TURN: ${getTurnFromFEN(lastFEN)}\n`}
                {`MOVE: ${moveNumber}\n`}
            </Text>

            <ChessboardDemo
                ref={chessboardRef}
                colors={{ black: theme.player2Square, white: theme.player1Square }}
                isTablet={isTablet}
                onMove={({ state }) => {
                    setLastFEN(state.fen); // Update the last FEN

                    if (getTurnFromFEN(state.fen) === turn) {
                        const detectedMove = detectMoveFromFEN(lastFEN, state.fen);
                        if (detectedMove) {
                            chess.move({ from: detectedMove.substring(0, 2), to: detectedMove.substring(2, 4), promotion: detectedMove.substring(4) }); // Make the move
                        }
                        if (moves[moveNumber * 2 - 1] == detectMoveFromFEN(lastFEN, state.fen)) {
                            setHint(null); // Clear hint if the move is correct

                            if (moveNumber >= moves.length / 2) {
                                setHint('Congratulations! You completed the puzzle!'); // Show success message
                                setRedoUnlocked(moveNumber + 1);
                                setPuzzleCompleted(true);
                                height.value = expanded;
                                topMargin.value = expandedMargin;
                            } else {
                                setMoveNumber(moveNumber + 1); // Increment move number
                                setHint('Great job! Keep going!'); // Show success message for correct move
                                setTimeout(async () => {
                                    chess.move({
                                        from: moves[moveNumber * 2].substring(0, 2),
                                        to: moves[moveNumber * 2].substring(2, 4),
                                        promotion: moves[moveNumber * 2].substring(4)
                                    }); // Make the next move
                                    await chessboardRef.current?.board.move({
                                        from: moves[moveNumber * 2].substring(0, 2),
                                        to: moves[moveNumber * 2].substring(2, 4),
                                        promotion: moves[moveNumber * 2].substring(4)
                                    });
                                }), (700);
                            }
                        } else {
                            setHint('Try again!'); // Show error message if the move is incorrect
                        }
                    }
                }}
                gestureEnabled={(getTurnFromFEN(lastFEN) !== turn) || false} // Enable gestures only if it's the player's turn
            />

            <Animated.View style={[puzzleStyles.hintContainer, animatedStyle]}>
                <Image
                    source={require('@/assets/images/hints/bear.png')}
                    style={puzzleStyles.characterImage}
                />
                <Pressable onPress={() => toggleHeight()} style={{ marginLeft: isTablet ? -35 : -25, marginTop: isTablet ? 50 : 30, maxWidth: isTablet ? '80%' : '75%' }}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.hintBubble} glass={'clear'} interactive />
                    <Text style={[puzzleStyles.hintSpeech, styles.h5, { color: theme.secondaryText }]}>
                        {loadingHint ? (
                            <Text style={{ color: theme.secondaryText, fontWeight: 800 }}>Hmmm...</Text>
                        ) : (
                            error ? (
                                <Text style={{ color: theme.secondaryText, fontWeight: 800 }}>{error}</Text>
                            ) : ((hint ? (
                                <Text style={{ color: theme.secondaryText, fontWeight: puzzleCompleted ? 800 : 500 }}>{hint}</Text>
                            ) : (
                                <Text style={{ color: theme.secondaryText, fontWeight: 800 }}>{'Need a hint?'}</Text>
                            )))
                        )}
                    </Text>
                </Pressable>
            </Animated.View>

            <View style={[styles.hStack, { marginTop: isTablet ? -10 : 10, marginBottom: -30 }]}>
                <View style={puzzleStyles.ratingContainer}>
                    <IconSymbol size={isTablet ? 45 : 30} style={{ marginHorizontal: 5 }} name="puzzlepiece.extension.fill" color={theme.primaryText} />
                    <Text style={[styles.subtitle, { marginLeft: isTablet ? 5 : 0, color: theme.primaryText }]}>
                        {chessboardRef.current?.getPuzzle()?.Rating || '1000'}
                    </Text>
                    <IconSymbol size={isTablet ? 40 : 32} style={{ marginLeft: 'auto' }} name="chevron.up.circle.fill" color={theme.primaryText} />
                </View>

                <View style={puzzleStyles.timeElapsed}>
                    <IconSymbol style={puzzleStyles.clockIcon} size={isTablet ? 40 : 32} name="clock" color={theme.primaryText} />
                    <Text style={[styles.h2, { textAlign: 'right', color: theme.primaryText }]}>
                        {secondsToHMS(elapsedTime)}
                    </Text>
                </View>
            </View>

            <PuzzleBar onHint={handleGetHint} onUndo={handleUndo} onRedo={handleRedo} onReset={handleReset} onOptions={null} isTablet={isTablet} />

        </BackgroundContext>
    );
}