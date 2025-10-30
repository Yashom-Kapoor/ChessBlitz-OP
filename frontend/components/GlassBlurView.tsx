import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

export default function GlassBlurView({ theme, isTablet, color, glass, interactive=false, ...rest }: any) {

    return isLiquidGlassAvailable() ? (
        <>
            <BlurView intensity={10} style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: `${color}60`,
                borderRadius: isTablet ? 30 : 20,
                overflow: 'hidden',
                pointerEvents: 'none',
            }} />
            <GlassView style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: isTablet ? 30 : 20,
                backgroundColor: color,
                opacity: 0.8,
            }}
                glassEffectStyle={glass}
                isInteractive={interactive}
            />
        </>
    ) : (
        <BlurView intensity={10} style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: `${color}DD`,
            borderRadius: isTablet ? 30 : 20,
            overflow: 'hidden',
            pointerEvents: 'none',
        }} />
    );
}