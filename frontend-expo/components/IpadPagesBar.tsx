import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";
import CustomTabButton from "./CustomTabButton";
import { glassColorSchemeFor, useGlassAvailable } from "@/utils/Glass";

const ICON_SIZE = 52;

// Order must match TAB_ROUTES in constants/tabs.ts.
const TABS = [
    { name: 'lessons', title: 'Lessons', icon: 'book', selectedIcon: 'book.fill', color: { dark: '#94CFFF', light: '#2e75c6' } },
    { name: 'puzzles', title: 'Puzzles', icon: 'puzzlepiece.extension', selectedIcon: 'puzzlepiece.extension.fill', color: { dark: '#93FF8F', light: '#29be31' } },
    { name: 'home', title: 'Home', icon: 'house', selectedIcon: 'house.fill', color: { dark: '#C9A7FF', light: '#8a4fd8' } },
    // Classroom keeps the trophy icon for now.
    { name: 'classroom', title: 'Classroom', icon: 'trophy', selectedIcon: 'trophy.fill', color: { dark: '#FFF37E', light: '#ffa90a' } },
    { name: 'shop', title: 'Shop', icon: 'cart', selectedIcon: 'cart.fill', color: { dark: '#6bddcd', light: '#0aa3a5' } },
] as const;

export default function IpadPagesBar({ }) {
    const { theme } = useTheme();
    const glassAvailable = useGlassAvailable();

    return (
        <Tabs
            detachInactiveScreens={false}
            screenOptions={{
                animation: 'shift',
                tabBarInactiveTintColor: theme.primaryText,
                headerShown: false,
                tabBarVariant: 'uikit',
                tabBarStyle: Platform.select({
                    ios: {
                        position: 'absolute',
                        height: 104,
                        flexDirection: 'row',
                        justifyContent: 'space-evenly',
                        borderRadius: 50,
                        overflow: 'hidden',
                        margin: 20,
                        paddingHorizontal: 15,
                        paddingBottom: 10,
                        paddingTop: 10,
                    },
                    default: {
                        paddingBottom: 0,
                    },
                }),
                sceneStyle: {
                    backgroundColor: theme.background,
                },
                // Icons only, sized for little hands. Each screen's title is still its VoiceOver label.
                tabBarShowLabel: false,
                tabBarIconStyle: {
                    pointerEvents: 'none',
                    width: ICON_SIZE + 4,
                    height: ICON_SIZE + 4,
                },
                tabBarItemStyle: {
                    paddingBottom: 0,
                    borderRadius: 40,
                    marginHorizontal: 2,
                },
                tabBarBackground: () => glassAvailable ?
                    (
                        <GlassView style={{
                            ...StyleSheet.absoluteFill,
                            borderRadius: 50,
                            shadowColor: theme.dark ? '#000000' : '#ffffff',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.5,
                            shadowRadius: 40,
                        }}
                            glassEffectStyle='clear'
                            tintColor={`${theme.background}DD`}
                            colorScheme={glassColorSchemeFor(theme.background, theme)}
                            isInteractive
                        />
                    ) : (
                        <BlurView intensity={20} style={{
                            ...StyleSheet.absoluteFill,
                            borderRadius: 50,
                            backgroundColor: `${theme.background}DD`,
                            overflow: 'hidden',
                        }} />
                    )
            }}
        >
            {TABS.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarIcon: ({ color, focused }) =>
                            <IconSymbol size={ICON_SIZE} name={focused ? tab.selectedIcon : tab.icon} color={color} />,
                        tabBarActiveTintColor: theme.dark ? tab.color.dark : tab.color.light,
                        tabBarButton: (props) => <CustomTabButton {...props} routeName={tab.name} />,
                    }}
                />
            ))}
        </Tabs>
    );
}
