import React, { useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

type Props = {
  color: string;
  title: string;
  puzzleIds: readonly string[];
  completedIds: readonly string[];
  onSelect: (puzzleId: string) => void;
};

export default function ThemePuzzleGrid({ color, title, puzzleIds, completedIds, onSelect }: Props) {
  const clipId = `puzzle-${useId().replace(/:/g, '')}`;
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
    <View style={styles.frame}>
      <View style={styles.board}>
        <Svg pointerEvents="none" accessible={false} width="100%" height="100%" viewBox="0 0 300 300">
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
            <G fill="none" stroke="#DDDDDD" strokeWidth="1.5">
              <Path d="M100 0V30a20 20 0 0 1 0 40V130a20 20 0 0 1 0 40V230a20 20 0 0 0 0 40V300" />
              <Path d="M200 0V30a20 20 0 0 1 0 40V130a20 20 0 0 0 0 40V230a20 20 0 0 1 0 40V300" />
              <Path d="M0 100H30a20 20 0 0 0 40 0H130a20 20 0 0 0 40 0H230a20 20 0 0 0 40 0H300" />
              <Path d="M0 200H30a20 20 0 0 1 40 0H130a20 20 0 0 1 40 0H230a20 20 0 0 0 40 0H300" />
            </G>
          </G>
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          {puzzleIds.map((puzzleId, index) => {
            const completed = completedIds.includes(puzzleId);
            return (
              <Pressable key={puzzleId} accessibilityRole="button"
                accessibilityLabel={`${title} puzzle ${index + 1} of 9${completed ? ', completed' : ''}`}
                accessibilityHint={completed ? undefined : 'Open this puzzle'}
                accessibilityState={{ disabled: completed }} disabled={completed}
                onPress={() => onSelect(puzzleId)}
                style={({ pressed }) => [styles.piece, { left: `${(index % 3) * 100 / 3}%`,
                  top: `${Math.floor(index / 3) * 100 / 3}%`, opacity: pressed ? 0.6 : 1 }]}>
                <View style={[styles.badge, completed && styles.completedBadge]}>
                  <Text style={styles.pieceLabel}>{completed ? '✓' : index + 1}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '88%', maxWidth: 580, aspectRatio: 1, alignSelf: 'center', padding: 12,
    borderRadius: 24, backgroundColor: '#DDDDDD' },
  board: { flex: 1 },
  piece: { position: 'absolute', width: '33.333333%', height: '33.333333%', alignItems: 'center', justifyContent: 'center' },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#44475F', alignItems: 'center', justifyContent: 'center' },
  completedBadge: { backgroundColor: '#217A45' },
  pieceLabel: { color: '#FFFFFF', fontFamily: 'Nunito', fontWeight: '900', fontSize: 22 },
});
