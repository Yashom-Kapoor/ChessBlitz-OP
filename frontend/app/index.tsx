import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Platform, Pressable, View, ImageBackground, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import GlobalStyle from '@/context/GlobalStyle';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import backgroundImages from '@/context/Backgrounds';
import { BlurView } from 'expo-blur';
import { Themes } from '@/constants/Themes';
import { getDeviceTypeAsync, DeviceType } from 'expo-device';
import GlassBlurView from '@/components/GlassBlurView';

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
  const indexStyles = StyleSheet.create({
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
    button: {
      padding: 20,
      paddingHorizontal: 20,
      borderRadius: isTablet ? 30 : 20,
      width: '70%',
      alignItems: 'center',
      boxShadow: `0 7 0 ${theme.buttonShadow}`,
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
      <Image source={require('@/assets/images/backgrounds/icon-full.png')} style={indexStyles.backgroundImg} />

      <SafeAreaProvider style={indexStyles.landingContainer}>
        <TouchableOpacity // Continue without account button
          style={indexStyles.continueButton}
          onPress={() => router.push({
            pathname: `/(tabs)/puzzles`,
            params: {
              isTablet: String(isTablet)
            }
          })}
        >
          <Text style={[styles.link, { color: theme.primaryText, textAlign: 'right' }]}>
            Continue without an account
          </Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.primaryText, textAlign: 'center' }]}>
          Create your{'\n'}ChessBlitz account
        </Text>

        <TouchableOpacity // Sign up
          style={[indexStyles.button]}
        //onPress={() => router.push('/')}>
        >
          <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
          <Text style={[styles.h4, { color: theme.primaryText }]}>Sign Up with Email</Text>
        </TouchableOpacity>

        <Text style={[styles.h5, { color: theme.primaryText, paddingTop: 15 }]}>Already have an account?</Text>
        <TouchableOpacity // Sign in
          style={[indexStyles.button]}
        //onPress={() => router.push('/sign-in')}
        >
          <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
          <Text style={[styles.h4, { color: theme.secondaryText }]}>Log In</Text>
        </TouchableOpacity>

      </SafeAreaProvider>

    </ImageBackground>
  );
}