import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import ChessboardDemo from '@/components/ChessboardDemo';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ChessboardRef } from 'react-native-chessboard';
import { ThemedText } from '@/components/ThemedText';
import { secondsToHMS } from '@/components/utils/Time';
import { fetchHint } from '@/components/GetHint';
import { detectMoveFromFEN, getTurnFromFEN } from '@/components/Notation';
import { Chess } from 'chess.js';
import { useTheme } from '@/context/ThemeContext';
import backgroundImages from '@/components/utils/backgrounds';

export default function DailyPuzzle() {
    const router = useRouter();
    const chessboardRef = useRef<any>(null); // Create a ref for ChessboardDemo, forwardRef
    const [chess] = useState<Chess>(new Chess);
    const { theme } = useTheme();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            backgroundColor: theme.background,
            paddingBottom: 150,
        },
    
        hintContainer: {
            width: '100%',
            flexDirection: 'row',
            height: 205,
            padding: 10,
            paddingBottom: 20,
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
        },
        characterImage: {
            width: 100,
            height: 100,
            marginBottom: -30,
        },
        hintSpeech: {
            backgroundColor: theme.hintBubble,
            maxWidth: '80%',
            padding: 10,
            marginLeft: -20,
            paddingHorizontal: 15,
            borderRadius: 10,
            borderBottomLeftRadius: 0,
            textAlign: 'left',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 16,
            lineHeight: 20,
        },
    
        infoSection: {
            width: '100%',
            flexDirection: 'row',
            marginTop: 10,
            marginBottom: -30,
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
            borderRadius: 10,
            borderStartStartRadius: 0,
            borderBottomStartRadius: 0,
            boxShadow: `-7 7 0 ${theme.buttonShadow}`,
        },
        rating: {
            color: theme.primaryText,
            fontSize: 24,
            lineHeight: 28,
            fontWeight: 'bold',
            alignItems: 'center',
        },
    
        timeElapsed: {
            flex: 1,
            padding: 25,
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexDirection: 'row',
        },
        timeText: {
            color: theme.primaryText,
            fontSize: 22,
            fontWeight: 'bold',
            textAlign: 'right',
        },
        clockIcon: {
            marginRight: 5,
        },
    
        controlBar: {
            position: 'absolute',
            backgroundColor: theme.headerBackground,
            height: 100,
            width: '100%',
            paddingHorizontal: 10,
            bottom: 0,
            justifyContent: 'space-evenly',
            flexDirection: 'row',
        },
        controlButton: {
            paddingVertical: 15,
            borderRadius: 5,
            width: 60,
            overflow: 'visible',
            alignItems: 'center',
        },
        controlText: {
            color: theme.primaryText,
            textAlign: 'center',
            fontSize: 12,
        },
        controlIcon: {
            marginBottom: 7,
        },
    });

    const [elapsedTime, setElapsedTime] = useState(0);
    const [hint, setHint] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [moveNumber, setMoveNumber] = useState(1);
    const [loadingHint, setLoadingHint] = useState(false); // Track whether the hint is loading
    const [puzzleLoaded, setPuzzleLoaded] = useState(false); // Track when the puzzle is loaded

    const [moves, setMoves] = useState<string[]>([]); // Store the moves
    const [lastFEN, setLastFEN] = useState<string | null>(null); // Store the last FEN
    const [turn, setTurn] = useState<string | null>(null); // Track the turn
    const [redoUnlocked, setRedoUnlocked] = useState<number | null>(1); // Track the redo max state
    const [puzzleCompleted, setPuzzleCompleted] = useState<boolean | null>(false); // Track puzzle completion state

    const handleGetHint = async () => {
        try {
            setLoadingHint(true); // Start loading
            const fetchedHint = await fetchHint(chessboardRef.current?.getPuzzle().ID, 2 * moveNumber);
            setHint(fetchedHint);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            setHint(null);
        } finally {
            setLoadingHint(false); // Stop loading
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
                    await chessboardRef.current?.board.move({ from: moves[moveNumber * 2 - 1].substring(0, 2),
                            to: moves[moveNumber * 2 - 1].substring(2, 4),
                            promotion: moves[moveNumber * 2 - 1].substring(4) });
                }), (200);
            }
        }
    };

    return (
        <ImageBackground
            source={backgroundImages[theme.name] || null}
            style={styles.container}
            imageStyle={{opacity:0.5}}
        >
            <View style={styles.hintContainer}>
                <Image
                    source={require('@/assets/images/hints/bear.png')}
                    style={styles.characterImage}
                />
                <ThemedText style={styles.hintSpeech}>
                    {loadingHint ? (
                        <ThemedText style={{ color: theme.secondaryText }}>Hmmm...</ThemedText>
                    ) : (
                        error ? (
                            <ThemedText style={{ color: theme.secondaryText }}>{error}</ThemedText>
                        ) : (
                            <ThemedText style={{ color: theme.secondaryText }}>{hint ? hint : 'Need a hint?'}</ThemedText>
                        )
                    )}
                </ThemedText>
            </View>

            <ChessboardDemo
                ref={chessboardRef}
                colors={{ black: theme.player2Square, white: theme.player1Square }}
                onMove={({ state }) => {
                    setLastFEN(state.fen); // Update the last FEN

                    if(getTurnFromFEN(state.fen) === turn) {
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
                            } else {
                                setMoveNumber(moveNumber + 1); // Increment move number
                                setHint('Great job! Keep going!'); // Show success message for correct move
                                setTimeout(async () => {
                                    chess.move({ from: moves[moveNumber * 2].substring(0, 2),
                                            to: moves[moveNumber * 2].substring(2, 4),
                                            promotion: moves[moveNumber * 2].substring(4) }); // Make the next move
                                    await chessboardRef.current?.board.move({ from: moves[moveNumber * 2].substring(0, 2),
                                            to: moves[moveNumber * 2].substring(2, 4),
                                            promotion: moves[moveNumber * 2].substring(4) });
                                }), (700);
                            }
                        } else {
                            setHint('Try again!'); // Show error message if the move is incorrect
                        }
                    }
                }}
                gestureEnabled={(getTurnFromFEN(lastFEN) !== turn) || false} // Enable gestures only if it's the player's turn
            />

            <View style={styles.infoSection}>
                <ThemedView style={styles.ratingContainer}>
                    <IconSymbol size={30} style={{marginHorizontal:5}} name="puzzlepiece.extension.fill" color={theme.primaryText} />
                    <ThemedText style={styles.rating}>
                        {chessboardRef.current?.getPuzzle()?.Rating || '1000'}
                    </ThemedText>
                    <IconSymbol size={32} style={{marginLeft:'auto'}} name="chevron.up.circle.fill" color={theme.primaryText} />
                </ThemedView>

                <View style={styles.timeElapsed}>
                    <IconSymbol style={styles.clockIcon} size={28} name="clock" color={theme.primaryText} />
                    <ThemedText style={styles.timeText}>
                        {secondsToHMS(elapsedTime)}
                    </ThemedText>
                </View>
            </View>

            <ThemedText style={{color: theme.primaryText, position:'absolute', top: 5, left: 5}}>
                {`BEST: ${moves[2 * moveNumber - 1]}\n`}
                {`TURN: ${getTurnFromFEN(lastFEN)}\n`}
                {`MOVE: ${moveNumber}\n`}
            </ThemedText>

            <ThemedView style={styles.controlBar}>
                <Pressable style={styles.controlButton} onPress={handleGetHint}>
                    <IconSymbol style={styles.controlIcon} size={24} name="lightbulb" color={theme.primaryText} />
                    <Text style={styles.controlText}>Hint</Text>
                </Pressable>

                <Pressable style={styles.controlButton} onPress={handleUndo}>
                    <IconSymbol style={styles.controlIcon} size={24} name="arrow.uturn.backward" color={theme.primaryText} />
                    <Text style={styles.controlText}>Undo</Text>
                </Pressable>

                <Pressable style={styles.controlButton} onPress={handleRedo}>
                    <IconSymbol style={styles.controlIcon} size={24} name="arrow.uturn.right" color={theme.primaryText} />
                    <Text style={styles.controlText}>Redo</Text>
                </Pressable>

                <Pressable style={styles.controlButton} onPress={handleReset}>
                    <IconSymbol style={styles.controlIcon} size={24} name="restart" color={theme.primaryText} />
                    <Text style={styles.controlText}>Reset</Text>
                </Pressable>

                <Pressable style={styles.controlButton}>
                    <IconSymbol style={styles.controlIcon} size={24} name="ellipsis" color={theme.primaryText} />
                    <Text style={styles.controlText}>Options</Text>
                </Pressable>
            </ThemedView>
        </ImageBackground>
    );
}