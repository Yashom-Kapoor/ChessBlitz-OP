import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';

export default function ThemePuzzlePlaceholder({ color, title }: { color: string; title: string }) {
  const clipId = `puzzle-${useId().replace(/:/g, '')}`;
  // Flat artwork only: the theme preview never mounts an interactive chessboard.
  const tint = (amount: number) => {
    const channels = [1, 3, 5].map(offset => Math.round(
      parseInt(color.slice(offset, offset + 2), 16) * amount + 221 * (1 - amount)
    ));
    return `rgb(${channels.join(',')})`;
  };
  const accent = tint(0.75);
  const soft = tint(0.35);
  const white = '#FFFFFF';

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${title} puzzle illustration`}
      style={styles.frame}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300">
        <Defs><ClipPath id={clipId}><Rect width="300" height="300" rx="18" /></ClipPath></Defs>
        <G clipPath={`url(#${clipId})`}>
          <Rect width="300" height="300" fill={white} />
          <Rect x="200" width="100" height="100" fill={soft} />
          <Rect y="100" width="100" height="100" fill={accent} />
          <Rect x="100" y="100" width="100" height="100" fill={soft} />
          <Rect x="200" y="100" width="100" height="100" fill={accent} />
          <Rect y="200" width="100" height="100" fill={soft} />
          <Rect x="100" y="200" width="100" height="100" fill={accent} />
          <Circle cx="200" cy="50" r="20" fill={white} />
          <Circle cx="50" cy="100" r="20" fill={white} />
          <Circle cx="150" cy="100" r="20" fill={white} />
          <Circle cx="250" cy="100" r="20" fill={soft} />
          <Circle cx="100" cy="150" r="20" fill={accent} />
          <Circle cx="200" cy="150" r="20" fill={accent} />
          <Circle cx="50" cy="200" r="20" fill={soft} />
          <Circle cx="150" cy="200" r="20" fill={accent} />
          <Circle cx="250" cy="200" r="20" fill={accent} />
          <Circle cx="100" cy="250" r="20" fill={accent} />
          <Circle cx="200" cy="250" r="20" fill={accent} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '88%', maxWidth: 580, aspectRatio: 1, alignSelf: 'center', padding: 12,
    borderRadius: 24, backgroundColor: '#DDDDDD' },
});
