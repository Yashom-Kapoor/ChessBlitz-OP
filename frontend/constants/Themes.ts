export const Themes = {
  default: {
    // Properties
    name: 'default',
    dark: true,
    // Solids
    background: '#25262e',
    primaryButton: '#2B2D3B',
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
    // Solids
    background: '#E5E5E5',
    primaryButton: '#FFFFFF',
    secondaryButton: '#6b6b6f',
    buttonShadow: '#00000020',
    hintBubble: '#76604a', // Darker for better contrast with primaryText
    // Text
    titleText: '#333333',
    primaryText: '#4F4F4F',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#FFFFFF',
    player2Square: '#76604a',
  },
  dark: {
    name: 'dark',
    dark: true,
    // Solids
    background: '#0A0A0A',
    primaryButton: '#2b2b2b',
    secondaryButton: '#E0E0E0',
    buttonShadow: '#00000050',
    hintBubble: '#c0c0c0', // Darker for better contrast with primaryText
    // Text
    titleText: '#FFFFFF',
    primaryText: '#E0E0E0',
    secondaryText: '#1A1A2A',
    // Chessboard
    player1Square: '#c0c0c0',
    player2Square: '#252525',
  },
  mint: {
    name: 'mint',
    dark: false,
    // Solids
    background: '#b4edd8',
    primaryButton: '#E6FFF2',
    secondaryButton: '#1c6740',
    buttonShadow: '#00000020',
    hintBubble: '#1c6740', // slightly lighter for better contrast with white text
    // Text
    titleText: '#1A4D2E',
    primaryText: '#29671C',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#E6FFF2',
    player2Square: '#52c69b',
  },
  lavender: {
    name: 'lavender',
    dark: false,
    // Solids
    background: '#d6caec',
    primaryButton: '#F3E8FF',
    secondaryButton: '#4A148C',
    buttonShadow: '#00000020',
    hintBubble: '#4A148C', // lighter for better white contrast
    // Text
    titleText: '#4A148C',
    primaryText: '#4A148C',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#F3E8FF',
    player2Square: '#7e4eb7',
  },
  strawberry: {
    name: 'strawberry',
    dark: false,
    // Solids
    background: '#f4cdcd',
    primaryButton: '#FFE6E6',
    secondaryButton: '#B71C1C',
    buttonShadow: '#00000020',
    hintBubble: '#B71C1C', // lighter for white
    // Text
    titleText: '#B71C1C',
    primaryText: '#B71C1C',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#FFE6E6',
    player2Square: '#ca5a5a',
  },
  blueberry: {
    name: 'blueberry',
    dark: false,
    // Solids
    background: '#c4e0f7',
    primaryButton: '#ddeefa',
    secondaryButton: '#0D47A1',
    buttonShadow: '#00000020',
    hintBubble: '#0D47A1', // slightly lighter for white contrast
    // Text
    titleText: '#0D47A1',
    primaryText: '#0D47A1',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#ddeefa',
    player2Square: '#5386d3',
  },
  thaiTea: {
    name: 'thaiTea',
    dark: false,
    // Solids
    background: '#ffdfa3',
    primaryButton: '#FDF2E3',
    secondaryButton: '#7B3F00',
    buttonShadow: '#00000020',
    hintBubble: '#7B3F00', // slightly lighter
    // Text
    titleText: '#7B3F00',
    primaryText: '#7B3F00',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#FDF2E3',
    player2Square: '#a0624e',
  },
  terminal: {
    name: 'terminal',
    dark: true,
    // Solids
    background: '#181B20', // slightly richer black
    primaryButton: '#252525', // deep terminal greenish black
    secondaryButton: '#78A616',
    buttonShadow: '#00000040',
    hintBubble: '#78A616',
    // Text
    titleText: '#c3ea6f',
    primaryText: '#c3ea6f',
    secondaryText: '#222222',
    // Chessboard
    player1Square: '#a3d23d',
    player2Square: '#252525',
  },
  midnight: {
    name: 'midnight',
    dark: true,
    // Solids
    background: '#000000',
    primaryButton: '#101010',
    secondaryButton: '#323338',
    buttonShadow: '#00000050',
    hintBubble: '#323338', // Darker for better contrast with primaryText
    // Text
    titleText: '#FFFFFF',
    primaryText: '#E0E0E0',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#3d3e42',
    player2Square: '#000000',
  }
} as const;

