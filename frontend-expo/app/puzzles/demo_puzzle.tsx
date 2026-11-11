import { getPuzzleActionAvailability } from '@/components/puzzles/puzzleActions';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import ChessboardDemo from '@/components/puzzles/ChessboardDemo';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { secondsToHMS } from '@/utils/Time';
import { getHintTiers } from '@/api/GetHintTiers';
import { getWrongMoveMessage, WRONG_MOVE_FALLBACK } from '@/api/WrongMove';
import {
    HintState,
    NO_HINTS_MESSAGE,
    NO_MORE_HINTS_MESSAGE,
    hintButtonLabel,
    initialHintState,
    revealNext,
    revealedHints,
    withTiers,
} from '@/utils/hintTiers';
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
import PuzzleDevHUD from '@/components/puzzles/PuzzleDevHUD';
import WrongMovePrompt from '@/components/puzzles/WrongMovePrompt';

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

    // `?puzzle=<id>` loads a specific puzzle; without it ChessboardDemo serves a random one.
    const puzzleParam = useLocalSearchParams().puzzle;
    const requestedPuzzleId = typeof puzzleParam === 'string' ? puzzleParam : undefined;

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
    // `hint` is the short message at the top of the bubble (wrong-move feedback, "Great job!", ...).
    // The tiered hints for the current move live in `hintState` and are listed under it.
    const [hint, setHint] = useState<string | null>(null);
    const [hintState, setHintState] = useState<HintState>(() => initialHintState(1));
    const [loadingHint, setLoadingHint] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [isHintExpandable, setIsHintExpandable] = useState(false);
    const [pendingMove, setPendingMove] = useState(false);
    const [retryFen, setRetryFen] = useState<string | null>(null);
    const actionAvailability = getPuzzleActionAvailability({
        ready: Boolean(puzzleReady && currentPuzzle !== null && lastFEN && turn && chessboardRef.current?.board),
        playerTurn: Boolean(lastFEN && turn && getTurnFromFEN(lastFEN) !== turn),
        retrying: Boolean(retryFen),
        completed: Boolean(puzzleCompleted),
        loadingHint,
        pendingMove,
        moveNumber,
        redoUnlocked: redoUnlocked ?? 1,
        hasProgress: chess.history().length > 1,
        hasRedoMove: Boolean(moves[moveNumber * 2 - 1]),
    });

    const hintHeight = useSharedValue(55);
    const hintWidth = useSharedValue(200);
    const hintOpacity = useSharedValue(1);
    const zIndex = useSharedValue(0);
    const openingMovePlayedRef = useRef(false);
    const completionSubmittedRef = useRef(false);
    // Hints belong to one player move. After a correct move, undo or redo, `moveNumber` changes and
    // the hints start again at tier 1 without needing an extra state update.
    const activeHints = hintState.moveIndex === moveNumber ? hintState : initialHintState(moveNumber);
    // Latest hint state, for async callbacks that finish after the player has moved on.
    const hintStateRef = useRef(activeHints);
    useEffect(() => {
        hintStateRef.current = activeHints;
    }, [activeHints]);
    // Bumped on every move, undo and reset so a slow /wrong-move reply can't land on a later position.
    const wrongMoveRequestRef = useRef(0);

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
        boardWrapper: {
            position: 'relative',
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
        // Expanded height leaves room for several hint tiers stacked under each other.
        hintHeight.value = expanded ? (isTablet ? 520 : 420) : (isTablet ? 55 : 45);
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
        setHintState(initialHintState(1));
        setLoadingHint(false);
        setExpanded(false);
        setIsHintExpandable(false);
        setRetryFen(null);
        setElapsedTime(0);
        setPuzzleReady(true);
        wrongMoveRequestRef.current += 1;

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

    // Each tap reveals the next tier for the current move. Tiers are loaded on the first tap.
    const handleGetHint = async () => {
        if (!actionAvailability.hint || !currentPuzzle) {
            return;
        }

        const forMove = activeHints.moveIndex;
        let state = activeHints;

        if (state.tiers === null) {
            setLoadingHint(true);
            setIsHintExpandable(false);
            setExpanded(false);

            let tiers: string[] | null = null;
            try {
                tiers = await getHintTiers(currentPuzzle.puzzleid, forMove);
            } catch (err) {
                console.warn('Hint lookup failed:', err);
            } finally {
                setLoadingHint(false);
            }

            // The player moved, undid or reset while we were loading: drop this result.
            if (hintStateRef.current.moveIndex !== forMove) {
                return;
            }

            if (tiers === null) {
                // Leave tiers unloaded so the next tap tries again.
                setHint("Couldn't get a hint right now. Try again in a moment.");
                setIsHintExpandable(true);
                setExpanded(true);
                return;
            }

            state = withTiers(hintStateRef.current, tiers);
        }

        const next = revealNext(state);
        setHintState(next);

        if (next.revealed > state.revealed) {
            setHint(null);
            setHintsUsed((count) => count + 1);
        } else {
            setHint(next.tiers && next.tiers.length > 0 ? NO_MORE_HINTS_MESSAGE : NO_HINTS_MESSAGE);
        }

        setIsHintExpandable(true);
        setExpanded(true);
    };

    const resetToStart = () => {
        if (!actionAvailability.reset) return;
        if (!currentPuzzle || !chessboardRef.current?.board) {
            return;
        }

        chess.load(currentPuzzle.fen);
        chessboardRef.current.board.resetBoard(currentPuzzle.fen);

        setMoveNumber(1);
        setRedoUnlocked(1);
        setPuzzleCompleted(false);
        setHint(null);
        setHintState(initialHintState(1));
        setIsHintExpandable(false);
        setExpanded(false);
        setRetryFen(null);
        setLastFEN(currentPuzzle.fen);
        wrongMoveRequestRef.current += 1;
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
        if (!actionAvailability.undo) return;
        if (!currentPuzzle || !chessboardRef.current?.board) {
            return;
        }

        // Drop a slow /wrong-move reply so it cannot land after this undo.
        wrongMoveRequestRef.current += 1;

        if (retryFen) {
            // Wrong moves only reach the displayed board; preserve the engine's undo history.
            chessboardRef.current.board.resetBoard(chess.fen());
            setLastFEN(chess.fen());
            setRetryFen(null);
            setHint(null);
            setIsHintExpandable(false);
            setExpanded(false);
            setUndosUsed((count) => count + 1);
            return;
        }

        setPuzzleCompleted(false);
        chess.undo();

        if (getTurnFromFEN(chess.fen()) === turn) {
            chess.undo();
            setMoveNumber((current) => Math.max(1, current - 1));
        }

        setLastFEN(chess.fen());
        setHint(null);
        setIsHintExpandable(false);
        setExpanded(false);

        chessboardRef.current.board.resetBoard(chess.fen());
        setTurn(getTurnFromFEN(currentPuzzle.fen));
        setUndosUsed((count) => count + 1);
    };

    const handleRedo = () => {
        if (!actionAvailability.redo || !chessboardRef.current?.board) return;
        const redoMove = moves[moveNumber * 2 - 1];
        if (!redoMove) return;

        setPendingMove(true);
        setTimeout(async () => {
            try {
                await chessboardRef.current?.board.move(toMoveNotation(redoMove));
                setRedosUsed((count) => count + 1);
            } finally {
                setPendingMove(false);
            }
        }, 200);
    };

    // A wrong move: ask /wrong-move (Ticket 5, mocked for now) what kind of mistake it was, show a
    // short message, and put the piece back so the player can try again. Earlier hints stay listed.
    const handleWrongMove = (previousFen: string, playedMove: string | null) => {
        const requestId = ++wrongMoveRequestRef.current;

        setHint('Hmmm...');
        setIsHintExpandable(false);
        setExpanded(false);

        setTimeout(() => {
            if (requestId !== wrongMoveRequestRef.current) {
                return;
            }
            chessboardRef.current?.board?.resetBoard(previousFen);
            setLastFEN(previousFen);
        }, 600);

        const showMessage = (message: string) => {
            if (requestId !== wrongMoveRequestRef.current) {
                return;
            }
            setHint(message);
            setIsHintExpandable(true);
            setExpanded(true);
        };

        if (!currentPuzzle || !playedMove) {
            showMessage(WRONG_MOVE_FALLBACK);
            return;
        }

        void getWrongMoveMessage({
            puzzleId: currentPuzzle.puzzleid,
            moveIndex: moveNumber,
            move: playedMove,
        }).then(showMessage);
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
            setRetryFen(previousFen);
            handleWrongMove(previousFen, detectedMove);
            return;
        }

        setRedoUnlocked((current) => Math.max(current, moveNumber + 1));
        setRetryFen(null);
        wrongMoveRequestRef.current += 1;
        chess.move(toMoveNotation(detectedMove));
        // Clear this move's hints, including after the last move of the puzzle.
        setHintState(initialHintState(moveNumber + 1));
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

    const gestureEnabled = Boolean(puzzleReady && !pendingMove && !retryFen && lastFEN && turn && getTurnFromFEN(lastFEN) !== turn);
    const bestMoveLabel = moves[2 * moveNumber - 1] ?? '...';
    const ratingLabel = currentPuzzle?.rating ?? '1000';
    // The message (if any) first, then every tier revealed so far for this move.
    const bubbleText = loadingHint
        ? 'Hmmm...'
        : [hint, ...revealedHints(activeHints)].filter(Boolean).join('\n\n') || 'Need a hint?';

    return (
        <BackgroundContext theme={theme} style={localStyles.container}>
            <PuzzleDevHUD puzzleId={currentPuzzle?.puzzleid} bestMove={bestMoveLabel} />

            <Animated.Image
                source={require('@/assets/images/hints/bear.png')}
                style={{ ...bearHintStyle }}
            />

            <View style={localStyles.boardWrapper}>
                <ChessboardDemo
                    playerBlack={currentPuzzle?.fen?.split(' ')[1] === 'w' || false}
                    ref={chessboardRef}
                    colors={{ black: theme.player2Square, white: theme.player1Square }}
                    isTablet={isTablet}
                    puzzleId={requestedPuzzleId}
                    onPuzzleLoaded={initializePuzzle}
                    onMove={handleMove}
                    gestureEnabled={gestureEnabled}
                />
                <WrongMovePrompt visible={Boolean(retryFen)} onTryAgain={handleUndo} isTablet={isTablet} />
            </View>

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
                            {bubbleText}
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

            <PuzzleBar onHint={handleGetHint} hintLabel={hintButtonLabel(activeHints)} onUndo={handleUndo} onRedo={handleRedo} onReset={resetToStart} available={actionAvailability} isTablet={isTablet} />
        </BackgroundContext>
    );
}
