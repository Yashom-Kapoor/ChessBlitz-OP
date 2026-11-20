import { useEffect } from "react";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

/** Breathing room between the card and the ring floating around it. */
const GAP = 5;
const THICKNESS = 2;
const PULSE_MS = 1500;

/**
 * A ring that floats just outside a card to mark it as the selected one.
 *
 * Rendered as an absolutely positioned sibling of the card's contents, so it sits outside the
 * card's own bounds and never shifts what is inside it. It is tinted with the card's own colour,
 * which reads against the page behind it, and pulses in and out so the selection catches the eye
 * without a hard highlight.
 */
export default function SelectionRing({ color, cardRadius }: { color: string; cardRadius: number }) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 0.985 + pulse.value * 0.035 }],
        opacity: 0.8 + pulse.value * 0.2,
    }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: "absolute",
                    top: -GAP,
                    left: -GAP,
                    right: -GAP,
                    bottom: -GAP,
                    borderRadius: cardRadius + GAP,
                    borderWidth: THICKNESS,
                    borderColor: color,
                    // Glow in the same colour, so the ring lifts off the page rather than sitting flat on it
                    shadowColor: color,
                    shadowOpacity: 0.8,
                    shadowRadius: 7,
                    shadowOffset: { width: 0, height: 0 },
                },
                pulseStyle,
            ]}
        />
    );
}
