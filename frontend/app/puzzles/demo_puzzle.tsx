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
import { postCompletedPuzzle } from '@/api/PostCompleted';

export default function DemoPuzzle() {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';
    const [hint, setHint] = useState<string | null>(null);

    const hintHeight = useSharedValue(55);
    const hintWidth = useSharedValue(200);
    const hintOpacity = useSharedValue(1);
    const zIndex = useSharedValue(0);

    const hintAnimStyle = useAnimatedStyle(() => {
        return {
            maxHeight: withTiming(hintHeight.value, { duration: 500 }),
            maxWidth: withTiming(hintWidth.value, { duration: 500 }),
            opacity: withTiming(hintOpacity.value, { duration: 500 }),
            pointerEvents: 'none',
        };
    });

    const hintBubbleStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(1 - hintOpacity.value, { duration: 500 }),
            pointerEvents: 'none',
        }
    })

    const bearHintStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            left: isTablet ? '2%' : 0,
            top: isTablet ? '8%' : '25%',
            width: isTablet ? 140 : 100,
            height: isTablet ? 140 : 100,
            zIndex: zIndex.value,
            shadowOpacity: 0.25,
            shadowColor: 'black',
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
            marginTop: withTiming(zIndex.value / 2, { duration: 500 }),
        }
    });

    const [expanded, setExpanded] = useState<boolean>(false);
    const [isHintExpandable, setIsHintExpandable] = useState<boolean>(false);
    useEffect(() => {
        hintHeight.value = expanded ? 300 : (isTablet ? 55 : 45);
        hintWidth.value = (expanded || !isHintExpandable) ? (isTablet ? 500 : 300) : (isTablet ? 100 : 70);
        hintOpacity.value = (expanded || !isHintExpandable) ? 1 : 0;
        zIndex.value = expanded ? 100 : 0;
    }, [expanded, isHintExpandable]);

    const styles = GlobalStyle(theme, isTablet);

    const localStyles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            backgroundColor: theme.background,
            paddingBottom: 150,
        },
        hintContainer: {
            position: 'absolute',
            flex: 1,
            left: isTablet ? '17%' : '20%',
            top: isTablet ? '12%' : '29%',
            flexDirection: 'row',
            marginBottom: isTablet ? 0 : 20,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            maxHeight: '50%',
            maxWidth: '80%',
        },
        hintSpeech: {
            position: 'relative',
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

        clockIcon: {
            marginRight: 5,
        },
    });

    const chessboardRef = useRef<any>(null); // Create a ref for ChessboardDemo, forwardRef
    const [chess] = useState<Chess>(new Chess);
    
    const [elapsedTime, setElapsedTime] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [undosUsed, setUndosUsed] = useState(0);
    const [redosUsed, setRedosUsed] = useState(0);

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
        if (!puzzleCompleted) {
            try {
                setHint(null);
                setIsHintExpandable(false);
                setExpanded(false);
                setLoadingHint(true); // Start loading
                const fetchedHint = await fetchHint(chessboardRef.current?.getPuzzle().ID, 2 * moveNumber);
                setHint(fetchedHint);
                setHintsUsed(hintsUsed + 1); // Increment hints used
                setError(null);
            } catch (err) {
                setError((err as Error).message);
                setHint(null);
                setIsHintExpandable(false);
            } finally {
                setLoadingHint(false); // Stop loading
                setIsHintExpandable(true); // Only actual hints from API are expandable
                setExpanded(true);
            }
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
                chess.load(puzzle.FEN);
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
            setIsHintExpandable(false);
            setExpanded(false);
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
            setIsHintExpandable(false);

            if (moveNumber <= 1) {
                chess.load(chessboardRef.current.getPuzzle().FEN); // Reset the chess board to starting position
                chessboardRef.current.board.resetBoard(chessboardRef.current.getPuzzle().FEN); // Call the reset method on the chessboard
                setMoveNumber(1); // Reset move number
                setLastFEN(chessboardRef.current.getPuzzle().FEN); // Reset last FEN

                handleFirstMove(); // Make the first move
            } else {
                chessboardRef.current.board.resetBoard(chess.fen()); // Call the reset method on the chessboard
                setTurn(getTurnFromFEN(chessboardRef.current.getPuzzle().FEN)); // Reset turn
                setUndosUsed(undosUsed + 1); // Counts undo
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
                    setRedosUsed(redosUsed + 1); // Counts redo
                }, 200);
            }
        }
    };

    useEffect(() => {
        if (puzzleCompleted) {
            const submitCompletion = async () => {
                try {
                    await postCompletedPuzzle({
                        userId: 'user123', 
                        puzzleId: chessboardRef.current?.getPuzzle()?.ID || '',
                        timeElapsed: elapsedTime,
                        hintsUsed: hintsUsed, 
                        undosUsed: undosUsed, 
                        redosUsed: redosUsed, 
                        completed: true,
                    });
                } catch (error) {
                    console.error('Failed to submit puzzle completion:', error);
                }
            };
            submitCompletion();
        }
    }, [puzzleCompleted]);

    return (
        <BackgroundContext theme={theme} style={localStyles.container}>
            <Text style={{ color: theme.primaryText, position: 'absolute', textAlign: 'right', top: 55, right: 5, zIndex: 1000 }}>
                {`BEST: ${moves[2 * moveNumber - 1]}\n`}
                {`TURN: ${getTurnFromFEN(lastFEN)}\n`}
                {`MOVE: ${moveNumber}\n`}
                {`HINTS: ${hintsUsed}  UNDOs: ${undosUsed}  REDOs: ${redosUsed}`}
            </Text>

            <Animated.Image
                source={require('@/assets/images/hints/bear.png')}
                style={{ ...bearHintStyle }}
            />

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
                            setIsHintExpandable(false);

                            if (moveNumber >= moves.length / 2) {
                                setHint('Congratulations! You completed the puzzle!'); // Show success message
                                setIsHintExpandable(false); // Not expandable
                                setExpanded(false);
                                setRedoUnlocked(moveNumber + 1);
                                setPuzzleCompleted(true);
                                setExpanded(true);
                            } else {
                                setMoveNumber(moveNumber + 1); // Increment move number
                                setHint('Great job! Keep going!'); // Show success message for correct move
                                setIsHintExpandable(false); // Not expandable
                                setExpanded(false);
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
                            setIsHintExpandable(false); // Not expandable
                            setExpanded(false);
                        }
                    }
                }}
                gestureEnabled={(getTurnFromFEN(lastFEN) !== turn) || false} // Enable gestures only if it's the player's turn
            />

            <Animated.View style={[localStyles.hintContainer]}>
                <Pressable onPress={() => {
                    if (puzzleCompleted) {
                        setExpanded(true); // Always expanded when puzzle completed
                    } else if (isHintExpandable) {
                        setExpanded(!expanded); // Toggle if hint is expandable
                    }
                }} style={{position: 'relative', flexShrink: 1 }}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.hintBubble} glass={'clear'} interactive />
                    <Animated.View style={{ ...hintAnimStyle }}>
                        <Text style={{...styles.h4, color: theme.secondaryText, ...localStyles.hintSpeech }}>
                            {loadingHint ? 'Hmmm...' : (
                                error ? error : (
                                    hint ? hint : 'Need a hint?'
                                )
                            )}
                        </Text>
                    </Animated.View>
                    <Animated.Image
                        source={require('@/assets/images/hints/hint_expand.png')}
                        style={[{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            transform: [{ scale: 0.5 }],
                            tintColor: theme.secondaryText,
                        }, hintBubbleStyle]}
                        resizeMode="center"
                    />
                </Pressable>
            </Animated.View>

            <View style={[styles.hStack, { marginTop: isTablet ? -10 : 10, marginBottom: -30 }]}>
                <View style={localStyles.ratingContainer}>
                    <IconSymbol size={isTablet ? 45 : 30} style={{ marginHorizontal: 5 }} name="puzzlepiece.extension.fill" color={theme.primaryText} />
                    <Text style={[styles.subtitle, { marginLeft: isTablet ? 5 : 0, color: theme.primaryText }]}>
                        {chessboardRef.current?.getPuzzle()?.Rating || '1000'}
                    </Text>
                    <IconSymbol size={isTablet ? 40 : 32} style={{ marginLeft: 'auto' }} name="chevron.up.circle.fill" color={theme.primaryText} />
                </View>

                <View style={localStyles.timeElapsed}>
                    <IconSymbol style={localStyles.clockIcon} size={isTablet ? 40 : 32} name="clock" color={theme.primaryText} />
                    <Text style={[styles.h2, { textAlign: 'right', color: theme.primaryText }]}>
                        {secondsToHMS(elapsedTime)}
                    </Text>
                </View>
            </View>

            <PuzzleBar onHint={handleGetHint} onUndo={handleUndo} onRedo={handleRedo} onReset={handleReset} onOptions={null} isTablet={isTablet} />

        </BackgroundContext>
    );
}