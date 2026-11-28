import { useEffect, useCallback, useState } from 'react';
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
import { isCompletionPending, waitForPendingCompletion } from '@/utils/pendingCompletion';

// Fallbacks and redirects inside the tabs land on Home.
export const unstable_settings = { initialRouteName: 'home' };

export default function TabLayout() {
  const isTablet = useIsTablet();
  const { loadUser } = useUser();
  const { loadShop, loadPrices } = useShop();

  const [statsUpdating, setStatsUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // A just-solved puzzle may still be saving: show spinners, not the old blitz and elo, until it's in.
      if (isCompletionPending()) setStatsUpdating(true);
      void waitForPendingCompletion()
        .then(() => Promise.all([loadUser(), loadShop()]))
        .catch(() => undefined)
        .finally(() => { if (active) setStatsUpdating(false); });
      loadPrices();
      return () => { active = false; };
    }, [loadUser, loadShop, loadPrices])
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar updating={statsUpdating} />
      {isTablet ? <IpadPagesBar /> : <NativePagesBar />}
    </View>
  );
}
