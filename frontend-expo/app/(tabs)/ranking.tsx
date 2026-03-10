import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import RankingItem from '@/components/rankings/Rank';
import { useGlobalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from "@/context/GlobalStyle";
import backgroundImages, { BackgroundContext } from "@/context/Backgrounds";
type RankingData = {
  rank: number;
  name: string;
  icon?: string;
};
export default function RankingsScreen() {
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const API_URL = "http://127.0.0.1:5000/rankings";
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        // const response = await fetch(API_URL);
        // const data = await response.json();
        setRankings([
          { rank: 1, name: "Alice", icon: "" },
          { rank: 2, name: "Bob", icon: "" },
          { rank: 3, name: "Charlie", icon: "" },
          { rank: 4, name: "Diana", icon: "" },
          { rank: 5, name: "Ethan", icon: "" },
        ]);
      } catch (error) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);
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
      <View style={[localStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primaryText} />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {error && (
            <Text style={{ ...styles.b, color: theme.primaryText }}>
              Error loading rankings :(((((
            </Text>
          )}
          {!error && rankings.map((r) => (
            <RankingItem
              key={r.rank}
              rank={r.rank}
              name={r.name}
              icon={
                r.icon
                  ? { uri: r.icon }
                  : require('@/assets/images/icon.png')
              }
            />
          ))}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}