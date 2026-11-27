import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, ImageBackground, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import GlobalStyle from '@/context/GlobalStyle';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import backgroundImages from '@/context/Backgrounds';
import { Themes } from '@/constants/Themes';
import { getDeviceTypeAsync, DeviceType } from 'expo-device';
import { AuthButton, AuthCard, AuthTitle } from '@/components/AuthForm';
import { supabase } from '@/api/SupabaseClient';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export default function HomeScreen() {
  const router = useRouter(); // Access router object
  const theme = Themes.default;
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    getDeviceTypeAsync().then(deviceType => {
      setIsTablet(deviceType === DeviceType.TABLET);
    });
  }, []);

  const styles = GlobalStyle(theme, isTablet);
  const localStyles = StyleSheet.create({
    landingContainer: {
      gap: 20,
      flexDirection: 'column',
      marginBottom: 300,
      alignItems: 'center',
      justifyContent: 'center',
    },

    backgroundImg: {
      height: 1350 / (isTablet ? 1.7 : 3),
      width: 1139 / (isTablet ? 1.7 : 3),
      bottom: 0,
      left: 0,
      position: 'absolute',
      opacity: 0.6,
    },

    continueButton: {
      padding: 10,
      paddingHorizontal: 20,
      width: '100%',
      alignItems: 'flex-end',
    },

    logInSplash: {
      textAlign: 'center',
      color: theme.primaryText,
    },
    buttonText: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
    }

  });

  return (
    <ImageBackground
      source={backgroundImages[theme.name] || null}
      style={styles.contentContainer}
    >
      <Image source={require('@/assets/images/backgrounds/icon-full.png')} style={localStyles.backgroundImg} />

      <SafeAreaProvider style={localStyles.landingContainer}>
        <TouchableOpacity // Continue without account button
          style={localStyles.continueButton}
          onPress={async () => {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) {
              console.error('[guest login] signInAnonymously failed:', error.message);
              return;
            }
            router.push({
              pathname: `/(tabs)/puzzles`,
              params: { isTablet: String(isTablet) }
            });
          }}
        >
          <Text style={[styles.link, { color: theme.primaryText, textAlign: 'right' }]}>
            Continue without an account
          </Text>
        </TouchableOpacity>

        <AuthCard isTablet={isTablet}>
          <AuthTitle isTablet={isTablet} subtitle="create your account" />
          <AuthButton isTablet={isTablet} title="Sign up with Email" onPress={() => router.push(`/auth/sign_up?isTablet=${isTablet}`)} />
          <Text style={[styles.h5, { color: theme.primaryText, textAlign: 'center', paddingTop: 10 }]}>Already have an account?</Text>
          <AuthButton isTablet={isTablet} title="Sign in" onPress={() => router.push(`/auth/log_in?isTablet=${isTablet}`)} />
        </AuthCard>

      </SafeAreaProvider>

    </ImageBackground>
  );
}