import React, { useCallback, useState } from 'react';
import { useWindowDimensions, View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router';
import { getMyRatings, ThemeRatings } from '@/api/Ratings';
import ThemeRatingsList from '@/components/puzzles/ThemeRatingsList';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { BackgroundContext } from '@/context/Backgrounds';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from '@/components/GlassBlurView';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';

const IMG_HEIGHT = 300;
const STICKY_TITLE_THRESHOLD = IMG_HEIGHT - 80;
// The sticky "Puzzles" title is pulled up to sit over the lower part of the hero image.
const TITLE_OVERLAP = IMG_HEIGHT * 0.9;

export default function PuzzlesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const styles = GlobalStyle(theme, isTablet);
  const { width } = useWindowDimensions();
  const IMG_WIDTH = width * 1.5; // wider than the screen, cropped by the hero container
  const heroHeight = isTablet ? IMG_HEIGHT + 60 : IMG_HEIGHT;

  const localStyles = StyleSheet.create({
    heroContainer: {
      position: 'relative',
      width,
      height: heroHeight,
      overflow: 'hidden',
      opacity: 0.3,
    },
    heroImage: {
      position: 'absolute',
      top: 0,
      height: '100%',
      // Use a wider image so the parallax movement is noticeable,
      // and keep it centered so scaling/pivot feels centered.
      width: IMG_WIDTH,
      left: (width - IMG_WIDTH) / 2,
    },
    stickyTitleBar: {
      width: '100%',
      alignSelf: 'stretch',
      marginTop: -TITLE_OVERLAP,
      marginBottom: 35 + (isTablet ? 56 : 44),
      paddingTop: 0,
      paddingBottom: isTablet ? 14 : 12,
      paddingHorizontal: 0,
      position: 'relative',
      overflow: 'hidden',
      zIndex: 10,
      elevation: 10,
    },
    stickyTitleInner: {
      paddingHorizontal: isTablet ? 28 : 20,
    },
    stickyTitleGradient: {
      ...StyleSheet.absoluteFill,
    },
    stickyTitleText: {
      color: theme.primaryText,
      textAlign: 'center',
      zIndex: 2,
      paddingTop: 60,
      paddingBottom: 20,
    },
    content: {
      ...styles.gapContainer,
      marginTop: isTablet ? 30 : 20,
    },
    bottomSpacing: {
      height: 30,
    },
  });

  // Stretchy parallax header: the whole hero moves, so pulling down past the top zooms the image
  // to fill the gap (scale up to 2x), and scrolling up drifts it at a slower rate than the content.
  const heroAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-heroHeight, 0, heroHeight],
            [-heroHeight / 2, 0, heroHeight * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-heroHeight, 0, heroHeight], [2, 1, 1], 'clamp'),
        },
      ],
    };
  });

  const stickyGradientAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollOffset.value,
        [STICKY_TITLE_THRESHOLD - 100, STICKY_TITLE_THRESHOLD + 100],
        [0, 1],
        'clamp'
      ),
    };
  });

  const [ratings, setRatings] = useState<ThemeRatings | null>(null);

  // Refetch whenever the tab comes back into focus, so ratings update after solving a puzzle.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyRatings()
        .then((data) => { if (active) setRatings(data); })
        .catch((error) => console.log('Error loading theme ratings:', error));
      return () => { active = false; };
    }, [])
  );

  return (
    <GestureHandlerRootView style={{ ...styles.contentContainer }}>
      <BackgroundContext theme={theme}>
        <Animated.ScrollView
          ref={scrollRef}
          scrollEventThrottle={16}
          // contentContainerStyle={styles.scrollContainer}
          stickyHeaderIndices={[1]}
        >
          <Animated.View style={[localStyles.heroContainer, heroAnimatedStyle]}>
            <Animated.Image
              source={require('@/assets/images/auraknight.png')}
              style={localStyles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>

          <View style={localStyles.stickyTitleBar}>
            <Animated.View style={[localStyles.stickyTitleGradient, stickyGradientAnimatedStyle]}>
              <LinearGradient
                colors={['#000000CC', '#00000066', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <View style={localStyles.stickyTitleInner}>
              <Text style={[styles.title, localStyles.stickyTitleText]}>Puzzles</Text>
            </View>
          </View>

          <View style={{ ...localStyles.content, alignItems: 'center' }}>
            {/* Top Demo Puzzle Button */}
            <TouchableOpacity
              style={{ ...styles.flexBigButton, justifyContent: 'center' }}
              onPress={() => {
                router.push(`/puzzles/demo_puzzle?isTablet=${isTablet}`);
              }}
            >
              <ImageBackground
                source={require('@/assets/images/puzzle.png')}
                style={StyleSheet.absoluteFill}
              />
              <GlassBlurView
                theme={theme}
                isTablet={isTablet}
                color={theme.dark ? theme.player1Square : theme.player2Square}
                glass="clear"
              />
              <Text style={[styles.h1, { color: theme.dark ? theme.player2Square : theme.player1Square, width: '100%', textAlign: 'center' }]}>
                Practice Puzzle
              </Text>
            </TouchableOpacity>

            {/* Puzzle Ratings Section */}
            <Text
              style={[
                styles.subtitle,
                { textAlign: 'center', marginTop: 10, width: '100%' },
              ]}
            >
              Puzzle Ratings
            </Text>

            <ThemeRatingsList ratings={ratings} isTablet={isTablet} onSelect={puzzle => {
              router.push({ pathname: '/puzzles/themes/[theme]', params: { theme: puzzle.key, isTablet: String(isTablet) } });
            }} />
          </View>

          <View style={localStyles.bottomSpacing} />
        </Animated.ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
