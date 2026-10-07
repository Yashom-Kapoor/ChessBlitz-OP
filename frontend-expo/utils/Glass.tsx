import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether liquid glass should actually be rendered.
 *
 * `isLiquidGlassAvailable()` on its own is not enough:
 *  - some iOS 26 betas shipped without the underlying API and crash on `GlassView` /
 *    `GlassContainer`, which `isGlassEffectAPIAvailable()` guards against (expo/expo#40911)
 *  - it still reports `true` when the user has turned on Reduce Transparency, so those
 *    users are sent down the plain blurred fallback instead
 */
export function useGlassAvailable(): boolean {
    const [reduceTransparency, setReduceTransparency] = useState(false);

    useEffect(() => {
        let active = true;

        AccessibilityInfo.isReduceTransparencyEnabled()
            .then((enabled) => {
                if (active) setReduceTransparency(enabled);
            })
            .catch(() => {
                // Not supported on this platform - keep the effect enabled
            });

        const subscription = AccessibilityInfo.addEventListener(
            'reduceTransparencyChanged',
            setReduceTransparency
        );

        return () => {
            active = false;
            subscription.remove();
        };
    }, []);

    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable() && !reduceTransparency;
}

/**
 * Relative luminance of a `#RRGGBB` colour (WCAG sRGB formula), or `null` if it cannot be parsed.
 */
function luminance(color: string): number | null {
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) return null;

    const channels = [1, 3, 5].map((offset) => {
        const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Picks the glass colour scheme for a surface tinted with `color`.
 *
 * This follows the surface's own colour rather than the app theme: `colorScheme` controls how
 * light or dark the *material* renders, so a light button under a dark theme still needs light
 * material or the tint sits on a dark pane and the label stops being readable.
 *
 * Falls back to the theme when the colour is not plain hex, and to `'auto'` when there is no
 * theme either, which leaves the system appearance in charge.
 */
export function glassColorSchemeFor(color: string, theme?: { dark?: boolean }): 'dark' | 'light' | 'auto' {
    const value = luminance(color);

    if (value !== null) return value < 0.5 ? 'dark' : 'light';
    if (theme) return theme.dark ? 'dark' : 'light';

    return 'auto';
}
