import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";
import CustomTabButton from "./CustomTabButton";
import { glassColorSchemeFor, useGlassAvailable } from "@/utils/Glass";
import { TAB_INFO, TAB_ROUTES, tabColor } from "@/constants/tabs";

const ICON_SIZE = 52;

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
            {TAB_ROUTES.map((name) => (
                <Tabs.Screen
                    key={name}
                    name={name}
                    options={{
                        title: TAB_INFO[name].title,
                        tabBarIcon: ({ color, focused }) =>
                            <IconSymbol size={ICON_SIZE} name={focused ? TAB_INFO[name].selectedIcon : TAB_INFO[name].icon} color={color} />,
                        tabBarActiveTintColor: tabColor(name, theme.dark),
                        tabBarButton: (props) => <CustomTabButton {...props} routeName={name} />,
                    }}
                />
            ))}
        </Tabs>
    );
}
