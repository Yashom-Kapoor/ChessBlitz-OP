import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";

/**
 * Background fill for buttons, cards and bubbles.
 *
 * Liquid glass was deliberately removed from these surfaces. `GlassView` tints the material
 * rather than filling it, so a themed button ends up showing mostly glass instead of its own
 * colour - which left labels too dark to read against their own background. These now render
 * the blurred fill that every non-iOS-26 device already used, so the look is consistent across
 * platforms. Glass is still used on `PuzzleBar` and `IpadPagesBar`, which sit over scrolling
 * content and are where it actually earns itself.
 *
 * `glass`, `interactive`, `tintOpacity` and `colorScheme` are still accepted so the 24 call
 * sites did not need touching, but no longer have any effect.
 */
export default function GlassBlurView({ theme, isTablet, color, glass, interactive=false, borderRadius=(isTablet ? 30 : 20), outset=false, tintOpacity=0.5, colorScheme, solid=false, ...rest }: any) {

    const boxShadow = outset ? `0 -${isTablet ? 20 : 12}px 0 inset ${theme.buttonShadow}` : undefined;

    // `solid` skips the blur too, for a flat themed fill.
    if (solid) {
        return (
            <View pointerEvents="none" style={{
                ...StyleSheet.absoluteFill,
                backgroundColor: color,
                borderRadius: borderRadius,
                boxShadow: boxShadow,
            }} />
        );
    }

    return (
        <BlurView intensity={10} style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: `${color}DD`,
            borderRadius: borderRadius,
            overflow: 'hidden',
            pointerEvents: 'none',
            shadowOpacity: 1,
            shadowRadius: 20,
            shadowColor: '#000',
            boxShadow: boxShadow,
        }} />
    );
}
