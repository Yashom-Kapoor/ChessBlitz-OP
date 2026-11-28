import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getMyRatings, ThemeRatings } from '@/api/Ratings';
import ThemeRatingsList from '@/components/puzzles/ThemeRatingsList';
import ThemePuzzleGrid from '@/components/puzzles/ThemePuzzleGrid';
import PageHeading from '@/components/PageHeading';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePuzzleBoard } from '@/context/PuzzleBoardContext';
import { useShop } from '@/context/ShopContext';
import { BOARD_REWARD } from '@/api/BoardReward';
import { BLITZ_COLOR } from '@/constants/Blitz';
import { useUnlockedThemes } from '@/hooks/useUnlockedThemes';
import { darken } from '@/constants/PuzzleThemes';
import { useTheme } from '@/context/ThemeContext';
import { BackgroundContext } from '@/context/Backgrounds';
import GlobalStyle from '@/context/GlobalStyle';
import { useIsTablet } from '@/hooks/useIsTablet';
import { isCompletionPending, waitForPendingCompletion } from '@/utils/pendingCompletion';

/** Accent for the Rated Puzzles board and its buttons. Must be #RRGGBB (the grid tints it). */
export const RATED_BOARD_COLOR = '#4C6EF5';

// Copy is a first pass; the wording is still being worked out.
export const RATED_PUZZLES_TITLE = 'Rated Puzzles';
export const RATED_PUZZLES_SUBTITLE = 'These count! Each one you solve changes your rating.';

export default function PuzzlesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const styles = GlobalStyle(theme, isTablet);
  const unlockedThemes = useUnlockedThemes();
  const puzzleBoard = usePuzzleBoard();
  const board = puzzleBoard?.board ?? null;
  const ensure = puzzleBoard?.ensure;

  useEffect(() => { ensure?.(); }, [ensure]);

  const { loadShop } = useShop();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const claimReward = async () => {
    if (claiming || !puzzleBoard) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await puzzleBoard.claim();
      void loadShop();
    } catch {
      setClaimError("Couldn't claim your blitz. Try again!");
    } finally {
      setClaiming(false);
    }
  };

  const [ratings, setRatings] = useState<ThemeRatings | null>(null);
  const [ratingsUpdating, setRatingsUpdating] = useState(false);

  // Refetch whenever the tab comes back into focus, so ratings update after solving a puzzle.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      // A just-solved puzzle may still be saving: show spinners, not the old ratings, until it's in.
      if (isCompletionPending()) setRatingsUpdating(true);
      waitForPendingCompletion()
        .then(() => (active ? getMyRatings() : null))
        .then((data) => { if (active && data) setRatings(data); })
        .catch((error) => console.log('Error loading theme ratings:', error))
        .finally(() => { if (active) setRatingsUpdating(false); });
      return () => { active = false; };
    }, [])
  );

  const solved = board?.status === 'ready' ? board.completedIds.length : 0;
  const buttonStyle = [localStyles.actionButton, {
    backgroundColor: RATED_BOARD_COLOR,
    borderBottomColor: darken(RATED_BOARD_COLOR, 0.22),
    minHeight: isTablet ? 68 : 58,
  }];

  return (
    <GestureHandlerRootView style={{ ...styles.contentContainer }}>
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={{
          paddingTop: isTablet ? 40 : 24,
          paddingHorizontal: isTablet ? 36 : 20,
          paddingBottom: insets.bottom + 40,
        }}>
          <View style={localStyles.content}>
            <PageHeading tab="puzzles" title={RATED_PUZZLES_TITLE} subtitle={RATED_PUZZLES_SUBTITLE} />

            <View style={{ marginTop: isTablet ? 32 : 24 }}>
              {board?.status === 'ready' ? (
                <>
                  <ThemePuzzleGrid color={RATED_BOARD_COLOR} title="Rated" puzzleIds={board.puzzleIds}
                    completedIds={board.completedIds}
                    onSelect={puzzleId => router.push({ pathname: '/puzzles/demo_puzzle',
                      params: { puzzle: puzzleId, boardSession: board.id } })} />
                  <Text accessibilityLiveRegion="polite" style={[localStyles.progress, {
                    color: theme.primaryText, fontSize: isTablet ? 24 : 20,
                  }]}>
                    {solved} of 9 solved
                  </Text>
                  {solved === 9 && !board.claimed && (
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Claim ${BOARD_REWARD} blitz`}
                      accessibilityState={{ disabled: claiming, busy: claiming }} disabled={claiming}
                      onPress={claimReward} style={[buttonStyle, localStyles.claimButton]}>
                      {claiming ? <ActivityIndicator testID="claim-spinner" color="#FFFFFF" /> : (
                        <>
                          <MaterialCommunityIcons name="lightning-bolt" size={isTablet ? 32 : 28} color={BLITZ_COLOR} />
                          <Text style={[localStyles.buttonText, { fontSize: isTablet ? 24 : 20 }]}>
                            Claim {BOARD_REWARD}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {claimError && (
                    <Text accessibilityRole="alert" style={[localStyles.statusText, { color: theme.primaryText }]}>
                      {claimError}
                    </Text>
                  )}
                </>
              ) : board?.status === 'error' ? (
                <View style={localStyles.status}>
                  <Text accessibilityRole="alert" style={[localStyles.statusText, { color: theme.primaryText }]}>
                    {board.error}
                  </Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading puzzles"
                    onPress={() => puzzleBoard?.retry()} style={buttonStyle}>
                    <Text style={[localStyles.buttonText, { fontSize: isTablet ? 24 : 20 }]}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={localStyles.status}>
                  <ActivityIndicator size="large" color={RATED_BOARD_COLOR} />
                  <Text style={[localStyles.statusText, { color: theme.primaryText }]}>Loading your puzzles…</Text>
                </View>
              )}
            </View>

            <Text style={[styles.subtitle, localStyles.ratingsHeading, { marginTop: isTablet ? 56 : 40,
              marginBottom: isTablet ? 24 : 18 }]}>
              Puzzle Ratings
            </Text>
            <ThemeRatingsList ratings={ratings} isTablet={isTablet} unlockedThemes={unlockedThemes}
              updating={ratingsUpdating} />
          </View>
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}

const localStyles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  progress: { fontFamily: 'Nunito', fontWeight: '900', textAlign: 'center', marginTop: 18 },
  status: { minHeight: 280, justifyContent: 'center' },
  statusText: { fontFamily: 'Nunito', fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  actionButton: { borderRadius: 24, borderBottomWidth: 6, padding: 14, marginTop: 18,
    alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Nunito', fontWeight: '900', color: '#FFFFFF' },
  claimButton: { flexDirection: 'row', gap: 8 },
  ratingsHeading: { textAlign: 'center', width: '100%' },
});
