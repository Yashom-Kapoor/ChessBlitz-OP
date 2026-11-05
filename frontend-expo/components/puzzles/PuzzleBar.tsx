import { useState } from 'react';
import PuzzleOptions from './PuzzleOptions';
import { PuzzleAction, PuzzleActionAvailability } from './puzzleActions';
import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { Platform, StyleSheet } from "react-native";
import CustomPuzzleButton from "./CustomPuzzleButton";
import { glassColorSchemeFor, useGlassAvailable } from "@/utils/Glass";

export default function PuzzleBar({ onHint, onUndo, onRedo, onReset, available, isTablet, raised = false }: { onHint: () => void; onUndo: () => void; onRedo: () => void; onReset: () => void; available: PuzzleActionAvailability; isTablet: boolean; raised?: boolean }) {
    const { theme } = useTheme();
    const glassAvailable = useGlassAvailable();
    const [optionsVisible, setOptionsVisible] = useState(false);
    const handlers = { hint: onHint, undo: onUndo, redo: onRedo, reset: onReset };
    const runAction = (action: PuzzleAction) => {
        if (!available[action]) return;
        setOptionsVisible(false);
        handlers[action]();
    };

    // GlassContainer lets the bar's glass and the pressed button's glass merge into one shape
    // as they approach, instead of rendering as two stacked panes. It degrades to a plain View
    // off iOS. `spacing` is the distance at which that merge starts.
    return (
        <>
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

            <CustomPuzzleButton name='hint' icon='lightbulb' onPress={() => runAction('hint')} disabled={!available.hint} isTablet={isTablet} />
            <CustomPuzzleButton name='undo' icon='arrow.uturn.backward' onPress={() => runAction('undo')} disabled={!available.undo} isTablet={isTablet} />
            <CustomPuzzleButton name='redo' icon='arrow.uturn.right' onPress={() => runAction('redo')} disabled={!available.redo} isTablet={isTablet} />
            <CustomPuzzleButton name='reset' icon='restart' onPress={() => runAction('reset')} disabled={!available.reset} isTablet={isTablet} />
            <CustomPuzzleButton name='options' icon='ellipsis' onPress={() => setOptionsVisible(true)} isTablet={isTablet} />
        </GlassContainer>
        <PuzzleOptions visible={optionsVisible} onClose={() => setOptionsVisible(false)} onAction={runAction} available={available} isTablet={isTablet} />
        </>
    );
}