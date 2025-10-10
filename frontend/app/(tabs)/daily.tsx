import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SectionList, ImageBackground } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import Chessboard from 'react-native-chessboard';
import { GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { fetchRandomPuzzle } from '@/components/RandomPuzzle';
import ChessboardDemo from '@/components/ChessboardDemo';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ArtThemes } from '@/constants/Colors';
import backgroundImages from '@/components/utils/backgrounds';

export default function DailyScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      padding: 20,
      alignItems: 'center',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 20,
    },
  
    dailyPuzzleButton: {
      backgroundColor: theme.secondaryButton,
      padding: 30,
      borderRadius: 10,
      width: '100%',
      height: 200,
    },
    dailyPuzzleButtonText: {
      fontSize: 30,
      lineHeight: 30,
      fontWeight: 'bold',
      textAlign: 'left',
      color: theme.secondaryText,
    },
    dailyPuzzleButtonSplash: {
      fontSize: 20,
      lineHeight: 36,
      fontStyle: 'italic',
      textAlign: 'left',
      color: theme.secondaryText,
    },
  
    streakButton: {
      backgroundColor: theme.secondaryButton,
      padding: 20,
      borderRadius: 10,
      width: '100%',
      height: 140,
      flex: 1,
    },
  
    rankingButton: {
      backgroundColor: theme.secondaryButton,
      padding: 20,
      borderRadius: 10,
      width: '100%',
      height: 140,
      flex: 2,
    }
  
  });

  return (
    <GestureHandlerRootView style={styles.container} >
      <ImageBackground
        source={backgroundImages[theme.name] || null}
        style={{flex:1}}
        imageStyle={{opacity:0.7}}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <Pressable
            style={styles.dailyPuzzleButton}
            onPress={() => router.push('/puzzles/daily-puzzle')}
          >
            <ThemedText style={styles.dailyPuzzleButtonText}>
              Daily Puzzle #x:
            </ThemedText>
            <ThemedText style={styles.dailyPuzzleButtonSplash}>
              example title
            </ThemedText>
          </Pressable>

          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: 20}}>
            <Pressable
              style={styles.streakButton}
              onPress={() => router.navigate('/')}
            >
              <ThemedText style={{ fontSize: 20, color: theme.secondaryText }}>
                Streak
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.rankingButton}
              onPress={() => router.navigate('/')}
            >
              <ThemedText style={{ fontSize: 20, color: theme.secondaryText }}>
                Leaderboard
              </ThemedText>
            </Pressable>
          </View>

        </ScrollView>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}