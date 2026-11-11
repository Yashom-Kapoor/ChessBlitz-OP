import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from '@/context/GlobalStyle';
import { OpponentSpeed, PuzzleSettings, usePuzzleSettings } from '@/context/PuzzleSettingsContext';

type ToggleKey = 'autoFlip' | 'haptics' | 'showTimer';

const toggles: { key: ToggleKey; title: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'autoFlip', title: 'Flip board to my side', description: 'Show the board from the side you are playing', icon: 'swap-vert' },
    { key: 'haptics', title: 'Haptics', description: 'Feel a tap when you move', icon: 'vibration' },
    { key: 'showTimer', title: 'Show timer', description: 'Display the clock under the board', icon: 'timer' },
];

const speeds: { key: OpponentSpeed; label: string }[] = [
    { key: 'slow', label: 'Slow' },
    { key: 'normal', label: 'Normal' },
    { key: 'fast', label: 'Fast' },
];

const OPEN_SPRING = { damping: 22, stiffness: 220, mass: 0.9 };
const CLOSE_TIMING = { duration: 220, easing: Easing.in(Easing.cubic) };
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 800;

export default function PuzzleOptions({ visible, onClose, isTablet }: {
    visible: boolean;
    onClose: () => void;
    isTablet: boolean;
}) {
    const { theme } = useTheme();
    const textStyles = GlobalStyle(theme, isTablet);
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const settings = usePuzzleSettings();

    // The Modal stays mounted until the closing slide finishes.
    const [mounted, setMounted] = useState(visible);
    const translateY = useSharedValue(windowHeight);
    const backdrop = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            setMounted(true);
            translateY.value = windowHeight;
            backdrop.value = 0;
            translateY.value = withSpring(0, OPEN_SPRING);
            backdrop.value = withTiming(1, { duration: 200 });
        } else if (mounted) {
            backdrop.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(windowHeight, CLOSE_TIMING, (finished) => {
                if (finished) runOnJS(setMounted)(false);
            });
        }
    }, [visible]);

    const pan = Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .onUpdate((event) => {
            // Follow the finger downwards; resist a little when pulled up.
            translateY.value = event.translationY > 0 ? event.translationY : event.translationY / 6;
        })
        .onEnd((event) => {
            if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
                runOnJS(onClose)();
            } else {
                translateY.value = withSpring(0, OPEN_SPRING);
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

    const set = (changes: Partial<PuzzleSettings>) => settings.update(changes);

    return (
        <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <GestureHandlerRootView style={styles.overlay}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Close puzzle options" onPress={onClose} style={StyleSheet.absoluteFill} />
                </Animated.View>

                <GestureDetector gesture={pan}>
                    <Animated.View accessibilityViewIsModal style={[styles.sheet, sheetStyle, {
                        backgroundColor: theme.background,
                        borderColor: theme.buttonShadow,
                        borderTopLeftRadius: isTablet ? 30 : 24,
                        borderTopRightRadius: isTablet ? 30 : 24,
                        padding: isTablet ? 24 : 20,
                        paddingTop: 10,
                        paddingBottom: Math.max(insets.bottom, 20),
                    }]}>
                        <View style={[styles.handle, { backgroundColor: `${theme.primaryText}40` }]} />
                        <View style={styles.header}>
                            <Text accessibilityRole="header" style={[textStyles.h2, { color: theme.primaryText }]}>Puzzle options</Text>
                            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close puzzle options" onPress={onClose} style={styles.close}>
                                <MaterialIcons name="close" size={26} color={theme.primaryText} />
                            </TouchableOpacity>
                        </View>

                        {toggles.map(({ key, title, description, icon }) => (
                            <Pressable key={key}
                                accessibilityRole="switch" accessibilityState={{ checked: settings[key] }}
                                accessibilityLabel={title} accessibilityHint={description}
                                onPress={() => set({ [key]: !settings[key] })}
                                style={[styles.row, { backgroundColor: theme.primaryButton }]}>
                                <MaterialIcons name={icon} size={26} color={theme.primaryText} />
                                <View style={styles.label}>
                                    <Text style={[textStyles.h4, { color: theme.primaryText }]}>{title}</Text>
                                    <Text style={[textStyles.h6, { color: theme.primaryText }]}>{description}</Text>
                                </View>
                                <Switch
                                    value={settings[key]}
                                    onValueChange={(value) => set({ [key]: value })}
                                    importantForAccessibility="no-hide-descendants"
                                    accessibilityElementsHidden
                                />
                            </Pressable>
                        ))}

                        <View style={[styles.row, styles.speedRow, { backgroundColor: theme.primaryButton }]}>
                            <View style={styles.speedHeader}>
                                <MaterialIcons name="speed" size={26} color={theme.primaryText} />
                                <View style={styles.label}>
                                    <Text style={[textStyles.h4, { color: theme.primaryText }]}>Opponent speed</Text>
                                    <Text style={[textStyles.h6, { color: theme.primaryText }]}>How fast the reply moves are played</Text>
                                </View>
                            </View>
                            <View accessibilityRole="radiogroup" style={[styles.segments, { backgroundColor: `${theme.primaryText}14` }]}>
                                {speeds.map(({ key, label }) => {
                                    const selected = settings.opponentSpeed === key;
                                    return (
                                        <Pressable key={key}
                                            accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${label} opponent speed`}
                                            onPress={() => set({ opponentSpeed: key })}
                                            style={[styles.segment, selected && { backgroundColor: theme.background }]}>
                                            <Text style={[textStyles.h6, { color: theme.primaryText, fontWeight: selected ? '800' : '600' }]}>{label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
    backdrop: { backgroundColor: '#00000066' },
    sheet: { width: '100%', maxWidth: 560, borderWidth: 1, borderBottomWidth: 0, gap: 10 },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16 },
    label: { flex: 1, gap: 3 },
    speedRow: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
    speedHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    segments: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
    segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
});
