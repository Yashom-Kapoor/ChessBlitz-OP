import { ScrollView } from 'react-native';
import PageHeading from '@/components/PageHeading';
import { useTheme } from '@/context/ThemeContext';
import { useIsTablet } from '@/hooks/useIsTablet';

/** Home tab. Just the heading for now; content is coming later. */
export default function HomeScreen() {
  const { theme } = useTheme();
  const isTablet = useIsTablet();
  return (
    <ScrollView testID="home-screen" style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: isTablet ? 40 : 24, paddingHorizontal: isTablet ? 36 : 20 }}>
      <PageHeading tab="home" />
    </ScrollView>
  );
}
