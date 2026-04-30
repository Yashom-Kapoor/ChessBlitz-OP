import React, { useRef, useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { getShopData, getShopPrices, buyItem } from "@/api/HandleShop";

// Main screen component that displays all themes
export default function ShopScreen() {
  const { theme, setTheme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';
  const { width: screenWidth } = useWindowDimensions();

  const [shopPage, setShopPage] = useState(0);
  const [selectedThemeName, setSelectedThemeName] = useState(theme.name);
  const scrollViewRef = useRef<ScrollView>(null);

  const gridColumns = isTablet ? 3 : 2;
  const gridHorizontalPadding = 24; // matches scrollContent horizontal padding (12 + 12)
  const tileGap = Math.max(12, Math.min(isTablet ? 20 : 16, Math.round(screenWidth * 0.03)));
  const tileWidth = (screenWidth - gridHorizontalPadding - tileGap * (gridColumns - 1)) / gridColumns;

  const styles = GlobalStyle(theme, isTablet);
  const [themePrices, setThemePrices] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState(0);
  const [boardStatus, setBoardStatus] = useState<Record<string, boolean>>({});

  const localStyles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 12,
      paddingBottom: 85,
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
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: tileGap,
      marginTop: 40,
    },
    switcherButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 30, // pill shape
      borderWidth: 2,
      borderColor: "#3A3D4D",
      alignItems: "center",
      backgroundColor: "#D9D9D9",
    },
    switcherText: {
      textAlign: 'center',
      paddingTop: 3,
    },
    selectedThemeTile: {
    borderWidth: 2,
    borderColor: "#4DA6FF",
    shadowColor: "#4DA6FF",
    shadowOpacity: 0.9,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    },
    header: {
    marginTop: 60,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    },
    headerTitle: {
    textAlign: "center",
    },
    currencyText: {
    position: "absolute",
    right: 20,
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    },
    themeGrid: {
    paddingVertical: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 24,
    },
    themeTile: {
    width: tileWidth - 5,
    borderRadius: 16,
    padding: isTablet ? 14 : 12,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: isTablet ? 190 : 170,
    },
    priceText: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 1,
    },
    priceRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    },

  });

  const handleShopPageChange = (page: number) => {
    setShopPage(page);
    // Reset scroll position to the top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  useEffect(() => {
      loadShop();
      loadPrices();
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadShop();
      loadPrices();
    }, [])
  );
  
  const loadShop = async () => {
    const data = await getShopData();
    setCurrency(data.currency);
    setBoardStatus(data);
  };

  const loadPrices = async () => {
    const data = await getShopPrices();
    setThemePrices(data);
  };

  const themeKey = (str: string) => {
    return `${str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")}_board`
  }

  const checkPrice = (name: string) => {
    const key = themeKey(name);
    if (!key) return { status: "coming_soon" };

    const unlocked = boardStatus?.[key];
    if (unlocked) return { status: "unlocked" };

    const price = themePrices?.[key];
    if (price !== undefined) return { status: "locked", price };

    return { status: "coming_soon" };
  }

  const handleSwitchTheme = async (name: string) => {
    const key = themeKey(name);

    const item = checkPrice(name)
    if (item.status === "locked") {
      if (currency >= (item.price ?? Infinity)) {
        const success = await buyItem(key);
        if (!success) {
          return;
        }
        loadShop();
      }
      else {
        alert("This theme is locked");
        return;
      }
    }
    if (item.status === "coming_soon") {
      alert("This theme is locked");
      return;
    }

    setTheme(name);
    setSelectedThemeName(name as any);
  }

  return (
    <GestureHandlerRootView style={localStyles.root}>
      <BackgroundContext theme={theme}>
        <View style={localStyles.header}>
          <Text style={localStyles.currencyText}>{ currency }</Text></View>
        <View style={localStyles.switcherContainer}>
          <Pressable
            style={[
              localStyles.switcherButton,
              { backgroundColor: shopPage === 0 ? "#E5E5E5" : "transparent", borderColor: shopPage === 0 ? "#E5E5E5" : "#454A64", },
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
                const isSelected = selectedThemeName === t.name;
                const isArtTheme = Object.prototype.hasOwnProperty.call(ArtThemes, t.name);
                const artThemeBackground = backgroundImages[t.name];
                const val = checkPrice(t.name); 

                return (
                  <TouchableOpacity
                    key={index}
                    style={[localStyles.themeTile,
                    { backgroundColor: t.secondaryButton, alignItems: 'center', justifyContent: 'center' },
                      isSelected && localStyles.selectedThemeTile,]}
                    onPress={(() => handleSwitchTheme(t.name))}
                  >
                    {isArtTheme && artThemeBackground && (
                      <ImageBackground source={artThemeBackground} style={{...localStyles.artTileBackground, opacity: 0.3}} imageStyle={{ borderRadius: 12 }} />
                    )}
                    <Text style={[styles.h4, localStyles.themeTitle, { color: t.secondaryText }]}>
                    {camelToTitle(t.name)}
                    </Text>
                    {/* CheckerPreview shows the chessboard color scheme */}
                    <CheckerPreview lightColor={t.player1Square} darkColor={t.player2Square} />
                    <View style={localStyles.priceRow}>
                      <Text style={localStyles.priceText}>
                        {val.status === "unlocked"
                            ? "Unlocked"
                            : val.status === "locked"
                            ? val.price
                            : "Coming Soon"
                        }
                    </Text></View>
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