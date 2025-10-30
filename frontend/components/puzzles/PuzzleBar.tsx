import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import CustomTabButton from "../CustomTabButton";
import GlobalStyle from "@/context/GlobalStyle";
import CustomPuzzleButton from "./CustomPuzzleButton";

export default function PuzzleBar({ onHint, onUndo, onRedo, onReset, onOptions, isTablet }: any) {
    const { theme } = useTheme();
    const styles = GlobalStyle(theme, isTablet);

    return (
        <View style={Platform.select({
            ios: {
                position: 'absolute',
                width: '90%',
                height: isTablet ? 80 : 65,
                flexDirection: 'row',
                justifyContent: 'space-evenly',
                borderRadius: 50,
                margin: 20,
                paddingHorizontal: isTablet ? 15 : 10,
                paddingBottom: isTablet ? 10 : 5,
                paddingTop: isTablet ? 10 : 5,
            },
            default: {
                paddingBottom: 0,
            },
        })}>
            {isLiquidGlassAvailable() ? (
                <GlassView style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: 50,
                    backgroundColor: `${theme.background}DD`,
                    shadowColor: theme.dark ? '#00000080' : '#ffffff',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 1,
                    shadowRadius: 40,
                }}
                    glassEffectStyle='clear'
                />
            ) : (
                <BlurView intensity={20} style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: 50,
                    backgroundColor: `${theme.background}DD`,
                    overflow: 'hidden',
                }} />
            )}

            <CustomPuzzleButton name='hint' icon='lightbulb' onPress={onHint} isTablet={isTablet} />
            <CustomPuzzleButton name='undo' icon='arrow.uturn.backward' onPress={onUndo} isTablet={isTablet} />
            <CustomPuzzleButton name='redo' icon='arrow.uturn.right' onPress={onRedo} isTablet={isTablet} />
            <CustomPuzzleButton name='reset' icon='restart' onPress={onReset} isTablet={isTablet} />
            <CustomPuzzleButton name='options' icon='ellipsis' onPress={onOptions} isTablet={isTablet} />
        </View>
    );
}