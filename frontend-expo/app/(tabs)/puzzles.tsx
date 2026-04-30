import React, { useState } from 'react';
import { Dimensions, View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGlobalSearchParams, useRouter } from 'expo-router';
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

const { width } = Dimensions.get('window');
const IMG_HEIGHT = 300;
const IMG_WIDTH = width * 1.5; // wider for more noticeable parallax
const STICKY_TITLE_THRESHOLD = IMG_HEIGHT - 80;

// 🔹 Same InfoBox as in ProfileScreen
const InfoBox = ({
  children,
  style,
  theme,
  isTablet,
  locked,
}: {
  children: React.ReactNode;
  style?: any;
  theme: any;
  isTablet: boolean;
  locked?: boolean;
}) => {
  return (
    <View
      pointerEvents={locked ? 'none' : 'auto'}
      style={[
        style,
        {
          borderRadius: isTablet ? 30 : 20,
          padding: isTablet ? 25 : 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          backgroundColor: theme.primaryButton, // 🔵 blue block background
        },
      ]}
    >
      {children}
    </View>
  );
};

export default function PuzzlesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const styles = GlobalStyle(theme, isTablet);

  const localStyles = StyleSheet.create({
    heroContainer: {
      position: 'relative',
      width,
      height: isTablet ? IMG_HEIGHT + 60 : IMG_HEIGHT,
      overflow: 'hidden',
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
      marginTop: -IMG_HEIGHT*0.9,
      marginBottom: 35 + (isTablet ? 56 : 44),
      paddingTop: -20 + (isTablet ? 18 : 14),
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
      ...StyleSheet.absoluteFillObject,
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
    puzzleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 20,
    },
    puzzleCard: {
      width: isTablet ? '31%' : '47%',
      alignItems: 'center',
    },
    lockedPuzzleCard: {
      opacity: 0.45,
    },
    puzzleIconContainer: {
      width: 60,
      height: 60,
      borderRadius: isTablet ? 30 : 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    puzzleIcon: {
      fontSize: 28,
    },
    puzzleTitle: {
      color: theme.primaryText, // same as ProfileScreen
      marginBottom: 8,
      textAlign: 'center',
    },
    puzzleRating: {
      color: `${theme.primaryText}DD`, // slightly different white, same as ProfileScreen
      marginTop: -5,
    },
    ratingLabel: {
      color: `${theme.primaryText}60`, // gray "Rating", same as ProfileScreen
      marginTop: 2,
    },
    bottomSpacing: {
      height: 30,
    },
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-IMG_HEIGHT + IMG_HEIGHT, IMG_HEIGHT, IMG_HEIGHT + IMG_HEIGHT],
            [-IMG_HEIGHT / 2, 0, IMG_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-IMG_HEIGHT, 0, IMG_HEIGHT], [1, 1, 1]),
        },
        {
          translateX: interpolate(
            0,
            [-IMG_HEIGHT, -IMG_WIDTH/2, IMG_HEIGHT],
            [IMG_WIDTH * 0.25, 0, -IMG_WIDTH * 0.25]
          )
        }
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

  type PuzzleTypeCardProps = {
    title: string;
    rating: number | string;
    icon: string;
    color: string;
    locked?: boolean;
  };

  type PuzzleType = {
    title: string;
    rating: number | string;
    icon: string;
    color: string;
    locked?: boolean;
  };

  const [userData, setUserData] = useState({
    name: 'Chess Master',
    email: 'chessmaster@example.com',
    password: '••••••••',
    joinDate: 'June 2024',
    totalPuzzlesSolved: 1247,
    overallRating: 1842,
    puzzleRatings: {
      fork: 1890,
      pin: 1820,
      promotion: 1765,
      skewer: 1950,
      backRank: 1800,
      discoveredAttack: 1825,
      trappedPiece: 1780,
      removingDefender: 1850,
      smotheredMate: 1900,
      zugzwang: 1750,
    },
  });

  const puzzleTypes: PuzzleType[] = [
    { title: 'Fork', rating: userData.puzzleRatings.fork, icon: '⚔️', color: '#E76F51' },
    { title: 'Pin', rating: userData.puzzleRatings.pin, icon: '📌', color: '#2A9D8F' },
    { title: 'Promotion', rating: userData.puzzleRatings.promotion, icon: '👑', color: '#E9C46A' },
    { title: 'Skewer', rating: userData.puzzleRatings.skewer, icon: '🍢', color: '#F4A261' },
    { title: 'Back Rank', rating: userData.puzzleRatings.backRank, icon: '⏮️', color: '#264653' },
    { title: 'Discovered Attack', rating: userData.puzzleRatings.discoveredAttack, icon: '🔎', color: '#3A86FF' },
    { title: 'Trapped Piece', rating: userData.puzzleRatings.trappedPiece, icon: '🧱', color: '#6C757D' },
    { title: 'Removing Defender', rating: userData.puzzleRatings.removingDefender, icon: '💥', color: '#EF476F' },
    { title: 'Smothered Mate', rating: userData.puzzleRatings.smotheredMate, icon: '💀', color: '#8D99AE' },
    { title: 'Zugzwang', rating: userData.puzzleRatings.zugzwang, icon: '♟️', color: '#118AB2' },
    { title: 'Coming Soon', rating: 'Locked', icon: '🔒', color: '#A0A0A0', locked: true },
  ];

  const PuzzleTypeCard = ({ title, rating, icon, color, locked }: PuzzleTypeCardProps) => {
    return (
      <InfoBox style={[localStyles.puzzleCard, locked && localStyles.lockedPuzzleCard]} theme={theme} isTablet={isTablet} locked={locked}>
        {/* colored circle/block behind icon */}
        <View style={[localStyles.puzzleIconContainer, { backgroundColor: color }]}>
          <Text style={localStyles.puzzleIcon}>{icon}</Text>
        </View>

        {/* text colors exactly as in ProfileScreen */}
        <Text style={[styles.h5, localStyles.puzzleTitle]}>{title}</Text>
        <Text style={[styles.h2, localStyles.puzzleRating]}>{rating}</Text>
        <Text style={[styles.h6, localStyles.ratingLabel]}>{locked ? 'Locked' : 'Rating'}</Text>
      </InfoBox>
    );
  };

  return (
    <GestureHandlerRootView style={{ ...styles.contentContainer }}>
      <BackgroundContext theme={theme}>
        <Animated.ScrollView
          ref={scrollRef}
          scrollEventThrottle={16}
          // contentContainerStyle={styles.scrollContainer}
          stickyHeaderIndices={[1]}
        >
          <View style={{ ...localStyles.heroContainer, opacity: 0.3 }}>
            <Animated.Image
              source={require('@/assets/images/auraknight.png')}
              style={{ ...localStyles.heroImage, ...imageAnimatedStyle }}
              resizeMode="cover"
            />
          </View>

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

            <View style={localStyles.puzzleGrid}>
              {puzzleTypes.map((puzzle, index) => (
                <PuzzleTypeCard
                  key={index}
                  title={puzzle.title}
                  rating={puzzle.rating}
                  icon={puzzle.icon}
                  color={puzzle.color}
                  locked={puzzle.locked}
                />
              ))}
            </View>
          </View>

          <View style={localStyles.bottomSpacing} />
        </Animated.ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}
