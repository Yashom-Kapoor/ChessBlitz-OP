import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { Themes, ArtThemes } from '@/constants/Themes';

export type ThemeContextType = {
  theme: (typeof Themes)[keyof typeof Themes] | (typeof ArtThemes)[keyof typeof ArtThemes]; // Allow any theme object from Themes or ArtThemes
  setTheme: (themeName: keyof typeof Themes | keyof typeof ArtThemes | string) => void;
};

/**
 * Whether the window's interface style may be overridden to follow the app theme.
 *
 * iOS 26 is where liquid glass arrives, so it is both the first version that needs this and the
 * floor for it. `Platform.Version` is the iOS version string (for example `"26.5"`), so the
 * major number is what decides this.
 */
const SUPPORTS_THEMED_INTERFACE_STYLE =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<keyof typeof Themes | keyof typeof ArtThemes>('default');
  const theme =
    Object.prototype.hasOwnProperty.call(Themes, themeName)
      ? Themes[themeName as keyof typeof Themes]
      : ArtThemes[themeName as keyof typeof ArtThemes]; // Get the theme object from Themes or ArtThemes

  // iOS renders native materials - the liquid glass tab bar, the keyboard, menus - in the
  // *window's* interface style, which `userInterfaceStyle: "automatic"` ties to the device
  // appearance. The app theme is picked in-app and is independent of that, so a dark theme on a
  // light device left the glass tab bar rendering white. Overriding the window's style puts the
  // native material on the same side as the theme, the same way `StatusBar` already follows it.
  //
  // Limited to the iOS versions that render the tab bar as liquid glass. Before iOS 26 the bar
  // is a plain blurred one that already sits on the themed screen background, so there is
  // nothing to correct and those versions keep their previous behaviour untouched.
  //
  // Android is left alone too: there this routes to `AppCompatDelegate.setDefaultNightMode`,
  // which can recreate the activity, and the Material tab bar already honours its themed
  // `backgroundColor`.
  useEffect(() => {
    if (!SUPPORTS_THEMED_INTERFACE_STYLE) return;

    Appearance.setColorScheme(theme.dark ? 'dark' : 'light');
  }, [theme.dark]);

  const setTheme = (themeName: keyof typeof Themes | keyof typeof ArtThemes | string) => {
    if (
      Object.prototype.hasOwnProperty.call(Themes, themeName) ||
      Object.prototype.hasOwnProperty.call(ArtThemes, themeName)
    ) {
      setThemeName(themeName as keyof typeof Themes | keyof typeof ArtThemes);
    } else {
      console.warn(`Invalid theme name: ${themeName}`);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};