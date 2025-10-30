import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import IpadPagesBar from '@/components/IpadPagesBar';
import NativePagesBar from '@/components/NativePagesBar';
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';

export default function TabLayout() {
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  return isTablet ? (
    <IpadPagesBar />
  ) : (
    <NativePagesBar />
  );
}