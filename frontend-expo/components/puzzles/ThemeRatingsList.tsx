import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { ratingFor, ThemeRatings } from '@/api/Ratings';
import { PUZZLE_THEMES, PuzzleTheme, PUZZLE_THEME_TEXT_COLOR } from '@/constants/PuzzleThemes';

type Props = {
  ratings: ThemeRatings | null;
  isTablet: boolean;
  onSelect: (theme: PuzzleTheme) => void;
};

export default function ThemeRatingsList({ ratings, isTablet, onSelect }: Props) {
  const rowStyle = {
    minHeight: isTablet ? 116 : 92,
    borderRadius: isTablet ? 28 : 20,
    paddingHorizontal: isTablet ? 28 : 22,
    paddingVertical: isTablet ? 26 : 22,
  };
  const titleStyle = { fontSize: isTablet ? 28 : 22, lineHeight: isTablet ? 36 : 29 };

  return (
    <View style={[styles.list, { gap: isTablet ? 20 : 14 }]}>
      {PUZZLE_THEMES.map(puzzle => {
        const rating = ratingFor(ratings, puzzle.key);
        const foreground = PUZZLE_THEME_TEXT_COLOR;
        return (
          <TouchableOpacity key={puzzle.key} accessibilityRole="button"
            accessibilityLabel={`${puzzle.title}, ${rating === null ? 'rating unavailable' : `rating ${rating}`}`}
            accessibilityHint={`Open the ${puzzle.title} puzzle page`}
            activeOpacity={0.75} onPress={() => onSelect(puzzle)}
            style={[styles.row, rowStyle, { backgroundColor: puzzle.color }]}>
            <Text style={[styles.title, titleStyle, { color: foreground }]}>{puzzle.title}</Text>
            <View style={styles.rating}>
              <FontAwesome6 name="chess-knight" iconStyle="solid" size={isTablet ? 25 : 20} color={foreground} />
              <Text style={[styles.ratingText, { color: foreground, fontSize: isTablet ? 24 : 19 }]}>{rating ?? '—'}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <View accessible accessibilityRole="button" accessibilityLabel="Coming Soon, locked"
        accessibilityState={{ disabled: true }} style={[styles.row, rowStyle, styles.locked]}>
        <Text style={[styles.title, titleStyle, { color: '#FFFFFF' }]}>Coming Soon</Text>
        <FontAwesome6 name="lock" iconStyle="solid" size={isTablet ? 24 : 20} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { flex: 1, fontFamily: 'Nunito', fontWeight: '800' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  ratingText: { fontFamily: 'Nunito', fontWeight: '800', fontVariant: ['tabular-nums'] },
  locked: { backgroundColor: '#A0A0A0', opacity: 0.5 },
});
