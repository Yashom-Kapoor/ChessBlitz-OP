import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView, Pressable, ScrollView } from "react-native-gesture-handler";
import { Alert, ImageBackground, StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { CheckerPreview } from "@/components/CheckerPreview";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { Themes, ArtThemes } from "@/constants/Themes";
import backgroundImages, { BackgroundContext } from "@/context/Backgrounds";
import { BlurView } from "expo-blur";
import { useFocusEffect, useGlobalSearchParams } from "expo-router";
import GlobalStyle from "@/context/GlobalStyle";
import { Ionicons } from "@expo/vector-icons";
import camelToTitle from "@/utils/CamelToTitle";
import { buyItem } from "@/api/HandleShop";
import SelectionRing from "@/components/SelectionRing";
import { glassColorSchemeFor } from "@/utils/Glass";



const TILE_RADIUS = 16;

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
  // A card whose price row is gone centres geometrically but reads low, the board being the
  // heavy half of it, so those cards lift their contents by this much to sit optically centred
  const contentLift = isTablet ? 8 : 6;
  const { currency, themePrices, boardStatus, loadShop, loadPrices } = useShop();

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
      ...StyleSheet.absoluteFill,
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
    lockedOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: TILE_RADIUS,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: TILE_RADIUS,
    padding: isTablet ? 14 : 12,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: isTablet ? 190 : 170,
    },
    tileWithoutPriceRow: {
    paddingBottom: 14 + contentLift * 2,
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
    buyButton: {
    paddingVertical: isTablet ? 10 : 8,
    paddingHorizontal: isTablet ? 24 : 18,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    },
    buyButtonText: {
    textAlign: "center",
    },

  });

  const handleShopPageChange = (page: number) => {
    setShopPage(page);
    // Reset scroll position to the top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  useFocusEffect(
    useCallback(() => {
      loadShop();
      loadPrices();
    }, [loadShop, loadPrices])
  );

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

  const purchaseTheme = async (name: string) => {
    const success = await buyItem(themeKey(name));
    if (!success) {
      return;
    }
    await loadShop();

    setTheme(name);
    setSelectedThemeName(name as any);
  }



  const handleSwitchTheme = async (name: string) => {
    const key = themeKey(name);

    const item = checkPrice(name)
    if (item.status === "locked") {
      if (currency >= (item.price ?? Infinity)) {
        
        // const success = await buyItem(key);
        // if (!success) {
        //   return;
        // }
        // loadShop();

        // NEW: ask for confirmation first, purchase happens in purchaseTheme
        Alert.alert(
          `Buy ${camelToTitle(name)}?`,
          `This will cost ${item.price}. You'll have ${currency - (item.price as number)} left.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Buy", onPress: () => purchaseTheme(name) },
          ]
        );
        return;
      }
      else {
        Alert.alert(
          `${camelToTitle(name)} is locked`,
          `It costs ${item.price} and you have ${currency}.`,
          [{ text: "OK" }]
        );
        return;
      }
    }
    if (item.status === "coming_soon") {
      Alert.alert(
        `${camelToTitle(name)} is locked`,
        "This theme isn't in the shop yet.",
        [{ text: "OK" }]
      );
      return;
    }

    setTheme(name);
    setSelectedThemeName(name as any);
  }

  return (
    <GestureHandlerRootView style={localStyles.root}>
      <BackgroundContext theme={theme}>
        <View style={localStyles.header}>
          <Text style={{...localStyles.currencyText, color: theme.primaryText}}>{ currency }</Text></View>
        <View style={localStyles.switcherContainer}>
          <Pressable
            style={[
              localStyles.switcherButton,
              { backgroundColor: shopPage === 0 ? theme.secondaryButton : theme.background, borderColor: shopPage === 0 ? theme.secondaryText : theme.primaryText },
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
              { backgroundColor: shopPage === 1 ? theme.secondaryButton : theme.background, borderColor: shopPage === 1 ? theme.secondaryText : theme.primaryText },
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
                const isLocked = val.status !== "unlocked";
                // An affordable theme shows its price as a buy button instead of a lock
                const canBuy = val.status === "locked" && currency >= (val.price ?? Infinity);
                // The pill is filled with the card's own colour, so its outline follows that colour's brightness
                const pillOutline =
                  glassColorSchemeFor(t.secondaryButton, t) === "dark"
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(0,0,0,0.65)";

                return (
                  <TouchableOpacity
                    key={index}
                    style={[localStyles.themeTile,
                    { backgroundColor: t.secondaryButton, alignItems: 'center', justifyContent: 'center' },
                    (!isLocked || canBuy) && localStyles.tileWithoutPriceRow]}
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
                    {isLocked && !canBuy && (
                      <View style={localStyles.priceRow}>
                        <Text style={localStyles.priceText}>
                          {val.status === "locked" ? val.price : "Coming Soon"}
                        </Text>
                      </View>
                    )}
                    {isLocked && (
                      <View style={localStyles.lockedOverlay}>
                        {canBuy ? (
                          <TouchableOpacity
                            style={[localStyles.buyButton, { backgroundColor: t.secondaryButton, borderColor: pillOutline }]}
                            onPress={() => handleSwitchTheme(t.name)}
                          >
                            <Text style={[styles.h4, localStyles.buyButtonText, { color: t.secondaryText }]}>
                              {val.price}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Ionicons name="lock-closed" size={isTablet ? 48 : 40} color="rgba(255,255,255,0.92)" />
                        )}
                      </View>
                    )}
                    {isSelected && <SelectionRing color={t.secondaryButton} cardRadius={TILE_RADIUS} />}
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