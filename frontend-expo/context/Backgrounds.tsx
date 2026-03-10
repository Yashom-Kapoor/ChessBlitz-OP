import { ImageBackground, StyleSheet } from "react-native";
import { useTheme } from "./ThemeContext";
import { BlurView } from "expo-blur";
import { useGlobalSearchParams } from "expo-router";

const backgroundImages: { [key: string]: any } = {
  winter: require('@/assets/images/backgrounds/winter.png'),
  summer: require('@/assets/images/backgrounds/summer.png'),
  spring: require('@/assets/images/backgrounds/spring.png'),
  autumn: require('@/assets/images/backgrounds/autumn.png'),
  vaporWave: require('@/assets/images/backgrounds/vaporWave.png'),
  space: require('@/assets/images/backgrounds/space.png'),
  pixel: require('@/assets/images/backgrounds/pixel.png'),
  darkFantasy: require('@/assets/images/backgrounds/darkFantasy.png'),
  spooky: require('@/assets/images/backgrounds/spooky.png'),
  metroCity: require('@/assets/images/backgrounds/metroCity.png'),
  valentine: require('@/assets/images/backgrounds/valentine.png'),
};  
export default backgroundImages;

export function BackgroundContext({ children, theme, ...rest }: any) {
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  return (
    <ImageBackground
      source={backgroundImages[theme.name] || null}
      style={{flex:1}}
      {...rest}
    >
      {backgroundImages[theme.name] && (<BlurView intensity={isTablet ? 30 : 20} style={{
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        backgroundColor: theme.dark ? '#00000050' : '#ffffff50',
      }}/>)}
      {children}
    </ImageBackground>
  );
}