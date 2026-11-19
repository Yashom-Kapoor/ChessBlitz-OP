import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View, ActivityIndicator, StyleSheet, Text, RefreshControl } from 'react-native';
import RankingItem from '@/components/rankings/Rank';
import { useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from '@/context/GlobalStyle';
import { BackgroundContext } from '@/context/Backgrounds';
import { getRankings } from '@/api/Rankings';

type RankingData = Awaited<ReturnType<typeof getRankings>>['rankings'][number];

export default function RankingsScreen() {
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [photosUnavailable, setPhotosUnavailable] = useState(false);
  const requestVersion = useRef(0);

  const fetchRankings = useCallback(async (refresh = false) => {
    const version = ++requestVersion.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const result = await getRankings();
      if (version !== requestVersion.current) return;
      setRankings(result.rankings);
      setPhotosUnavailable(result.photosUnavailable);
    } catch {
      if (version === requestVersion.current) setError(true);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Reload on each visit to pick up photos changed by any player.
  useFocusEffect(useCallback(() => {
    void fetchRankings();
    return () => { requestVersion.current += 1; };
  }, [fetchRankings]));

  const styles = GlobalStyle(theme, isTablet);
  const localStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      padding: 20,
      gap: 20,
      paddingBottom: 100,
    },
  });
  if (loading) {
    return (
      <View style={[localStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primaryText} />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={styles.gapContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void fetchRankings(true); }}
            tintColor={theme.primaryText} colors={[theme.primaryText]} />}>
          {error && (
            <Text style={{ ...styles.b, color: theme.primaryText }}>
              Could not load rankings. Pull down to try again.
            </Text>
          )}
          {!error && photosUnavailable && (
            <Text style={{ ...styles.b, color: theme.primaryText }}>
              Profile photos are temporarily unavailable.
            </Text>
          )}
          {!error && rankings.map((r) => (
            <RankingItem key={r.userId ?? `${r.rank}-${r.name}`} rank={r.rank} name={r.name} rating={r.rating}
              isYou={r.isYou} avatarUrl={r.avatarUrl} />
          ))}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
