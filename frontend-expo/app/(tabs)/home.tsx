import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

/** Home tab. Empty for now; content is coming later. */
export default function HomeScreen() {
  const { theme } = useTheme();
  return <View testID="home-screen" style={{ flex: 1, backgroundColor: theme.background }} />;
}
