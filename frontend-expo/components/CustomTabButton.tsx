import { useTheme } from "@/context/ThemeContext";
import { useNavigationState } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

export default function CustomTabButton({ routeName, onPress, children, style, ...rest }: any) {
    const { theme } = useTheme();
    const navigationState = useNavigationState((state) => state);
    const routes = navigationState?.routes ?? [];
    const activeIndex = navigationState?.index ?? 0;
    const active = routes[activeIndex]?.name;
    const ownIndex = routes.findIndex((route: any) => route?.name === routeName);
    const isThumbHost = ownIndex === 0;
    const [segmentWidth, setSegmentWidth] = useState(0);
    const thumbX = useSharedValue(0);
    const thumbOpacity = useSharedValue(0);

    const focused = active === routeName;

    useEffect(() => {
        if (!isThumbHost || segmentWidth <= 0) return;

        thumbOpacity.value = withTiming(1, { duration: 130 });
        thumbX.value = withSpring(activeIndex * segmentWidth, {
            damping: 20,
            stiffness: 210,
            mass: 0.5,
        });
    }, [activeIndex, isThumbHost, segmentWidth, thumbOpacity, thumbX]);

    const sharedThumbStyle = useAnimatedStyle(() => ({
        opacity: thumbOpacity.value,
        transform: [{ translateX: thumbX.value }],
    }));

    return (
        <TouchableOpacity
            onPress={onPress}
            android_ripple={{ color: 'transparent' }}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                borderRadius: 50,
            }}
            onLayout={isThumbHost ? (event) => {
                const width = event.nativeEvent.layout.width + 3;
                if (width > 0 && Math.abs(width - segmentWidth) > 0.5) {
                    setSegmentWidth(width);
                }
            } : undefined}
            {...rest}
        >
            {isThumbHost && segmentWidth > 0 && (
                <Animated.View pointerEvents="none" style={[styles.sharedThumb, { width: segmentWidth }, sharedThumbStyle]}>
                    <BlurView intensity={20} style={{
                        ...StyleSheet.absoluteFillObject,
                        borderRadius: 50,
                        overflow: 'hidden',
                        backgroundColor: `${theme.secondaryButton}22`,
                    }} />
                </Animated.View>
            )}

            {children}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    sharedThumb: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 50,
    },
});