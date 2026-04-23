import { useFonts } from 'expo-font';
import { Stack, useGlobalSearchParams, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlobalStyle from '@/context/GlobalStyle';
import { LinearGradient } from 'expo-linear-gradient';
import GlassBlurView from '@/components/GlassBlurView';
import { ScreenStackHeaderBackButtonImage } from 'react-native-screens';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  const [loaded] = useFonts({
    Nunito: require('../assets/fonts/Nunito.ttf'),
    NunitoBlackItalic: require('../assets/fonts/Nunito-BlackItalic.ttf'),
    NunitoBoldItalic: require('../assets/fonts/Nunito-BoldItalic.ttf'),
    NunitoExtraBoldItalic: require('../assets/fonts/Nunito-ExtraBoldItalic.ttf'),
    NunitoExtraLightItalic: require('../assets/fonts/Nunito-ExtraLightItalic.ttf'),
    NunitoItalic: require('../assets/fonts/Nunito-Italic.ttf'),
    NunitoLightItalic: require('../assets/fonts/Nunito-LightItalic.ttf'),
    NunitoMediumItalic: require('../assets/fonts/Nunito-MediumItalic.ttf'),
    NunitoSemiBoldItalic: require('../assets/fonts/Nunito-SemiBoldItalic.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedRoot isTablet={isTablet} />
    </ThemeProvider>
  );
}

function ThemedRoot({ isTablet }: { isTablet: boolean }) {
  const { theme } = useTheme();
  const styles = GlobalStyle(theme, isTablet);
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: true,
          headerTintColor: theme.titleText, // Use theme's title text color
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTitleStyle: {
            color: theme.titleText, // Use theme's title text color
            fontWeight: '700',
            fontSize: isTablet ? 25 : 20,
            fontFamily: "Nunito",
          },
          contentStyle: {
            backgroundColor: theme.background,
          },
          headerTransparent: true,
          headerTitle: ({ ...props }) =>
            <Text style={{
              ...styles.h4, 
              color: theme.primaryText
            }}>
              {props.children}
            </Text>,
          headerBackground: () =>
            <LinearGradient style={{
              ...StyleSheet.absoluteFillObject
            }} colors={[theme.dark ? '#00000030' : '#ffffff30', 'transparent']} />
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: '',
            headerShown: true,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="auth/sign_up"
          options={() => ({
            title: '',
            animation: 'ios_from_right',
            headerShown: true,
            headerBackVisible: true,
            headerBackButtonDisplayMode: 'minimal'
          })}
        />
        <Stack.Screen
          name="auth/log_in"
          options={() => ({
            title: '',
            animation: 'ios_from_right',
            headerShown: true,
            headerBackVisible: true,
            headerBackButtonDisplayMode: 'minimal'
          })}
        />
        <Stack.Screen
          name="(tabs)"
          options={({ route }) => {
            // derive active tab from nested tab navigator state
            const focused = getFocusedRouteNameFromRoute(route) ?? 'puzzles';
            // map route names to friendly titles if desired
            const titleMap: Record<string, string> = {
              puzzles: 'Puzzles',
              lessons: 'Lessons',
              ranking: 'Ranking',
              profile: 'Profile',
              shop: 'Shop',
            };
            return {
              title: titleMap[focused] ?? 'App',
              headerShown: true,
              headerBackVisible: false,
            };
          }}
        />
        <Stack.Screen
          name="puzzles/demo_puzzle"
          options={() => ({
            title: 'Demo Puzzle',
            animation: 'ios_from_right',
            headerShown: true,
            headerBackVisible: true,
            headerBackButtonDisplayMode: 'minimal'
          })}
        />
        <Stack.Screen
          name="lessons/[lesson]"
          options={() => ({
            animation: 'ios_from_right',
            headerShown: true,
            headerBackVisible: true,
            headerBackButtonDisplayMode: 'minimal'
          })}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </>
  );
}