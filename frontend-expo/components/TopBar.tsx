import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import { useShop } from '@/context/ShopContext';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useIsTablet } from '@/hooks/useIsTablet';
import { glassColorSchemeFor, useGlassAvailable } from '@/utils/Glass';

const BLITZ_COLOR = '#FFC83D';

/** Rounds the stored rating for display; anything non-numeric (e.g. while loading) shows a dash. */
export function formatElo(rating: unknown): string {
  const value = typeof rating === 'number' ? rating : Number(rating);
  return rating !== '' && rating != null && Number.isFinite(value) ? String(Math.round(value)) : '—';
}

/** Bar across the top of the main tabs: blitz and elo on the left, the player's name and photo on the right. */
export default function TopBar() {
  const { theme } = useTheme();
  const { currency } = useShop();
  const { userData } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const glassAvailable = useGlassAvailable();

  const displayName = userData.leaderboardName || userData.name;
  const fontSize = isTablet ? 20 : 16;
  const iconSize = isTablet ? 24 : 20;
  const textStyle = [styles.text, { color: theme.primaryText, fontSize }];

  return (
    <View testID="top-bar" style={[styles.bar, {
      paddingTop: insets.top + 6,
      paddingHorizontal: isTablet ? 32 : 16,
      borderBottomColor: theme.dark ? '#ffffff14' : '#00000014',
    }]}>
      {glassAvailable ? (
        <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="clear"
          tintColor={`${theme.background}DD`} colorScheme={glassColorSchemeFor(theme.background, theme)} />
      ) : (
        <BlurView intensity={20} style={[StyleSheet.absoluteFill, { backgroundColor: `${theme.background}DD` }]} />
      )}

      <View style={styles.stats}>
        <View style={styles.stat} accessible accessibilityLabel={`${currency} blitz`}>
          <MaterialCommunityIcons name="lightning-bolt" size={iconSize} color={BLITZ_COLOR} />
          <Text style={textStyle}>{currency}</Text>
        </View>
        <View style={styles.stat} accessible accessibilityLabel={`Elo ${formatElo(userData.overallRating)}`}>
          <MaterialCommunityIcons name="chess-knight" size={iconSize} color={theme.primaryText} />
          <Text style={textStyle}>{formatElo(userData.overallRating)}</Text>
        </View>
      </View>

      <Pressable testID="top-bar-profile" accessibilityRole="button" accessibilityLabel="Open profile"
        onPress={() => router.navigate('/profile')}
        style={({ pressed }) => [styles.profile, pressed && { opacity: 0.6 }]}>
        <Text style={[textStyle, styles.name]} numberOfLines={1}>{displayName}</Text>
        <Avatar name={displayName} uri={userData.avatarUrl} size={isTablet ? 40 : 32} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 1,
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  text: { fontFamily: 'Nunito', fontWeight: '800' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginLeft: 16 },
  name: { flexShrink: 1 },
});
