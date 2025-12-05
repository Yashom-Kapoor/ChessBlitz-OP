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

// 🔹 Same InfoBox as in ProfileScreen
const InfoBox = ({
  children,
  style,
  theme,
  isTablet,
}: {
  children: React.ReactNode;
  style?: any;
  theme: any;
  isTablet: boolean;
}) => {
  return (
    <View
      style={[
        style,
        {
          borderRadius: isTablet ? 30 : 20,
          padding: isTablet ? 25 : 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          backgroundColor: theme.primaryButton, // 🔵 blue block background
        },
      ]}
    >
      {children}
    </View>
  );
};

export default function PuzzlesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  const styles = GlobalStyle(theme, isTablet);

  const localStyles = StyleSheet.create({
    puzzleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 20,
    },
    puzzleCard: {
      width: isTablet ? '31%' : '47%',
      alignItems: 'center',
    },
    puzzleIconContainer: {
      width: 60,
      height: 60,
      borderRadius: isTablet ? 30 : 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    puzzleIcon: {
      fontSize: 28,
    },
    puzzleTitle: {
      color: theme.primaryText, // same as ProfileScreen
      marginBottom: 8,
    },
    puzzleRating: {
      color: `${theme.primaryText}DD`, // slightly different white, same as ProfileScreen
      marginTop: -5,
    },
    ratingLabel: {
      color: `${theme.primaryText}60`, // gray "Rating", same as ProfileScreen
      marginTop: 2,
    },
    bottomSpacing: {
      height: 30,
    },
  });

  type PuzzleTypeCardProps = {
    title: string;
    rating: number;
    icon: string;
    color: string;
  };

  const [userData, setUserData] = useState({
    name: 'Chess Master',
    email: 'chessmaster@example.com',
    password: '••••••••',
    joinDate: 'June 2024',
    totalPuzzlesSolved: 1247,
    overallRating: 1842,
    puzzleRatings: {
      fork: 1890,
      pin: 1820,
      skewer: 1765,
      checkmate: 1950,
      sacrifice: 1800,
      defense: 1825,
    },
  });

  const puzzleTypes = [
    { title: 'Fork',      rating: userData.puzzleRatings.fork,      icon: '⚔️', color: '#FF6B6B' },
    { title: 'Pin',       rating: userData.puzzleRatings.pin,       icon: '📌', color: '#4ECDC4' },
    { title: 'Skewer',    rating: userData.puzzleRatings.skewer,    icon: '🎯', color: '#45B7D1' },
    { title: 'Checkmate', rating: userData.puzzleRatings.checkmate, icon: '👑', color: '#96CEB4' },
    { title: 'Sacrifice', rating: userData.puzzleRatings.sacrifice, icon: '⚡️', color: '#FFEAA7' },
    { title: 'Defense',   rating: userData.puzzleRatings.defense,   icon: '🛡️', color: '#DFE6E9' },
  ];

  const PuzzleTypeCard = ({ title, rating, icon, color }: PuzzleTypeCardProps) => {
    return (
      <InfoBox style={localStyles.puzzleCard} theme={theme} isTablet={isTablet}>
        {/* colored circle/block behind icon */}
        <View style={[localStyles.puzzleIconContainer, { backgroundColor: color }]}>
          <Text style={localStyles.puzzleIcon}>{icon}</Text>
        </View>

        {/* text colors exactly as in ProfileScreen */}
        <Text style={[styles.h5, localStyles.puzzleTitle]}>{title}</Text>
        <Text style={[styles.h2, localStyles.puzzleRating]}>{rating}</Text>
        <Text style={[styles.h6, localStyles.ratingLabel]}>Rating</Text>
      </InfoBox>
    );
  };

  return (
    <GestureHandlerRootView style={styles.contentContainer}>
      <BackgroundContext theme={theme}>
        <ScrollView
          contentContainerStyle={{
            ...styles.scrollContainer,
            alignItems: 'flex-start',
          }}
        >
          {/* Top Demo Puzzle Button */}
          <TouchableOpacity
            style={{ ...styles.flexBigButton, justifyContent: 'center' }}
            onPress={() => {
              router.push(`/puzzles/demo_puzzle?isTablet=${isTablet}`);
            }}
          >
            <ImageBackground
              source={require('@/assets/images/puzzle.png')}
              style={StyleSheet.absoluteFill}
            />
            <GlassBlurView
              theme={theme}
              isTablet={isTablet}
              color={theme.player1Square}
              glass="clear"
            />
            <Text style={[styles.h1, { color: theme.secondaryText, width: '100%', textAlign: 'center' }]}>
              Practice Puzzle
            </Text>
          </TouchableOpacity>

          {/* Puzzle Ratings Section */}
          <Text
            style={[
              styles.subtitle,
              { textAlign: 'center', marginTop: 10, width: '100%' },
            ]}
          >
            Puzzle Ratings
          </Text>

          <View style={localStyles.puzzleGrid}>
            {puzzleTypes.map((puzzle, index) => (
              <PuzzleTypeCard
                key={index}
                title={puzzle.title}
                rating={puzzle.rating}
                icon={puzzle.icon}
                color={puzzle.color}
              />
            ))}
          </View>

          <View style={localStyles.bottomSpacing} />
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
