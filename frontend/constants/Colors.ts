/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Themes = {
  default: {
    // Properties
    name: 'default',
    dark: true,
    logoOpacity: '1',
    // Solids
    background: '#2B2D3B',
    headerBackground: '#454A64',
    primaryButton: '#191A21',
    secondaryButton: '#C7C7C7',
    buttonShadow: '#00000040',
    hintBubble: '#B1B5CC',
    // Text
    titleText: '#fff',
    primaryText: '#efefef',
    secondaryText: '#2B2D3B',
    //Chessboard
    player1Square: '#FFF37E',
    player2Square: '#454A64',
  },
  light: {
    name: 'light',
    dark: false,
    logoOpacity: '0.5',
    // Solids
    background: '#F9F9F9',
    headerBackground: '#D6D6D6',
    primaryButton: '#FFFFFF',
    secondaryButton: '#4F4F4F',
    buttonShadow: '#00000020',
    hintBubble: '#B0B0B0', // Darker for better contrast with primaryText
    // Text
    titleText: '#333333',
    primaryText: '#4F4F4F',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#FFFFFF',
    player2Square: '#FF0F0',
    tabIconDefault: '#D6D6D6',
    tabIconSelected: '#333333',
  },
  dark: {
    name: 'dark',
    dark: true,
    logoOpacity: '0.8',
    // Solids
    background: '#1E1E2E',
    headerBackground: '#2A2F3A',
    primaryButton: '#3A3A4A',
    secondaryButton: '#E0E0E0',
    buttonShadow: '#00000050',
    hintBubble: '#2A2F3A', // Darker for better contrast with primaryText
    // Text
    titleText: '#FFFFFF',
    primaryText: '#E0E0E0',
    secondaryText: '#1A1A2A',
    // Chessboard
    player1Square: '#3A3A4A',
    player2Square: '#1A1A2A',
    tabIconDefault: '#5A5A6A',
    tabIconSelected: '#5A5AFF',
  },
  mint: {
    name: 'mint',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#E6FFF2',
    headerBackground: '#6FC8B5',
    primaryButton: '#A8E6CF',
    secondaryButton: '#29671C',
    buttonShadow: '#00000020',
    hintBubble: '#5AAE9A', // Darker for better contrast with primaryText
    // Text
    titleText: '#1A4D2E',
    primaryText: '#29671C',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#A8E6CF',
    player2Square: '#1A4D2E',
    tabIconDefault: '#A8E6CF',
    tabIconSelected: '#1A4D2E',
  },
  lavender: {
    name: 'lavender',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#F3E8FF',
    headerBackground: '#7E5DAE',
    primaryButton: '#D1C4E9',
    secondaryButton: '#4A148C',
    buttonShadow: '#00000020',
    hintBubble: '#6A4A8C', // Darker for better contrast with primaryText
    // Text
    titleText: '#4A148C',
    primaryText: '#4A148C',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#D1C4E9',
    player2Square: '#4A148C',
    tabIconDefault: '#D1C4E9',
    tabIconSelected: '#9575CD',
  },
  strawberry: {
    name: 'strawberry',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#FFE6E6',
    headerBackground: '#D65A5A',
    primaryButton: '#FFCDD2',
    secondaryButton: '#B71C1C',
    buttonShadow: '#00000020',
    hintBubble: '#B74A4A', // Darker for better contrast with primaryText
    // Text
    titleText: '#B71C1C',
    primaryText: '#B71C1C',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#FFCDD2',
    player2Square: '#B71C1C',
    tabIconDefault: '#FFCDD2',
    tabIconSelected: '#E57373',
  },
  blueberry: {
    name: 'blueberry',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#E3F2FD',
    headerBackground: '#4A90E2',
    primaryButton: '#BBDEFB',
    secondaryButton: '#0D47A1',
    buttonShadow: '#00000020',
    hintBubble: '#3A6BA1', // Darker for better contrast with primaryText
    // Text
    titleText: '#0D47A1',
    primaryText: '#0D47A1',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#BBDEFB',
    player2Square: '#0D47A1',
    tabIconDefault: '#BBDEFB',
    tabIconSelected: '#64B5F6',
  },
  thaiTea: {
    name: 'thaiTea',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#FDF2E3',
    headerBackground: '#9E5C46',
    primaryButton: '#FFD27F',
    secondaryButton: '#7B3F00',
    buttonShadow: '#00000020',
    hintBubble: '#C89B6D',
    // Text
    titleText: '#7B3F00',
    primaryText: '#7B3F00',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#9E5C46',
    player2Square: '#340C0C',
    tabIconDefault: '#FFD27F',
    tabIconSelected: '#9E5C46',
  },
  terminal: {
    name: 'terminal',
    dark: true,
    logoOpacity: '1',
    // Solids
    background: '#1A1A1A',
    headerBackground: '#191A1B',
    primaryButton: '#78A616',
    secondaryButton: '#1A1A1A',
    buttonShadow: '#00000040',
    hintBubble: '#2A2A2A',
    // Text
    titleText: '#78A616',
    primaryText: '#78A616',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#78A616',
    player2Square: '#191A1B',
    tabIconDefault: '#78A616',
    tabIconSelected: '#A8FF60',
  },
} as const;

