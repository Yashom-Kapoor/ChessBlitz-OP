import { useEffect, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import IpadPagesBar from '@/components/IpadPagesBar';
import NativePagesBar from '@/components/NativePagesBar';
import TopBar from '@/components/TopBar';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useShop } from '@/context/ShopContext';
import { useIsTablet } from '@/hooks/useIsTablet';
import { waitForPendingCompletion } from '@/utils/pendingCompletion';

// Fallbacks and redirects inside the tabs land on Home.
export const unstable_settings = { initialRouteName: 'home' };

export default function TabLayout() {
  const isTablet = useIsTablet();
  const { loadUser } = useUser();
  const { loadShop, loadPrices } = useShop();

  useFocusEffect(
    useCallback(() => {
      // A just-solved puzzle may still be saving; wait so rating and coins aren't stale.
      void waitForPendingCompletion().then(() => {
        loadUser();
        loadShop();
      });
      loadPrices();
    }, [loadUser, loadShop, loadPrices])
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      {isTablet ? <IpadPagesBar /> : <NativePagesBar />}
    </View>
  );
}