export const ArtThemes = {
  winter: {
    name: 'winter',
    dark: true,
    // Solids
    background: '#083457',
    primaryButton: '#0A4A7A',
    secondaryButton: '#bfd5e7',
    buttonShadow: '#00000040',
    hintBubble: '#bfd5e7',
    // Text
    titleText: '#E2E3E9',
    primaryText: '#E2E3E9',
    secondaryText: '#083457',
    // Chessboard
    player1Square: '#E2E3E9',
    player2Square: '#083457',
  },
  summer: {
    name: 'summer',
    dark: false,
    // Solids
    background: '#FFD6F7', // brighter summer
    primaryButton: '#FFF2FB',
    secondaryButton: '#c44aad',
    buttonShadow: '#00000020',
    hintBubble: '#c44aad',
    // Text
    titleText: '#A72A63', // readable
    primaryText: '#A72A63', // readable purple/red
    secondaryText: '#FFF2FB', // on purple
    // Chessboard
    player1Square: '#FFF2FB',
    player2Square: '#de6dc9',
  },
  autumn: {
    name: 'autumn',
    dark: false,
    // Solids
    background: '#F7D897', // lighter
    primaryButton: '#FCE7CF',
    secondaryButton: '#E05A1A', // much lighter than text
    buttonShadow: '#00000020',
    hintBubble: '#E05A1A',
    // Text
    titleText: '#CD3E00',
    primaryText: '#CD3E00',
    secondaryText: '#FFF6ED',
    // Chessboard
    player1Square: '#FCE7CF',
    player2Square: '#ee731b',
  },
  spring: {
    name: 'spring',
    dark: false,
    // Solids
    background: '#B6EDCA', // fresh grass
    primaryButton: '#E7FCE5',
    secondaryButton: '#2A9E5A',
    buttonShadow: '#00000020',
    hintBubble: '#2A9E5A',
    // Text
    titleText: '#1A8244', // readable
    primaryText: '#1A8244',
    secondaryText: '#F0FFF5', // on greens
    // Chessboard
    player1Square: '#E7FCE5',
    player2Square: '#2A9E5A',
  },
  vaporWave: {
    name: 'vaporWave',
    dark: false,
    // Solids
    background: '#f6ccfc', // vapor light
    primaryButton: '#F6EAFE',
    secondaryButton: '#863acd',
    buttonShadow: '#00000020',
    hintBubble: '#863acd',
    // Text
    titleText: '#5A0EAA',
    primaryText: '#5A0EAA',
    secondaryText: '#F6EAFE',
    // Chessboard
    player1Square: '#f6ccfc',
    player2Square: '#863acd',
  },
  space: {
    name: 'space',
    dark: true,
    // Solids
    background: '#21223A',
    primaryButton: '#2B2950', // darker for contrast
    secondaryButton: '#F4CF57', // light accent
    buttonShadow: '#00000040',
    hintBubble: '#F4CF57',
    // Text
    titleText: '#F4CF57',
    primaryText: '#ffeeb6',
    secondaryText: '#2B2950',
    // Chessboard
    player1Square: '#F4CF57',
    player2Square: '#2B2950',
  },
  pixel: {
    name: 'pixel',
    dark: false,
    // Solids
    background: '#89d6ab', // slightly richer black
    primaryButton: '#b6e7cb', // deep terminal greenish black
    secondaryButton: '#1d7341',
    buttonShadow: '#00000040',
    hintBubble: '#1d7341',
    // Text
    titleText: '#2e6a47',
    primaryText: '#2e6a47',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#efd8bd',
    player2Square: '#a4661e',
  },
  darkFantasy: {
    name: 'darkFantasy',
    dark: true,
    // Solids
    background: '#30383f',
    primaryButton: '#101010',
    secondaryButton: '#334a5d',
    buttonShadow: '#00000050',
    hintBubble: '#334a5d', // Darker for better contrast with primaryText
    // Text
    titleText: '#FFFFFF',
    primaryText: '#E0E0E0',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#ff91b0',
    player2Square: '#2c2e30',
  },
  spooky: {
    name: 'spooky',
    dark: true,
    // Solids
    background: '#241C16',
    primaryButton: '#2F2314', // very dark brown
    secondaryButton: '#DED19E', // accent
    buttonShadow: '#00000040',
    hintBubble: '#DED19E',
    // Text
    titleText: '#DED19E',
    primaryText: '#DED19E',
    secondaryText: '#241C16',
    // Chessboard
    player1Square: '#DED19E',
    player2Square: '#2F2314',
  },
  metroCity: {
    name: 'metroCity',
    dark: true,
    // Solids
    background: '#0d2544',
    primaryButton: '#294d7b',
    secondaryButton: '#ffc677',
    buttonShadow: '#00000050',
    hintBubble: '#ffc677', // Darker for better contrast with primaryText
    // Text
    titleText: '#FFFFFF',
    primaryText: '#E0E0E0',
    secondaryText: '#0d2544',
    // Chessboard
    player1Square: '#ffc677',
    player2Square: '#294d7b',
  },
  valentine: {
    name: 'valentine',
    dark: false,
    // Solids
    background: '#f4cdd5',
    primaryButton: '#FFE6E6',
    secondaryButton: '#b5283f',
    buttonShadow: '#00000020',
    hintBubble: '#b5283f', // lighter for white
    // Text
    titleText: '#b71c38',
    primaryText: '#b71c38',
    secondaryText: '#FFFFFF',
    // Chessboard
    player1Square: '#FFE6E6',
    player2Square: '#ea6d5a',
  }
} as const;