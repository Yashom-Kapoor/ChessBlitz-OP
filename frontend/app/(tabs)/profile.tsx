import GlassBlurView from '@/components/GlassBlurView';
import backgroundImages, { BackgroundContext } from '@/context/Backgrounds';
import GlobalStyle from '@/context/GlobalStyle';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch } from 'react-native';
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
  const router = useRouter();

  const [userData, setUserData] = useState({
    name: 'Chess Master',
    email: 'chessmaster@example.com',
    password: '••••••••',
    joinDate: 'June 2024',
    totalPuzzlesSolved: 1247,
    overallRating: 1842,
  });

  const [isEditing, setIsEditing] = useState(false);

  const [notifications, setNotifications] = useState({
  lessonReminders: true,
  newPuzzles: true,
  newLessons: true,
  });

  const toggleNotification = (key: 'lessonReminders' | 'newPuzzles' | 'newLessons') => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

    const [classes, setClasses] = useState<string[]>([
    'Class Name #1',
    'Class Name #2',
    'Class Name #3',
  ]);

  const demoEnrollCode = ['6', 'H', 'X', '7', '5', 'P'];

  const handleEnroll = () => {
    // later you can replace this with a real enroll call
    console.log('Enroll with code:', demoEnrollCode.join(''));
  };

  const handleUnenroll = (index: number) => {
    setClasses(prev => prev.filter((_, i) => i !== index));
  };

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
    notificationsBox: {
      marginTop: 24,
    },
    notificationsTitle: {
      marginBottom: isTablet ? 16 : 12,
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 6,
    },
    notificationLabel: {
      color: theme.primaryText,
      fontSize: isTablet ? 18 : 16,
    },
        // --- Enroll / Unenroll box ---
    enrollBox: {
      marginTop: 24,
    },
    enrollTitle: {
      marginBottom: isTablet ? 16 : 12,
    },
    enrollTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    codeBox: {
      minWidth: 30,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: `${theme.primaryText}40`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeText: {
      color: theme.primaryText,
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },
    enrollButton: {
      paddingHorizontal: isTablet ? 20 : 16,
      paddingVertical: isTablet ? 10 : 8,
      borderRadius: 999,
      backgroundColor: theme.primaryText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    enrollButtonText: {
      color: theme.primaryButton,
      fontWeight: '600',
      fontSize: isTablet ? 16 : 14,
    },
    enrollSubtext: {
      marginTop: 8,
      color: `${theme.primaryText}80`,
      fontSize: isTablet ? 14 : 12,
    },
    classesHeader: {
      marginTop: 20,
      marginBottom: 8,
      color: `${theme.primaryText}80`,
      fontSize: isTablet ? 14 : 12,
    },
    classRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    className: {
      color: theme.primaryText,
      fontSize: isTablet ? 16 : 14,
    },
    classAction: {
      color: '#FF6B6B', // same red as puzzle "Fork" color
      fontSize: isTablet ? 14 : 13,
    },
        logoutContainer: {
      marginTop: 24,
      alignItems: 'center',
    },
    logoutButton: {
      paddingVertical: isTablet ? 14 : 12,
      paddingHorizontal: isTablet ? 40 : 32,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 80, 80, 0.15)',  // light red with low opacity
      borderWidth: 1,
      borderColor: 'rgba(255, 80, 80, 0.25)',      // subtle border
    },
    logoutText: {
      color: '#FFFFFF',
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
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
                styles.h2,
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

          {/* Notifications Box */}
          <InfoBox style={localStyles.notificationsBox} theme={theme} isTablet={isTablet}>
            <Text
              style={[
                styles.h2,
                localStyles.notificationsTitle,
                { color: theme.primaryText },
              ]}
            >
              Notifications
            </Text>

            <View style={localStyles.notificationRow}>
              <Text style={localStyles.notificationLabel}>Lesson Reminders</Text>
              <Switch
                value={notifications.lessonReminders}
                onValueChange={() => toggleNotification('lessonReminders')}
              />
            </View>

            <View style={localStyles.notificationRow}>
              <Text style={localStyles.notificationLabel}>New Puzzles</Text>
              <Switch
                value={notifications.newPuzzles}
                onValueChange={() => toggleNotification('newPuzzles')}
              />
            </View>

            <View style={localStyles.notificationRow}>
              <Text style={localStyles.notificationLabel}>New Lessons</Text>
              <Switch
                value={notifications.newLessons}
                onValueChange={() => toggleNotification('newLessons')}
              />
            </View>

            <View style={localStyles.divider} />
          </InfoBox>

          {/* Enroll / Unenroll Box */}
          <InfoBox style={localStyles.enrollBox} theme={theme} isTablet={isTablet}>
            <View style={localStyles.enrollTopRow}>
              <Text
                style={[
                  styles.h4,
                  localStyles.enrollTitle,
                  { color: theme.primaryText },
                ]}
              >
                Enroll/Unenroll
              </Text>

              <TouchableOpacity style={localStyles.enrollButton} onPress={handleEnroll}>
                <Text style={localStyles.enrollButtonText}>Enroll</Text>
              </TouchableOpacity>
            </View>

            {/* Code boxes */}
            <View style={localStyles.codeRow}>
              {demoEnrollCode.map((ch, idx) => (
                <View key={idx} style={localStyles.codeBox}>
                  <Text style={localStyles.codeText}>{ch}</Text>
                </View>
              ))}
            </View>

            <Text style={localStyles.enrollSubtext}>
              You are joining Mr. Jackson's class.
            </Text>

            {/* Classes list */}
            <Text style={localStyles.classesHeader}>Your classes</Text>
            {classes.map((className, idx) => (
              <View key={idx} style={localStyles.classRow}>
                <Text style={localStyles.className}>{className}</Text>
                <TouchableOpacity onPress={() => handleUnenroll(idx)}>
                  <Text style={localStyles.classAction}>Unenroll</Text>
                </TouchableOpacity>
              </View>
            ))}
          </InfoBox>
          
          {/* Log Out Button */}
          <View style={localStyles.logoutContainer}>
            <TouchableOpacity style={localStyles.logoutButton} onPress={() => console.log('Logging out')}>
              <Text style={localStyles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          <View style={localStyles.bottomSpacing} />
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
