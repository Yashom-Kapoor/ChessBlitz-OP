import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Platform, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import backgroundImages, { BackgroundContext } from '@/context/Backgrounds';
import { ArtThemes } from '@/constants/Themes';
import { BlurView } from 'expo-blur';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from '@/components/GlassBlurView';

export default function PuzzlesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  const styles = GlobalStyle(theme, isTablet);
  const puzzlesStyles = StyleSheet.create({
    
  });

  return (
    <GestureHandlerRootView style={styles.contentContainer} >
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity
            style={styles.flexBigButton}
            onPress={() => {
              router.push(`/puzzles/demo_puzzle?isTablet=${isTablet}`);
            }}
          >
            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
            <Text style={[styles.h1, { color: theme.secondaryText }]}>
              Demo Puzzle:
            </Text>
            <Text style={[styles.h3, { color: theme.secondaryText }]}>
              example title
            </Text>
          </TouchableOpacity>

          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: isTablet ? 30 : 20}}>
            <TouchableOpacity
              style={[styles.flexButton, { flex: 1 }]}
              onPress={() => router.navigate(`/?isTablet=${isTablet}`)}
            >
              <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
              <Text style={[styles.h2, { color: theme.primaryText }]}>
                Streak
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.flexButton, { flex: 2 }]}
              onPress={() => router.navigate(`/?isTablet=${isTablet}`)}
            >
              <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
              <Text style={[styles.h2, { color: theme.primaryText }]}>
                Leaderboard
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}