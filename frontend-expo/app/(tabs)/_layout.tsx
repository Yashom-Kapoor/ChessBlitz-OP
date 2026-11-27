import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import IpadPagesBar from '@/components/IpadPagesBar';
import NativePagesBar from '@/components/NativePagesBar';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useShop } from '@/context/ShopContext';
import { useIsTablet } from '@/hooks/useIsTablet';

export default function TabLayout() {
  const isTablet = useIsTablet();
  const { loadUser } = useUser();
  const { loadShop, loadPrices } = useShop();

  useFocusEffect(
    useCallback(() => {
      loadUser();
      loadShop();
      loadPrices();
    }, [loadUser, loadShop, loadPrices])
  );

  return (isTablet) ? (
    <IpadPagesBar />
  ) : (
    <NativePagesBar />
  );
}
