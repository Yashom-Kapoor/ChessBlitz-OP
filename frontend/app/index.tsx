import React from 'react';
import { Image, StyleSheet, Platform, Pressable, View, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export default function HomeScreen() {
  const router = useRouter(); // Access router object
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    titleContainer: {
      fontSize: 36,
      fontWeight: 'bold',
      lineHeight: 50,
      padding: 20,
      width: 400,
      textAlign: 'center',
      color: theme.titleText
    },
    stepContainer: {
      gap: 20,
      flexDirection: 'column',
      marginBottom: 8,
      alignItems: 'center',
    },
    backgroundImg: {
      height: 1350/3,
      width: 1139/3,
      bottom: 0,
      left: 0,
      position: 'absolute',
    },
    contentContainer: {
      flex: 1,
      paddingTop: Platform.select({ ios: 0, android: 0 }),
      backgroundColor: theme.background,
    },
  
    continueButton: {
      padding: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      width: '100%',
      alignItems: 'flex-end',
    },
    continueText: {
      fontSize: 16,
      textDecorationLine: 'underline',
      textAlign: 'right',
      color: theme.titleText,
    },
  
    signUpButton: {
      padding: 20,
      paddingHorizontal: 20,
      borderRadius: 8,
      width: '70%',
      alignItems: 'center',
      boxShadow: `0 7 0 ${theme.buttonShadow}`,
      backgroundColor: theme.primaryButton,
    },
    signUpText: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.primaryText,
    },
  
    logInSplash: {
      fontSize: 16,
      textAlign: 'center',
      paddingTop: 20,
      marginBottom: -10,
      color: theme.primaryText,
    },
  
    logInButton: {
      padding: 20,
      paddingHorizontal: 20,
      borderRadius: 8,
      width: '70%',
      alignItems: 'center',
      boxShadow: `0 7 0 ${theme.buttonShadow}`,
      backgroundColor: theme.secondaryButton,
    },
    logInText: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.secondaryText,
    },
  });  

  return (
    <ThemedView style={styles.contentContainer}>
      <SafeAreaView style={styles.stepContainer}>

        <Pressable // Continue without account button
          style={styles.continueButton}
          onPress={() => router.push('/(tabs)/daily')}
        >
          <ThemedText style={styles.continueText}>
            Continue without an account
          </ThemedText>
        </Pressable>

        <ThemedText style={styles.titleContainer}>
          Create your ChessBlitz account
        </ThemedText>

        <Pressable // Sign up
          style={styles.signUpButton}
          //onPress={() => router.push('/')}>
        >
          <ThemedText style={styles.signUpText}>Sign Up with Email</ThemedText>
        </Pressable>

        <ThemedText style={styles.logInSplash}>Already have an account?</ThemedText>
        <Pressable // Sign in
          style={styles.logInButton}
          //onPress={() => router.push('/sign-in')}
        >
          <ThemedText style={styles.logInText}>Log In</ThemedText>
        </Pressable>

      </SafeAreaView>

      <Image source={require('@/assets/images/backgrounds/icon-full.png')} style={styles.backgroundImg} />
    </ThemedView>
  );
}