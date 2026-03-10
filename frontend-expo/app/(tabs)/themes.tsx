import React, { useRef, useState } from "react";
import { GestureHandlerRootView, Pressable, ScrollView } from "react-native-gesture-handler";
import { ImageBackground, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { CheckerPreview } from "@/components/CheckerPreview";
import { useTheme } from "@/context/ThemeContext";
import { Themes, ArtThemes } from "@/constants/Themes";
import backgroundImages, { BackgroundContext } from "@/context/Backgrounds";
import { BlurView } from "expo-blur";
import { useGlobalSearchParams } from "expo-router";
import GlobalStyle from "@/context/GlobalStyle";
import camelToTitle from "@/utils/CamelToTitle";

// Main screen component that displays all themes
export default function ThemesScreen() {
  const { theme, setTheme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const isArtTheme = Object.prototype.hasOwnProperty.call(ArtThemes, theme.name);

  const [themePage, setThemePage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const styles = GlobalStyle(theme, isTablet);
  const localStyles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: 85,
    },
    themeRow: {
      flexDirection: "row", // Text and preview side by side
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
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

  const handleThemePageChange = (page: number) => {
    setThemePage(page);
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
              { backgroundColor: themePage === 0 ? theme.primaryButton : theme.background },
            ]}
            onPress={() => handleThemePageChange(0)}
          >
            <Text
              style={[styles.h5, 
                localStyles.switcherText,
                { color: themePage === 0 ? theme.primaryText : theme.titleText },
              ]}
            >
              Minimalistic
            </Text>
          </Pressable>
          <Pressable
            style={[
              localStyles.switcherButton,
              { backgroundColor: themePage === 1 ? theme.primaryButton : theme.background },
            ]}
            onPress={() => handleThemePageChange(1)}
          >
            <Text
              style={[styles.h5, 
                localStyles.switcherText,
                { color: themePage === 1 ? theme.primaryText : theme.titleText },
              ]}
            >
              Artistic
            </Text>
          </Pressable>
        </View>

        <ScrollView ref={scrollViewRef} contentContainerStyle={localStyles.scrollContent}>
          {themePage == 0 ? (
            <>
              {Object.values(Themes).map((t, index) => {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[localStyles.themeRow, { backgroundColor: t.secondaryButton }]}
                    onPress={() => setTheme(t.name)}
                  >
                    <Text style={{ ...styles.h2, color: t.secondaryText }}>
                    {camelToTitle(t.name)}
                    </Text>
                    {/* CheckerPreview shows the chessboard color scheme */}
                    <CheckerPreview lightColor={t.player1Square} darkColor={t.player2Square} />
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <>
              {Object.values(ArtThemes).map((t, index) => {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[localStyles.themeRow, { backgroundColor: t.secondaryButton }]}
                    onPress={() => setTheme(t.name)}
                  >
                    <Text style={{ ...styles.h2, color: t.secondaryText }}>
                    {camelToTitle(t.name)}
                    </Text>
                    {/* CheckerPreview shows the chessboard color scheme */}
                    <CheckerPreview lightColor={t.player1Square} darkColor={t.player2Square} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}