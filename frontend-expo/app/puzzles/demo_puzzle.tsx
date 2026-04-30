import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import ChessboardDemo from '@/components/puzzles/ChessboardDemo';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { secondsToHMS } from '@/utils/Time';
import { fetchHint } from '@/api/GetHint';
import { detectMoveFromFEN, getTurnFromFEN } from '@/utils/Notation';
import { Chess } from 'chess.js';
import { useTheme } from '@/context/ThemeContext';
import { BackgroundContext } from '@/context/Backgrounds';
import PuzzleBar from '@/components/puzzles/PuzzleBar';
import GlobalStyle from '@/context/GlobalStyle';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import GlassBlurView from '@/components/GlassBlurView';
import { postCompletedPuzzle } from '@/api/PostCompleted';
import { supabase } from '@/api/SupabaseClient';

type PuzzleData = {
    fen: string;
    moves: string;
    puzzleid: string;
    rating?: number | string;
};

type MoveNotation = {
    from: string;
    to: string;
    promotion?: string;
};

const splitMoves = (moves: string) => moves.trim().split(/\s+/).filter(Boolean);

const toMoveNotation = (move: string): MoveNotation => ({
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    promotion: move.slice(4) || undefined,
});

export default function DemoPuzzle() {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';
    const styles = GlobalStyle(theme, isTablet);

    const chessboardRef = useRef<any>(null);
    const [chess] = useState(() => new Chess());
    const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null);
    const [puzzleReady, setPuzzleReady] = useState(false);
    const [moves, setMoves] = useState<string[]>([]);
    const [lastFEN, setLastFEN] = useState<string | null>(null);
    const [turn, setTurn] = useState<string | null>(null);
    const [moveNumber, setMoveNumber] = useState(1);
    const [redoUnlocked, setRedoUnlocked] = useState(1);
    const [puzzleCompleted, setPuzzleCompleted] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [undosUsed, setUndosUsed] = useState(0);
    const [redosUsed, setRedosUsed] = useState(0);
    const [hint, setHint] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [isHintExpandable, setIsHintExpandable] = useState(false);

    const hintHeight = useSharedValue(55);
    const hintWidth = useSharedValue(200);
    const hintOpacity = useSharedValue(1);
    const zIndex = useSharedValue(0);
    const openingMovePlayedRef = useRef(false);
    const completionSubmittedRef = useRef(false);

    const hintAnimStyle = useAnimatedStyle(() => ({
        maxHeight: withTiming(hintHeight.value, { duration: 500 }),
        maxWidth: withTiming(hintWidth.value, { duration: 500 }),
        opacity: withTiming(hintOpacity.value, { duration: 500 }),
        pointerEvents: 'none',
    }));

    const hintBubbleStyle = useAnimatedStyle(() => ({
        opacity: withTiming(1 - hintOpacity.value, { duration: 500 }),
        pointerEvents: 'none',
    }));

    const bearHintStyle = useAnimatedStyle(() => ({
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
    }));

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

    useEffect(() => {
        hintHeight.value = expanded ? 300 : (isTablet ? 55 : 45);
        hintWidth.value = (expanded || !isHintExpandable) ? (isTablet ? 500 : 300) : (isTablet ? 100 : 70);
        hintOpacity.value = (expanded || !isHintExpandable) ? 1 : 0;
        zIndex.value = expanded ? 100 : 0;
    }, [expanded, isHintExpandable, hintHeight, hintOpacity, hintWidth, zIndex, isTablet]);

    useEffect(() => {
        if (!puzzleReady || puzzleCompleted) {
            return;
        }

        const interval = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [puzzleReady, puzzleCompleted]);

    useEffect(() => {
        if (!puzzleCompleted || completionSubmittedRef.current || !currentPuzzle) {
            return;
        }

        completionSubmittedRef.current = true;

        const submitCompletion = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user?.id) {
                    return;
                }

                await postCompletedPuzzle({
                    studentid: user.id,
                    puzzleid: String(currentPuzzle.puzzleid),
                    timeElapsed: elapsedTime,
                    hintsUsed,
                    undosUsed,
                    redosUsed,
                    completed: true,
                });
            } catch (submitError) {
                console.error('Failed to submit puzzle completion:', submitError);
            }
        };

        void submitCompletion();
    }, [currentPuzzle, elapsedTime, hintsUsed, puzzleCompleted, redosUsed, undosUsed]);

    const initializePuzzle = (puzzle: PuzzleData) => {
        const nextMoves = splitMoves(puzzle.moves);

        setCurrentPuzzle(puzzle);
        setMoves(nextMoves);
        setLastFEN(puzzle.fen);
        setTurn(getTurnFromFEN(puzzle.fen));
        setMoveNumber(1);
        setRedoUnlocked(1);
        setPuzzleCompleted(false);
        setHint(null);
        setError(null);
        setLoadingHint(false);
        setExpanded(false);
        setIsHintExpandable(false);
        setElapsedTime(0);
        setPuzzleReady(true);

        openingMovePlayedRef.current = false;
        completionSubmittedRef.current = false;

        chess.load(puzzle.fen);

        if (nextMoves.length > 0) {
            const openingMove = toMoveNotation(nextMoves[0]);
            openingMovePlayedRef.current = true;
            chess.move(openingMove);

            setTimeout(async () => {
                await chessboardRef.current?.board.move(openingMove);
            }, 500);
        }
    };

    const handleGetHint = async () => {
        if (!currentPuzzle || puzzleCompleted) {
            return;
        }

        try {
            setHint(null);
            setIsHintExpandable(false);
            setExpanded(false);
            setLoadingHint(true);

            const fetchedHint = await fetchHint(currentPuzzle.puzzleid, 2 * moveNumber);
            setHint(fetchedHint);
            setHintsUsed((count) => count + 1);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            setHint(null);
            setIsHintExpandable(false);
        } finally {
            setLoadingHint(false);
            setIsHintExpandable(true);
            setExpanded(true);
        }
    };

    const resetToStart = () => {
        if (!currentPuzzle || !chessboardRef.current?.board) {
            return;
        }

        chess.load(currentPuzzle.fen);
        chessboardRef.current.board.resetBoard(currentPuzzle.fen);

        setMoveNumber(1);
        setRedoUnlocked(1);
        setPuzzleCompleted(false);
        setHint(null);
        setError(null);
        setIsHintExpandable(false);
        setExpanded(false);
        setLastFEN(currentPuzzle.fen);
        setElapsedTime(0);
        setTurn(getTurnFromFEN(currentPuzzle.fen));

        openingMovePlayedRef.current = false;
        completionSubmittedRef.current = false;

        if (moves.length > 0) {
            const openingMove = toMoveNotation(moves[0]);
            openingMovePlayedRef.current = true;
            chess.move(openingMove);

            setTimeout(async () => {
                await chessboardRef.current?.board.move(openingMove);
            }, 500);
        }
    };

    const handleUndo = () => {
        if (!currentPuzzle || !chessboardRef.current?.board) {
            return;
        }

        chess.undo();

        if (getTurnFromFEN(chess.fen()) === turn) {
            chess.undo();
            setMoveNumber((current) => Math.max(1, current - 1));
        }

        setLastFEN(chess.fen());
        setHint(null);
        setIsHintExpandable(false);
        setExpanded(false);

        if (moveNumber <= 1) {
            resetToStart();
            return;
        }

        chessboardRef.current.board.resetBoard(chess.fen());
        setTurn(getTurnFromFEN(chess.fen()));
        setUndosUsed((count) => count + 1);
    };

    const handleRedo = () => {
        if (!currentPuzzle || !chessboardRef.current?.board) {
            return;
        }

        if (moveNumber >= redoUnlocked) {
            return;
        }

        const redoMove = moves[moveNumber * 2 - 1];
        if (!redoMove) {
            return;
        }

        setTimeout(async () => {
            await chessboardRef.current?.board.move(toMoveNotation(redoMove));
            setRedosUsed((count) => count + 1);
        }, 200);
    };

    const handleMove = ({ state }: { state: { fen: string } }) => {
        if (!turn) {
            return;
        }

        const previousFen = lastFEN;
        setLastFEN(state.fen);

        if (!previousFen || getTurnFromFEN(state.fen) !== turn) {
            return;
        }

        const detectedMove = detectMoveFromFEN(previousFen, state.fen);
        const expectedMove = moves[moveNumber * 2 - 1];

        if (!detectedMove || detectedMove !== expectedMove) {
            setHint('Try again!');
            setIsHintExpandable(false);
            setExpanded(false);
            return;
        }

        chess.move(toMoveNotation(detectedMove));
        setHint(null);
        setIsHintExpandable(false);
        setExpanded(false);

        const followUpMove = moves[moveNumber * 2];
        if (moveNumber >= moves.length / 2 || !followUpMove) {
            setHint('Congratulations! You completed the puzzle!');
            setIsHintExpandable(false);
            setExpanded(true);
            setRedoUnlocked(moveNumber + 1);
            setPuzzleCompleted(true);
            return;
        }

        setMoveNumber((current) => current + 1);
        setHint('Great job! Keep going!');
        setIsHintExpandable(false);
        setExpanded(false);

        const followUpNotation = toMoveNotation(followUpMove);
        setTimeout(async () => {
            chess.move(followUpNotation);
            await chessboardRef.current?.board.move(followUpNotation);
        }, 700);
    };

    const gestureEnabled = Boolean(puzzleReady && lastFEN && turn && getTurnFromFEN(lastFEN) !== turn);
    const bestMoveLabel = moves[2 * moveNumber - 1] ?? '...';
    const ratingLabel = currentPuzzle?.rating ?? '1000';

    return (
        <BackgroundContext theme={theme} style={localStyles.container}>
            <Text style={{ color: theme.primaryText, position: 'absolute', textAlign: 'right', top: 55, right: 5, zIndex: 1000 }}>
                {`BEST: ${bestMoveLabel}\n`}
                {`ID: ${currentPuzzle?.puzzleid ?? 'N/A'}`}
            </Text>

            <Animated.Image
                source={require('@/assets/images/hints/bear.png')}
                style={{ ...bearHintStyle }}
            />

            <ChessboardDemo
                playerBlack={currentPuzzle?.fen?.split(' ')[1] === 'w' || false}
                ref={chessboardRef}
                colors={{ black: theme.player2Square, white: theme.player1Square }}
                isTablet={isTablet}
                onPuzzleLoaded={initializePuzzle}
                onMove={handleMove}
                gestureEnabled={gestureEnabled}
            />

            <Animated.View style={localStyles.hintContainer}>
                <Pressable
                    onPress={() => {
                        if (puzzleCompleted) {
                            setExpanded(true);
                        } else if (isHintExpandable) {
                            setExpanded((current) => !current);
                        }
                    }}
                    style={{ position: 'relative', flexShrink: 1 }}
                >
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.hintBubble} glass="clear" interactive />
                    <Animated.View style={hintAnimStyle}>
                        <Text style={{ ...styles.h4, color: theme.secondaryText, ...localStyles.hintSpeech }}>
                            {loadingHint ? 'Hmmm...' : error ? error : hint ? hint : 'Need a hint?'}
                        </Text>
                    </Animated.View>
                    <Animated.Image
                        source={require('@/assets/images/hints/hint_expand.png')}
                        style={[
                            {
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                transform: [{ scale: 0.5 }],
                                tintColor: theme.secondaryText,
                            },
                            hintBubbleStyle,
                        ]}
                        resizeMode="center"
                    />
                </Pressable>
            </Animated.View>

            <View style={[styles.hStack, { marginTop: isTablet ? -10 : 10, marginBottom: -30 }]}> 
                <View style={localStyles.ratingContainer}>
                    <IconSymbol size={isTablet ? 45 : 30} style={{ marginHorizontal: 5 }} name="puzzlepiece.extension.fill" color={theme.primaryText} />
                    <Text style={[styles.subtitle, { marginLeft: isTablet ? 5 : 0, color: theme.primaryText }]}> 
                        {ratingLabel}
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

            <PuzzleBar onHint={handleGetHint} onUndo={handleUndo} onRedo={handleRedo} onReset={resetToStart} onOptions={null} isTablet={isTablet} />
        </BackgroundContext>
    );
}
