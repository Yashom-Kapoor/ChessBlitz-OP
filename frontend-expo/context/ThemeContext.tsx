import React, { createContext, useContext, useState } from 'react';
import { Themes, ArtThemes } from '@/constants/Themes';

export type ThemeContextType = {
  theme: (typeof Themes)[keyof typeof Themes] | (typeof ArtThemes)[keyof typeof ArtThemes]; // Allow any theme object from Themes or ArtThemes
  setTheme: (themeName: keyof typeof Themes | keyof typeof ArtThemes | string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<keyof typeof Themes | keyof typeof ArtThemes>('default');
  const theme =
    Object.prototype.hasOwnProperty.call(Themes, themeName)
      ? Themes[themeName as keyof typeof Themes]
      : ArtThemes[themeName as keyof typeof ArtThemes]; // Get the theme object from Themes or ArtThemes

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