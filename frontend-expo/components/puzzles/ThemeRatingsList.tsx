import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { ratingFor, ThemeRatings } from '@/api/Ratings';
import { darken, desaturate, PUZZLE_THEMES, PUZZLE_THEME_TEXT_COLOR } from '@/constants/PuzzleThemes';

type Props = {
  ratings: ThemeRatings | null;
  isTablet: boolean;
  /** Theme keys the player has unlocked. Locked themes keep a washed-out tint of their color. */
  unlockedThemes: readonly string[];
};

/** How far a locked row's color moves toward gray: soft, but each theme keeps its own tint. */
export const LOCKED_DESATURATION = 0.6;
const COMING_SOON_COLOR = '#B8B8C8';

// Display only: puzzles come from the Rated Puzzles board above, not from these rows.
export default function ThemeRatingsList({ ratings, isTablet, unlockedThemes }: Props) {
  const rowStyle = {
    minHeight: isTablet ? 136 : 104,
    borderRadius: isTablet ? 36 : 28,
    paddingHorizontal: isTablet ? 32 : 24,
    paddingVertical: isTablet ? 24 : 18,
    borderBottomWidth: isTablet ? 8 : 6,
  };
  const titleStyle = { fontSize: isTablet ? 32 : 26, lineHeight: isTablet ? 40 : 32 };
  const pillStyle = {
    paddingHorizontal: isTablet ? 18 : 14,
    paddingVertical: isTablet ? 10 : 8,
    borderRadius: isTablet ? 24 : 20,
    gap: isTablet ? 10 : 8,
  };
  const iconSize = isTablet ? 26 : 21;

  return (
    <View style={[styles.list, { gap: isTablet ? 26 : 18 }]}>
      {PUZZLE_THEMES.map(puzzle => {
        const locked = !unlockedThemes.includes(puzzle.key);
        const rating = ratingFor(ratings, puzzle.key);
        const color = locked ? desaturate(puzzle.color, LOCKED_DESATURATION) : puzzle.color;
        return (
          <View key={puzzle.key} accessible testID={`theme-rating-${puzzle.key}`}
            accessibilityLabel={locked ? `${puzzle.title}, locked`
              : `${puzzle.title}, ${rating === null ? 'rating unavailable' : `rating ${rating}`}`}
            style={[styles.row, rowStyle, { backgroundColor: color, borderBottomColor: darken(color, 0.22) }]}>
            <Text style={[styles.title, titleStyle, { color: PUZZLE_THEME_TEXT_COLOR }]}>{puzzle.title}</Text>
            {locked ? (
              <FontAwesome6 name="lock" iconStyle="solid" size={iconSize + 4} color={PUZZLE_THEME_TEXT_COLOR} />
            ) : (
              <View style={[styles.pill, pillStyle]}>
                <FontAwesome6 name="chess-knight" iconStyle="solid" size={iconSize} color={puzzle.color} />
                <Text style={[styles.ratingText, { color: puzzle.color, fontSize: isTablet ? 26 : 21 }]}>{rating ?? '—'}</Text>
              </View>
            )}
          </View>
        );
      })}
      <View accessible accessibilityLabel="Coming Soon, locked"
        style={[styles.row, rowStyle, styles.comingSoon,
          { backgroundColor: COMING_SOON_COLOR, borderBottomColor: darken(COMING_SOON_COLOR, 0.22) }]}>
        <Text style={[styles.title, titleStyle, { color: PUZZLE_THEME_TEXT_COLOR }]}>Coming Soon</Text>
        <FontAwesome6 name="lock" iconStyle="solid" size={iconSize + 4} color={PUZZLE_THEME_TEXT_COLOR} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { flex: 1, fontFamily: 'Nunito', fontWeight: '900' },
  pill: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, backgroundColor: '#FFFFFF' },
  ratingText: { fontFamily: 'Nunito', fontWeight: '900', fontVariant: ['tabular-nums'] },
  comingSoon: { opacity: 0.75 },
});
