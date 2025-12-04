import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

export default function GlassBlurView({ theme, isTablet, color, glass, interactive=false, borderRadius=(isTablet ? 30 : 20), outset=false, ...rest }: any) {

    return isLiquidGlassAvailable() ? (
        <>
            <BlurView intensity={10} style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: `${color}60`,
                borderRadius: borderRadius,
                overflow: 'hidden',
                pointerEvents: 'none',
            }} />
            <GlassView style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: borderRadius,
                backgroundColor: color,
                opacity: 0.8,
                boxShadow: outset ? `0 -${isTablet ? 20 : 12}px 0 inset ${theme.buttonShadow}` : undefined
            }}
                glassEffectStyle={glass}
                isInteractive={interactive}
            />
        </>
    ) : (
        <BlurView intensity={10} style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: `${color}DD`,
            borderRadius: borderRadius,
            overflow: 'hidden',
            pointerEvents: 'none',
            shadowOpacity: 1,
            shadowRadius: 20,
            shadowColor: '#000',
            boxShadow: outset ? `0 -${isTablet ? 20 : 12}px 0 inset ${theme.buttonShadow}` : undefined
        }} />
    );
}