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
  icon: string;
  elo: number;
  streak: number;
  isYou:boolean;
};
//Creates a new player profile to display with given/default properties
const CreateProfile = ({ 
  rank = 1337, 
  name ="PLACEHOLDER", 
  icon="", 
  elo=0, 
  streak=0, 
  isYou=false}):RankingData => {
  return {rank: rank, name: name, icon: icon, elo: elo, streak: streak, isYou: isYou}
}
const placeholderNames = ["Alice", "Bob", "Charlie", "Diana", "EVAN LANCASTER"]

export default function RankingsScreen() {
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [boardScope, setBoardScope] = useState("Global"); //"Global"/"Friends" | Determines tbe scope of the people the leaderboard will display
  const [category, setCategory] = useState("Elo"); //"Elo"/"Streak"/"Time" | Determines how the leaderboard is sorted

  const API_URL = "http://127.0.0.1:5000/rankings";
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        // const response = await fetch(API_URL);
        // const data = await response.json();

        
        // setRankings(placeholderNames.map((n, i) => (
        //   CreateProfile({rank: i+1, name: n, isYou: n === "EVAN LANCASTER"})
        // ))); //Sets placeholder names
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
              isYou={r.isYou}
              icon={
                r.icon
                  ? { uri: r.icon }
                  : require('@/assets/images/TUNG TUNG.png') //PLACEHOLDER IMAGE
              }
            />
          ))}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}