export const ArtThemes = {
  winter: {
    name: 'winter',
    dark: true,
    logoOpacity: '0.8',
    // Solids
    background: '#083457',
    headerBackground: '#0A4A7A',
    primaryButton: '#0A4A7A',
    secondaryButton: '#E2E3E9',
    buttonShadow: '#00000040',
    hintBubble: '#0A4A7A',
    // Text
    titleText: '#E2E3E9',
    primaryText: '#E2E3E9',
    secondaryText: '#083457',
    // Chessboard
    player1Square: '#E2E3E9',
    player2Square: '#083457',
    tabIconDefault: '#E2E3E9',
    tabIconSelected: '#0A4A7A',
  },
  summer: {
    name: 'summer',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#52164A',
    headerBackground: '#7A1E5E',
    primaryButton: '#DE636F',
    secondaryButton: '#52164A',
    buttonShadow: '#00000020',
    hintBubble: '#7A1E5E',
    // Text
    titleText: '#DE636F',
    primaryText: '#DE636F',
    secondaryText: '#52164A',
    // Chessboard
    player1Square: '#DE636F',
    player2Square: '#52164A',
    tabIconDefault: '#DE636F',
    tabIconSelected: '#7A1E5E',
  },
  autumn: {
    name: 'autumn',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#CD3E00',
    headerBackground: '#E05A1A',
    primaryButton: '#F7D897',
    secondaryButton: '#CD3E00',
    buttonShadow: '#00000020',
    hintBubble: '#E05A1A',
    // Text
    titleText: '#F7D897',
    primaryText: '#F7D897',
    secondaryText: '#CD3E00',
    // Chessboard
    player1Square: '#F7D897',
    player2Square: '#CD3E00',
    tabIconDefault: '#F7D897',
    tabIconSelected: '#E05A1A',
  },
  spring: {
    name: 'spring',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#1A8244',
    headerBackground: '#2A9E5A',
    primaryButton: '#F86083',
    secondaryButton: '#1A8244',
    buttonShadow: '#00000020',
    hintBubble: '#2A9E5A',
    // Text
    titleText: '#F86083',
    primaryText: '#F86083',
    secondaryText: '#1A8244',
    // Chessboard
    player1Square: '#F86083',
    player2Square: '#1A8244',
    tabIconDefault: '#F86083',
    tabIconSelected: '#2A9E5A',
  },
  vaporWave: {
    name: 'vaporWave',
    dark: false,
    logoOpacity: '0.9',
    // Solids
    background: '#420A80',
    headerBackground: '#5A0EAA',
    primaryButton: '#F1216C',
    secondaryButton: '#420A80',
    buttonShadow: '#00000020',
    hintBubble: '#5A0EAA',
    // Text
    titleText: '#F1216C',
    primaryText: '#F1216C',
    secondaryText: '#420A80',
    // Chessboard
    player1Square: '#F1216C',
    player2Square: '#420A80',
    tabIconDefault: '#F1216C',
    tabIconSelected: '#5A0EAA',
  },
  space: {
    name: 'space',
    dark: true,
    logoOpacity: '0.8',
    // Solids
    background: '#2F2954',
    headerBackground: '#3A356A',
    primaryButton: '#F4CF57',
    secondaryButton: '#2F2954',
    buttonShadow: '#00000040',
    hintBubble: '#3A356A',
    // Text
    titleText: '#F4CF57',
    primaryText: '#F4CF57',
    secondaryText: '#2F2954',
    // Chessboard
    player1Square: '#F4CF57',
    player2Square: '#2F2954',
    tabIconDefault: '#F4CF57',
    tabIconSelected: '#3A356A',
  },
  spooky: {
    name: 'spooky',
    dark: true,
    logoOpacity: '0.8',
    // Solids
    background: '#322D1E',
    headerBackground: '#4A3F2A',
    primaryButton: '#DED19E',
    secondaryButton: '#322D1E',
    buttonShadow: '#00000040',
    hintBubble: '#4A3F2A',
    // Text
    titleText: '#DED19E',
    primaryText: '#DED19E',
    secondaryText: '#322D1E',
    // Chessboard
    player1Square: '#DED19E',
    player2Square: '#322D1E',
    tabIconDefault: '#DED19E',
    tabIconSelected: '#4A3F2A',
  },
} as const;