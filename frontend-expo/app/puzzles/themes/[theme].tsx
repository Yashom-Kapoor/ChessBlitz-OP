import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { PUZZLE_THEMES, PUZZLE_THEME_TEXT_COLOR } from '@/constants/PuzzleThemes';
import ThemePuzzleGrid from '@/components/puzzles/ThemePuzzleGrid';
import { useThemePuzzleSessions } from '@/context/ThemePuzzleSessionContext';

export default function PuzzleThemeScreen() {
  const params = useLocalSearchParams<{ theme: string; isTablet?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isTablet = params.isTablet === 'true';
  const puzzle = PUZZLE_THEMES.find(item => item.key === params.theme);
  const puzzleSessions = useThemePuzzleSessions();
  const session = puzzle ? puzzleSessions?.sessions[puzzle.key] : undefined;
  const ensure = puzzleSessions?.ensure;
  useEffect(() => {
    if (puzzle) ensure?.(puzzle.key);
  }, [puzzle, ensure]);
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/(tabs)/puzzles', params: { isTablet: String(isTablet) } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={{ paddingTop: insets.top, backgroundColor: theme.primaryButton }}>
        <View style={[styles.header, { minHeight: isTablet ? 100 : 80 }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.primaryText, fontSize: isTablet ? 40 : 30 }]}>Puzzles</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to puzzles" onPress={back}
            style={[styles.back, { left: Math.max(insets.left, 12) }]}>
            <Ionicons name="arrow-back" size={isTablet ? 34 : 28} color={theme.primaryText} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: isTablet ? 36 : 24,
        paddingHorizontal: Math.max(insets.left, insets.right, isTablet ? 36 : 24),
        paddingBottom: insets.bottom + 32 }}>
        {puzzle ? (
          <View style={styles.content}>
            <View style={[styles.banner, { backgroundColor: puzzle.color, padding: isTablet ? 28 : 22,
              borderRadius: isTablet ? 28 : 20 }]}>
              <Text accessibilityRole="header" style={[styles.themeTitle, { color: PUZZLE_THEME_TEXT_COLOR,
                fontSize: isTablet ? 34 : 28, lineHeight: isTablet ? 42 : 36 }]}>{puzzle.title}</Text>
              <Text style={[styles.description, { color: PUZZLE_THEME_TEXT_COLOR,
                fontSize: isTablet ? 20 : 16, lineHeight: isTablet ? 28 : 23 }]}>{puzzle.description}</Text>
            </View>
            <View style={{ marginTop: isTablet ? 64 : 40 }}>
              {session?.status === 'ready' ? (
                <>
                  <ThemePuzzleGrid color={puzzle.color} title={puzzle.title} puzzleIds={session.puzzleIds}
                    completedIds={session.completedIds}
                    onSelect={puzzleId => router.push({ pathname: '/puzzles/demo_puzzle',
                      params: { puzzle: puzzleId, theme: puzzle.key, themeSession: session.id, isTablet: String(isTablet) } })} />
                  <Text accessibilityLiveRegion="polite" style={[styles.progress, { color: theme.primaryText }]}>
                    {session.completedIds.length} of 9 complete
                  </Text>
                  {session.completedIds.length === 9 ? (
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reset puzzles"
                      onPress={() => puzzleSessions?.reset(puzzle.key)}
                      style={[styles.actionButton, { backgroundColor: puzzle.color }]}>
                      <Text style={[styles.themeTitle, { color: PUZZLE_THEME_TEXT_COLOR, fontSize: 20 }]}>Reset puzzles</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.instruction, { color: theme.primaryText }]}>Choose a piece to solve its puzzle.</Text>
                  )}
                </>
              ) : session?.status === 'error' ? (
                <View style={styles.status}>
                  <Text accessibilityRole="alert" style={[styles.instruction, { color: theme.primaryText }]}>{session.error}</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading puzzles"
                    onPress={() => puzzleSessions?.retry(puzzle.key)}
                    style={[styles.actionButton, { backgroundColor: puzzle.color }]}>
                    <Text style={[styles.themeTitle, { color: PUZZLE_THEME_TEXT_COLOR, fontSize: 20 }]}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.status}>
                  <ActivityIndicator size="large" color={puzzle.color} />
                  <Text style={[styles.instruction, { color: theme.primaryText }]}>Loading your nine puzzles…</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.themeTitle, { color: theme.primaryText, fontSize: 24 }]}>Theme not found</Text>
            <Text style={[styles.description, { color: theme.primaryText, fontSize: 16, marginTop: 12 }]}>
              Go back to Puzzles and choose a theme from the list.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 68 },
  heading: { fontFamily: 'Nunito', fontWeight: '900', textAlign: 'center' },
  back: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  banner: { gap: 8 },
  themeTitle: { fontFamily: 'Nunito', fontWeight: '800' },
  description: { fontFamily: 'Nunito', fontWeight: '600' },
  actionButton: { minHeight: 56, borderRadius: 20, padding: 16, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  progress: { fontFamily: 'Nunito', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 24 },
  instruction: { fontFamily: 'Nunito', fontSize: 16, textAlign: 'center', marginTop: 12 },
  status: { minHeight: 240, justifyContent: 'center' },
});
