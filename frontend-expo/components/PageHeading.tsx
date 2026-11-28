import { StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TAB_INFO, TabName, tabColor } from '@/constants/tabs';
import { useTheme } from '@/context/ThemeContext';
import { useIsTablet } from '@/hooks/useIsTablet';

type PageHeadingProps = {
  tab: TabName;
  /** Defaults to the tab's name. */
  title?: string;
  subtitle?: string;
};

/** Big heading at the top of a tab page: the tab's icon and name in its colour. */
export default function PageHeading({ tab, title = TAB_INFO[tab].title, subtitle }: PageHeadingProps) {
  const { theme } = useTheme();
  const isTablet = useIsTablet();
  const color = tabColor(tab, theme.dark);
  const fontSize = isTablet ? 48 : 36;

  return (
    <View style={styles.container}>
      <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={title}>
        <IconSymbol name={TAB_INFO[tab].selectedIcon} size={fontSize} color={color} />
        <Text style={[styles.title, { color, fontSize, lineHeight: isTablet ? 58 : 44 }]}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, {
          color: theme.primaryText, fontSize: isTablet ? 22 : 17, lineHeight: isTablet ? 30 : 24,
        }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  title: { fontFamily: 'Nunito', fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  subtitle: { fontFamily: 'Nunito', fontWeight: '700', textAlign: 'center', marginTop: 6, opacity: 0.85 },
});
