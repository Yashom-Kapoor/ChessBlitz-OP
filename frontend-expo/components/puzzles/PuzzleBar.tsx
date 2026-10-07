import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import CustomTabButton from "../CustomTabButton";
import GlobalStyle from "@/context/GlobalStyle";
import CustomPuzzleButton from "./CustomPuzzleButton";
import { glassColorSchemeFor, useGlassAvailable } from "@/utils/Glass";

export default function PuzzleBar({ onHint, onUndo, onRedo, onReset, onOptions, isTablet, raised = false }: any) {
    const { theme } = useTheme();
    const styles = GlobalStyle(theme, isTablet);
    const glassAvailable = useGlassAvailable();

    // GlassContainer lets the bar's glass and the pressed button's glass merge into one shape
    // as they approach, instead of rendering as two stacked panes. It degrades to a plain View
    // off iOS. `spacing` is the distance at which that merge starts.
    return (
        <GlassContainer spacing={isTablet ? 30 : 20} style={Platform.select({
            ios: {
                position: raised ? 'relative' : 'absolute',
                width: '90%',
                height: isTablet ? 80 : 65,
                flexDirection: 'row',
                justifyContent: 'space-evenly',
                borderRadius: 50,
                margin: 20,
                marginTop: raised ? 5 : 20,
                paddingHorizontal: isTablet ? 15 : 10,
                paddingBottom: isTablet ? 10 : 5,
                paddingTop: isTablet ? 10 : 5,
            },
            default: {
                paddingBottom: 0,
            },
        })}>
            {glassAvailable ? (
                <GlassView style={{
                    ...StyleSheet.absoluteFill,
                    borderRadius: 50,
                    shadowColor: theme.dark ? '#00000080' : '#ffffff',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.2,
                    shadowRadius: 30,
                }}
                    glassEffectStyle='clear'
                    tintColor={`${theme.background}DD`}
                    colorScheme={glassColorSchemeFor(theme.background, theme)}
                />
            ) : (
                <BlurView intensity={20} style={{
                    ...StyleSheet.absoluteFill,
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
        </GlassContainer>
    );
}