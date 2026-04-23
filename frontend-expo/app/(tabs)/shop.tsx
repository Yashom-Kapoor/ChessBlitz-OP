import React, { useRef, useState } from "react";
import { GestureHandlerRootView, Pressable, ScrollView } from "react-native-gesture-handler";
import { ImageBackground, StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { CheckerPreview } from "@/components/CheckerPreview";
import { useTheme } from "@/context/ThemeContext";
import { Themes, ArtThemes } from "@/constants/Themes";
import backgroundImages, { BackgroundContext } from "@/context/Backgrounds";
import { BlurView } from "expo-blur";
import { useGlobalSearchParams } from "expo-router";
import GlobalStyle from "@/context/GlobalStyle";
import camelToTitle from "@/utils/CamelToTitle";

// Main screen component that displays all themes
export default function ShopScreen() {
  const { theme, setTheme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const { width: screenWidth } = useWindowDimensions();

  const [shopPage, setShopPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const gridColumns = isTablet ? 3 : 2;
  const gridHorizontalPadding = 24; // matches scrollContent horizontal padding (12 + 12)
  const tileGap = Math.max(12, Math.min(isTablet ? 20 : 16, Math.round(screenWidth * 0.03)));
  const tileWidth = (screenWidth - gridHorizontalPadding - tileGap * (gridColumns - 1)) / gridColumns;

  const styles = GlobalStyle(theme, isTablet);
  const localStyles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 12,
      paddingBottom: 85,
    },
    themeGrid: {
      paddingVertical: 15,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      columnGap: tileGap,
      rowGap: tileGap,
    },
    themeTile: {
      width: tileWidth,
      borderRadius: 12,
      padding: isTablet ? 14 : 12,
      paddingBottom: isTablet ? 18 : 16,
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: isTablet ? 170 : 145,
    },
    themeTitle: {
      textAlign: "center",
      marginBottom: 8,
    },
    artTileBackground: {
      ...StyleSheet.absoluteFillObject,
    },
    switcherContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      padding: 10,
      gap: 5,
      marginTop: 120,
    },
    switcherButton: {
      flex: 1,
      padding: 10,
      borderRadius: 5,
    },
    switcherText: {
      textAlign: 'center',
      paddingTop: 3,
    },
  });

  const handleShopPageChange = (page: number) => {
    setShopPage(page);
    // Reset scroll position to the top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <GestureHandlerRootView style={localStyles.root}>
      <BackgroundContext theme={theme}>
        <View style={localStyles.switcherContainer}>
          <Pressable
            style={[
              localStyles.switcherButton,
              { backgroundColor: shopPage === 0 ? theme.secondaryButton : theme.background },
            ]}
            onPress={() => handleShopPageChange(0)}
          >
            <Text
              style={[styles.h5, 
                localStyles.switcherText,
                { color: shopPage === 0 ? theme.secondaryText : theme.titleText },
              ]}
            >
              Board Themes
            </Text>
          </Pressable>
          <Pressable
            style={[
              localStyles.switcherButton,
              { backgroundColor: shopPage === 1 ? theme.secondaryButton : theme.background },
            ]}
            onPress={() => handleShopPageChange(1)}
          >
            <Text
              style={[styles.h5, 
                localStyles.switcherText,
                { color: shopPage === 1 ? theme.secondaryText : theme.titleText },
              ]}
            >
              Piece Themes
            </Text>
          </Pressable>
        </View>

        <ScrollView ref={scrollViewRef} contentContainerStyle={localStyles.scrollContent}>
          {shopPage == 0 ? (
            <View style={localStyles.themeGrid}>
              {[...Object.values(Themes), ...Object.values(ArtThemes)].map((t, index) => {
                const isArtTheme = Object.prototype.hasOwnProperty.call(ArtThemes, t.name);
                const artThemeBackground = backgroundImages[t.name];

                return (
                  <TouchableOpacity
                    key={index}
                    style={[localStyles.themeTile, { backgroundColor: t.secondaryButton, alignItems: 'center', justifyContent: 'center' }]}
                    onPress={() => setTheme(t.name)}
                  >
                    {isArtTheme && artThemeBackground && (
                      <ImageBackground source={artThemeBackground} style={{...localStyles.artTileBackground, opacity: 0.3}} imageStyle={{ borderRadius: 12 }} />
                    )}
                    <Text style={[styles.h4, localStyles.themeTitle, { color: t.secondaryText }]}>
                    {camelToTitle(t.name)}
                    </Text>
                    {/* CheckerPreview shows the chessboard color scheme */}
                    <CheckerPreview lightColor={t.player1Square} darkColor={t.player2Square} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.h3, { color: theme.primaryText, textAlign: 'center', marginTop: 50 }]}>
              Chess piece themes coming soon!
            </Text>
          )}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}