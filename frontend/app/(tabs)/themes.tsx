import React, { useRef, useState } from "react";
import { GestureHandlerRootView, Pressable, ScrollView } from "react-native-gesture-handler";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { CheckerPreview } from "@/components/CheckerPreview";
import { useTheme } from "@/context/ThemeContext";
import { Themes, ArtThemes } from "@/constants/Colors";

// Define the list of available themes with name, text color, and base light/dark colors
const themes = [
  { name: "Default", id: 'default', dark: "#454A64", light: "#FFF37E" },
  { name: "Light", id: 'light', dark: "#595959", light: "#F1F1F1" },
  { name: "Dark", id: 'dark', dark: "#191A21", light: "#595959" },
  { name: "Mint", id: 'mint', dark: "#29671C", light: "#93FF8F" },
  { name: "Lavender", id: 'lavender', dark: "#3C1044", light: "#C88CF1" },
  { name: "Strawberry", id: 'strawberry', dark: "#B12B55", light: "#FFC6F8" },
  { name: "Blueberry", id: 'blueberry', dark: "#3D4AA5", light: "#CEDFEF" },
  { name: "Thai Tea", id: 'thaiTea', dark: "#340C0C", light: "#9E5C46" },
  { name: "Terminal", id: 'terminal', dark: "#191A1B", light: "#78A616" },
  { name: "Midnight", id: 'midnight', dark: "#0C0E13", light: "#60759F" },
];

const artThemes = [
  { name: "Winter", id: 'winter', dark: "#083457", light: "#e2e3e9" },
  { name: "Summer", id: 'summer', dark: "#52164a", light: "#de636f" },
  { name: "Autumn", id: 'autumn', dark: "#cd3e00", light: "#f7d897" },
  { name: "Spring", id: 'spring', dark: "#1a8244", light: "#f86083" },
  { name: "Vapor Wave", id: 'vaporWave', dark: "#420a80", light: "#f1216c" },
  { name: "Space", id: 'space', dark: "#2f2954", light: "#f4cf57" },
  { name: "Pixel", id: 'pixel', dark: "#05242a", light: "#6fa551" },
  { name: "Dark Fantasy", id: 'darkFantasy', dark: "#001834", light: "#ffb1c6" },
  { name: "Spooky", id: 'spooky', dark: "#322d1e", light: "#ded19e" },
  { name: "Metro City", id: 'metroCity', dark: "#051d43", light: "#eba945" },
  { name: "Valentine", id: 'valentine', dark: "#ba3026", light: "#f2bf9e" },
]

// Main screen component that displays all themes
export default function ThemesScreen() {
  const { theme, setTheme } = useTheme();
  const [themePage, setThemePage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background, // Background of the whole screen
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
    themeText: {
      fontWeight: "bold",
      fontSize: 18,
    },
    switcherContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      padding: 10,
      gap: 5,
    },
    switcherButton: {
      flex: 1,
      padding: 10,
      borderRadius: 5,
    },
    switcherText: {
      textAlign: 'center',
      fontWeight: "bold",
      fontSize: 16,
    },
  });

  const handleThemePageChange = (page: number) => {
    setThemePage(page);
    // Reset scroll position to the top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <GestureHandlerRootView style={styles.root}>

      <View style=  {styles.switcherContainer}>
        <Pressable
          style={[
            styles.switcherButton,
            { backgroundColor: themePage === 0 ? theme.primaryButton : theme.background },
          ]}
          onPress={() => handleThemePageChange(0)}
        >
          <ThemedText
            style={[
              styles.switcherText,
              { color: themePage === 0 ? theme.primaryText : theme.titleText },
            ]}
          >
            Minimalistic
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.switcherButton,
            { backgroundColor: themePage === 1 ? theme.primaryButton : theme.background },
          ]}
          onPress={() => handleThemePageChange(1)}
        >
          <ThemedText
            style={[
              styles.switcherText,
              { color: themePage === 1 ? theme.primaryText : theme.titleText },
            ]}
          >
            Artistic
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {themePage == 0 ? (
          <>
            {themes.map((t, index) => {
              return (
                <Pressable
                  key={index}
                  style={[styles.themeRow, { backgroundColor: t.light }]}
                  onPress={() => setTheme(t.id)}
                >
                  <ThemedText style={{ ...styles.themeText, color: t.dark }}>
                  {t.name}
                  </ThemedText>
                  {/* CheckerPreview shows the chessboard color scheme */}
                  <CheckerPreview lightColor={t.light} darkColor={t.dark} />
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            {artThemes.map((t, index) => {
              return (
                <Pressable
                  key={index}
                  style={[styles.themeRow, { backgroundColor: t.light }]}
                  onPress={() => setTheme(t.id)}
                >
                  <ThemedText style={{ ...styles.themeText, color: t.dark }}>
                  {t.name}
                  </ThemedText>
                  {/* CheckerPreview shows the chessboard color scheme */}
                  <CheckerPreview lightColor={t.light} darkColor={t.dark} />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </GestureHandlerRootView>
  );
}