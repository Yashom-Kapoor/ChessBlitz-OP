import { useTheme } from "@/context/ThemeContext";
import { useNavigationState } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet, TouchableOpacity } from "react-native";

export default function CustomTabButton({ routeName, onPress, children, style, ...rest }: any) {
    const { theme } = useTheme();
    // read active route name from navigation state (reliable across expo-router / RN Navigation)
    const active = useNavigationState((state) => {
        const r = state?.routes?.[state.index];
        return r?.name;
    });

    const focused = active === routeName;

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
            {...rest}
        >
            {focused && (
                <BlurView intensity={20} style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: 50,
                    overflow: 'hidden',
                }}/>
            )}
            {children}
        </TouchableOpacity>
    );
}