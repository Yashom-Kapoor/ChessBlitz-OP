import { useTheme } from "@/context/ThemeContext";
import { useNavigationState } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { useState } from "react";
import GlobalStyle from "@/context/GlobalStyle";

export default function CustomPuzzleButton({ name, onPress, isTablet, icon }: any) {
    const { theme } = useTheme();
    const title = name[0].toUpperCase() + name.slice(1);
    const [pressed, setPressed] = useState(false);

    const styles = GlobalStyle(theme, isTablet);

    return (
        <TouchableOpacity style={{
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            flexDirection: isTablet ? "row" : "column",
            borderRadius: 50,
            paddingBottom: isTablet ? 2 : 0,
        }} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}>
            <IconSymbol style={{
                pointerEvents: 'none',
            }} size={isTablet ? 30 : 23} name={icon} color={theme.primaryText} />
            <Text style={[styles.h6, {
                pointerEvents: 'none',
                paddingLeft: isTablet ? 10 : 0,
                paddingTop: isTablet ? 0 : 4,
                color: theme.primaryText,
            }]}>{title}</Text>
        </TouchableOpacity>
    );
}