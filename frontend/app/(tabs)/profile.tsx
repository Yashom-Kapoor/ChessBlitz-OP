import GlassBlurView from '@/components/GlassBlurView';
import backgroundImages, { BackgroundContext } from '@/context/Backgrounds';
import GlobalStyle from '@/context/GlobalStyle';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
          backgroundColor: theme.primaryButton,
        },
      ]}
    >
      {children}
    </View>
  );
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const styles = GlobalStyle(theme, isTablet);

  const [userData, setUserData] = useState({
    name: 'Chess Master',
    email: 'chessmaster@example.com',
    password: '••••••••',
    joinDate: 'June 2024',
    totalPuzzlesSolved: 1247,
    overallRating: 1842,
  });

  const [isEditing, setIsEditing] = useState(false);

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
    bottomSpacing: {
      height: 30,
    },
  });

  return (
    <GestureHandlerRootView style={styles.contentContainer}>
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
              <GlassBlurView
                theme={theme}
                isTablet={isTablet}
                color={theme.primaryButton}
                glass="clear"
              />
              <Text style={[styles.b, { color: theme.primaryText }]}>
                {isEditing ? 'Save' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* General Information Box */}
          <InfoBox style={localStyles.generalInfoBox} theme={theme} isTablet={isTablet}>
            <Text
              style={[
                styles.h4,
                { color: theme.primaryText, marginBottom: isTablet ? 20 : 15 },
              ]}
            >
              General Information
            </Text>

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
                <Text style={[styles.h2, localStyles.statValue]}>
                  {userData.totalPuzzlesSolved}
                </Text>
                <Text style={[styles.h6, localStyles.statLabel]}>Puzzles Solved</Text>
              </View>
            </View>

            <View style={localStyles.infoContent}>
              <Text style={[styles.h6, { color: `${theme.primaryText}60` }]}>Member Since</Text>
              <Text style={[styles.h5, localStyles.infoValue]}>{userData.joinDate}</Text>
            </View>
          </InfoBox>

          <View style={localStyles.bottomSpacing} />
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
