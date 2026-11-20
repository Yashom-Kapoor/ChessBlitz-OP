import GlassBlurView from '@/components/GlassBlurView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import GlobalStyle from '@/context/GlobalStyle';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';

interface WrongMovePromptProps {
    visible: boolean;
    onTryAgain: () => void;
    isTablet: boolean;
}

export default function WrongMovePrompt({ visible, onTryAgain, isTablet }: WrongMovePromptProps) {
    const { theme } = useTheme();
    const textStyles = GlobalStyle(theme, isTablet);
    const accentColor = theme.dark ? '#FF9292' : '#A82D39';
    const radius = isTablet ? 30 : 20;

    if (!visible) {
        return null;
    }

    return (
        <Animated.View
            entering={FadeInDown.duration(180)
                .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
                .reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(130).reduceMotion(ReduceMotion.System)}
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={[
                styles.container,
                {
                    borderColor: theme.dark ? '#FF85854D' : '#B9384438',
                    borderRadius: radius,
                    bottom: isTablet ? 24 : 12,
                    left: isTablet ? 24 : 12,
                    padding: isTablet ? 22 : 16,
                    right: isTablet ? 24 : 12,
                },
            ]}
        >
            <GlassBlurView
                theme={theme}
                isTablet={isTablet}
                color={theme.background}
                borderRadius={radius}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, {
                backgroundColor: theme.dark ? '#A52F4026' : '#FF777714',
                borderRadius: radius,
            }]} />

            <View style={styles.feedbackRow}>
                <View style={[styles.alertMark, {
                    backgroundColor: theme.dark ? '#FF92921F' : '#B9384414',
                    width: isTablet ? 50 : 40,
                    height: isTablet ? 50 : 40,
                    borderRadius: isTablet ? 25 : 20,
                }]}>
                    <MaterialIcons name="close" size={isTablet ? 26 : 22} color={accentColor} />
                </View>
                <View style={styles.message}>
                    <Text style={[textStyles.h2, styles.heading, { color: accentColor }]}>Not quite!</Text>
                    <Text style={[textStyles.h5, styles.description, { color: theme.primaryText }]}>
                        Try a different move. You&apos;ve got this.
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                accessibilityHint="Undoes the incorrect move so you can try again"
                accessibilityLabel="Try again"
                accessibilityRole="button"
                onPress={onTryAgain}
                style={[styles.retryButton, { borderRadius: radius }]}
            >
                <LinearGradient
                    pointerEvents="none"
                    colors={['#FF8585', '#F55C68']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.buttonFace, {
                        borderRadius: radius - 2,
                        minHeight: isTablet ? 62 : 50,
                        paddingHorizontal: isTablet ? 24 : 16,
                    }]}
                >
                    <MaterialIcons name="undo" size={isTablet ? 26 : 22} color="#32151D" />
                    <Text style={[textStyles.h4, styles.buttonLabel]}>Try Again</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        boxShadow: '0 8px 24px #00000045',
        gap: 16,
        position: 'absolute',
        zIndex: 50,
    },
    feedbackRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
    },
    alertMark: {
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    message: {
        flex: 1,
        minWidth: 0,
    },
    heading: {
        fontWeight: '800',
    },
    description: {
        marginTop: 3,
    },
    retryButton: {
        backgroundColor: '#C43F50',
        borderBottomColor: '#C43F50',
        borderBottomWidth: 6,
    },
    buttonFace: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF40',
    },
    buttonLabel: {
        color: '#32151D',
        fontWeight: '900',
    },
});
