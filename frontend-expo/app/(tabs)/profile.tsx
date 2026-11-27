import GlassBlurView from '@/components/GlassBlurView';
import Avatar from '@/components/Avatar';
import ClassroomMembership from '@/components/profile/ClassroomMembership';
import LeaderboardName from '@/components/profile/LeaderboardName';
import { chooseProfilePhoto } from '@/utils/profilePhoto';
import backgroundImages, { BackgroundContext } from '@/context/Backgrounds';
import GlobalStyle from '@/context/GlobalStyle';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, RefreshControl, Platform, ActivityIndicator, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/api/SupabaseClient';
import { useIsTablet } from '@/hooks/useIsTablet';

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
  const isTablet = useIsTablet();
  const styles = GlobalStyle(theme, isTablet);
  const router = useRouter();
  const { authUserId, userData, loadUser, updateUserData, saveAvatar } = useUser();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoBusy = useRef(false);

  const handleChangePhoto = async () => {
    if (photoBusy.current || !userData.userId) return;
    photoBusy.current = true;
    setUploadingPhoto(true);
    try {
      const photo = await chooseProfilePhoto();
      if (photo !== null) await saveAvatar(photo, userData.userId);
    } catch (error) {
      Alert.alert('Could not update photo', error instanceof Error
        ? error.message : 'Please try again with another image.');
    } finally {
      photoBusy.current = false;
      setUploadingPhoto(false);
    }
  };

  const refreshColor = theme.primaryText;
  const refreshOffset = 20;
  const [tintColor, setTintColor] = useState<string | undefined>(
    Platform.select({
      ios: undefined,
      android: refreshColor,
    }),
  );
  const [progressViewOffset, setProgressViewOffset] = useState(
    Platform.select({
      ios: 0,
      android: refreshOffset,
    }) ?? refreshOffset,
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setTintColor(refreshColor);
      return;
    }

    let raf2: number | undefined;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setTintColor(refreshColor));
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) {
        cancelAnimationFrame(raf2);
      }
    };
  }, [refreshColor]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setProgressViewOffset(refreshOffset);
      return;
    }

    let raf2: number | undefined;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setProgressViewOffset(refreshOffset));
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) {
        cancelAnimationFrame(raf2);
      }
    };
  }, [refreshOffset]);

  const [refreshing, setRefreshing] = useState(false);
  const [classroomRefreshKey, setClassroomRefreshKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutBusy = useRef(false);

  useFocusEffect(useCallback(() => {
    void loadUser();
  }, [loadUser]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setClassroomRefreshKey(key => key + 1);
    try {
      await loadUser();
    } catch (error) {
      console.log('Error refreshing user:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadUser]);

  const handleLogout = async () => {
    if (logoutBusy.current) return;
    logoutBusy.current = true;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      // The root auth guard removes signed-in routes and returns to the welcome screen.
    } catch (error) {
      Alert.alert('Could not log out', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      logoutBusy.current = false;
      setLoggingOut(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);

  const [notifications, setNotifications] = useState({
  lessonReminders: true,
  newPuzzles: true,
  newLessons: true,
  });

  const toggleNotification = (key: 'lessonReminders' | 'newPuzzles' | 'newLessons') => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const localStyles = StyleSheet.create({
    header: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    avatarContainer: {
      alignItems: 'center',
      gap: 10,
      marginBottom: isTablet ? 30 : 15,
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
      color: theme.primaryText,
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },

  });

  return (
    <GestureHandlerRootView style={styles.contentContainer}>
      <BackgroundContext theme={theme}>
        <ScrollView 
          contentContainerStyle={{ ...styles.scrollContainer, marginTop: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tintColor}
              progressViewOffset={progressViewOffset}
            />
          }
        >
          {/* Header Section */}
          <View style={localStyles.header}>
            <TouchableOpacity style={localStyles.avatarContainer} onPress={handleChangePhoto}
              disabled={uploadingPhoto || !userData.userId} accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityState={{ disabled: uploadingPhoto || !userData.userId, busy: uploadingPhoto }}>
              <Avatar name={userData.name} uri={userData.avatarUrl} size={isTablet ? 120 : 100} />
              {uploadingPhoto && <ActivityIndicator color={theme.primaryText} />}
              <Text style={[styles.b, { color: theme.primaryText }]}>
                {uploadingPhoto ? 'Updating photo…' : 'Change photo'}
              </Text>
            </TouchableOpacity>
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
                    onChangeText={(text) => updateUserData({ name: text })}
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
                    onChangeText={(text) => updateUserData({ email: text })}
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={[styles.h5, localStyles.infoValue]}>{userData.email}</Text>
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

          <InfoBox style={localStyles.generalInfoBox} theme={theme} isTablet={isTablet}>
            <LeaderboardName key={authUserId ?? 'signed-out'} isTablet={isTablet} />
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
          </InfoBox>

          {/* Enroll / Unenroll Box */}
          <InfoBox style={localStyles.enrollBox} theme={theme} isTablet={isTablet}>
            <ClassroomMembership isTablet={isTablet} refreshKey={classroomRefreshKey} />
          </InfoBox>
          
          {/* Log Out Button */}
          <View style={localStyles.logoutContainer}>
            <TouchableOpacity style={[localStyles.logoutButton, { opacity: loggingOut ? 0.5 : 1 }]}
              onPress={handleLogout} disabled={loggingOut} accessibilityRole="button"
              accessibilityLabel="Log out" accessibilityState={{ disabled: loggingOut, busy: loggingOut }}>
              <Text style={localStyles.logoutText}>{loggingOut ? 'Logging out…' : 'Log Out'}</Text>
            </TouchableOpacity>
          </View>

          <View style={localStyles.bottomSpacing} />
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
