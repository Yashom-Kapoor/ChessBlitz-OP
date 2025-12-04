import GlassBlurView from '@/components/GlassBlurView';
import backgroundImages, { BackgroundContext } from '@/context/Backgrounds';
import GlobalStyle from '@/context/GlobalStyle';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ImageBackground } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const InfoBox = ({ children, style, theme, isTablet }: { children: React.ReactNode, style?: any, theme: any, isTablet: boolean }) => {
  return (
    <View style={[style, {
      borderRadius: isTablet ? 30 : 20,
      padding: isTablet ? 25 : 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      backgroundColor: theme.primaryButton,
    }]}>
      {children}
    </View>
  );
};

export default function ProfileScreen() {
  type PuzzleTypeCardProps = {
    title: string;
    rating: number;
    icon: string;
    color: string;
  };

  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const styles = GlobalStyle(theme, isTablet);

  const PuzzleTypeCard = ({ title, rating, icon, color }: PuzzleTypeCardProps) => {
    return (
      <InfoBox style={localStyles.puzzleCard} theme={theme} isTablet={isTablet} >
        <View style={[localStyles.puzzleIconContainer, { backgroundColor: color }]}>
          <Text style={localStyles.puzzleIcon}>{icon}</Text>
        </View>
        <Text style={[styles.h5, localStyles.puzzleTitle]}>{title}</Text>
        <Text style={[styles.h2, localStyles.puzzleRating]}>{rating}</Text>
        <Text style={[styles.h6, localStyles.ratingLabel]}>Rating</Text>
      </InfoBox>
    );
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
      defense: 1825
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const puzzleTypes = [
    { title: 'Fork', rating: userData.puzzleRatings.fork, icon: '⚔️', color: '#FF6B6B' },
    { title: 'Pin', rating: userData.puzzleRatings.pin, icon: '📌', color: '#4ECDC4' },
    { title: 'Skewer', rating: userData.puzzleRatings.skewer, icon: '🎯', color: '#45B7D1' },
    { title: 'Checkmate', rating: userData.puzzleRatings.checkmate, icon: '👑', color: '#96CEB4' },
    { title: 'Sacrifice', rating: userData.puzzleRatings.sacrifice, icon: '⚡️', color: '#FFEAA7' },
    { title: 'Defense', rating: userData.puzzleRatings.defense, icon: '🛡️', color: '#DFE6E9' }
  ];

  const localStyles = StyleSheet.create({
    header: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    avatarContainer: {
      width: isTablet ? 120 : 100,
      height: isTablet ? 120 : 100,
      borderRadius: 100,
      backgroundColor: theme.hintBubble,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isTablet ? 30 : 15,
    },
    avatarText: {
      fontSize: isTablet ? 40 : 36,
      fontWeight: 'bold',
      color: theme.secondaryText,
    },
    editButton: {
      paddingHorizontal: isTablet ? 28 : 22,
      paddingVertical: isTablet ? 14 : 10,
      borderRadius: isTablet ? 30 : 20,
      marginTop: 10,
    },
    generalInfoBox: {
      marginTop: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    icon: {
      fontSize: isTablet ? 26 : 20,
      marginRight: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoValue: {
      color: theme.primaryText,
    },
    input: {
      color: theme.primaryText,
      borderBottomWidth: 1,
      borderBottomColor: theme.buttonShadow,
      paddingVertical: 4,
    },
    divider: {
      height: 1,
      backgroundColor: `${theme.primaryText}20`,
      marginVertical: 20,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: 20,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statIcon: {
      fontSize: isTablet ? 30 : 24,
    },
    statDivider: {
      width: 1,
      height: 60,
      backgroundColor: theme.buttonShadow,
    },
    statValue: {
      color: theme.primaryText,
      marginTop: 8,
    },
    statLabel: {
      color: `${theme.primaryText}60`,
      marginTop: 4,
      textAlign: 'center',
    },
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
      color: theme.primaryText,
      marginBottom: 8,
    },
    puzzleRating: {
      color: `${theme.primaryText}DD`, // change to alternative, slightly saturated
      marginTop: -5,
    },
    ratingLabel: {
      color: `${theme.primaryText}60`,
      marginTop: 2,
    },
    bottomSpacing: {
      height: 30,
    },
  });

  return (
    <GestureHandlerRootView style={styles.contentContainer} >
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>

          {/* Header Section */}
          <View style={localStyles.header}>
            <View style={localStyles.avatarContainer}>
              <Text style={localStyles.avatarText}>CM</Text>
            </View>
            <TouchableOpacity
              style={localStyles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
              <Text style={[styles.b, { color: theme.primaryText }]}>
                {isEditing ? 'Save' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* General Information Box */}
          <InfoBox style={localStyles.generalInfoBox} theme={theme} isTablet={isTablet} >
            <Text style={[styles.h4, { color: theme.primaryText, marginBottom: isTablet ? 20 : 15 }]}>General Information</Text>
            <View style={localStyles.infoRow}>
              <Text style={localStyles.icon}>👤</Text>
              <View style={localStyles.infoContent}>
                <Text style={[styles.h6, { color: `${theme.primaryText}60` }]}>Name</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.h5, localStyles.input]}
                    value={userData.name}
                    onChangeText={(text) => setUserData({ ...userData, name: text })}
                  />
                ) : (
                  <Text style={[styles.h5, localStyles.infoValue]}>{userData.name}</Text>
                )}
              </View>
            </View>
            <View style={localStyles.infoRow}>
              <Text style={localStyles.icon}>📧</Text>
              <View style={localStyles.infoContent}>
                <Text style={[styles.h6, { color: `${theme.primaryText}60` }]}>Email</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.h5, localStyles.input]}
                    value={userData.email}
                    onChangeText={(text) => setUserData({ ...userData, email: text })}
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={[styles.h5, localStyles.infoValue]}>{userData.email}</Text>
                )}
              </View>
            </View>
            <View style={localStyles.infoRow}>
              <Text style={localStyles.icon}>🔒</Text>
              <View style={localStyles.infoContent}>
                <Text style={[styles.h6, { color: `${theme.primaryText}60` }]}>Password</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.h5, localStyles.input]}
                    value={userData.password}
                    secureTextEntry
                    placeholder="Enter new password"
                  />
                ) : (
                  <Text style={[styles.h5, localStyles.infoValue]}>{userData.password}</Text>
                )}
              </View>
            </View>
            <View style={localStyles.divider} />
            <View style={localStyles.statsRow}>
              <View style={localStyles.statItem}>
                <Text style={localStyles.statIcon}>🏆</Text>
                <Text style={[styles.h2, localStyles.statValue]}>{userData.overallRating}</Text>
                <Text style={[styles.h6, localStyles.statLabel]}>Overall Rating</Text>
              </View>
              <View style={localStyles.statDivider} />
              <View style={localStyles.statItem}>
                <Text style={localStyles.statIcon}>🎯</Text>
                <Text style={[styles.h2, localStyles.statValue]}>{userData.totalPuzzlesSolved}</Text>
                <Text style={[styles.h6, localStyles.statLabel]}>Puzzles Solved</Text>
              </View>
            </View>
            <View style={localStyles.infoContent}>
              <Text style={[styles.h6, { color: `${theme.primaryText}60` }]}>Member Since</Text>
              <Text style={[styles.h5, localStyles.infoValue]}>{userData.joinDate}</Text>
            </View>
          </InfoBox>
          {/* Puzzle Categories Section */}
          <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 10 }]}>Puzzle Ratings</Text>
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
          {/* Bottom Spacing */}
          <View style={localStyles.bottomSpacing} />
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}