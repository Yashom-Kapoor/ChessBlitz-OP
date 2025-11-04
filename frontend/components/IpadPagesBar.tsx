import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";
import CustomTabButton from "./CustomTabButton";
import { LinearGradient } from "expo-linear-gradient";

export default function IpadPagesBar({ }) {
    const { theme } = useTheme();

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
                        height: 80,
                        flexDirection: 'row',
                        justifyContent: 'space-evenly',
                        borderRadius: 50,
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
                tabBarLabelStyle: {
                    fontSize: 16,
                    fontWeight: 500,
                    paddingLeft: 5,
                    pointerEvents: 'none',
                    fontFamily: "Nunito",
                },
                tabBarIconStyle: {
                    pointerEvents: 'none',
                },
                tabBarItemStyle: {
                    paddingBottom: 0,
                },
                tabBarBackground: () => isLiquidGlassAvailable() ?
                    (
                        <GlassView style={{
                            ...StyleSheet.absoluteFillObject,
                            borderRadius: 50,
                            backgroundColor: `${theme.background}DD`,
                            shadowColor: theme.dark ? '#000000' : '#ffffff',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.5,
                            shadowRadius: 40,
                        }}
                            glassEffectStyle='clear'
                            isInteractive
                        />
                    ) : (
                        <BlurView intensity={20} style={{
                            ...StyleSheet.absoluteFillObject,
                            borderRadius: 50,
                            backgroundColor: `${theme.background}DD`,
                            overflow: 'hidden',
                        }} />
                    )
            }}
        >
            <Tabs.Screen
                name="puzzles"
                options={{
                    title: 'Puzzles',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={30} name={focused ? "puzzlepiece.extension.fill" : "puzzlepiece.extension"} color={color} />,
                    tabBarActiveTintColor: theme.dark ? '#93FF8F' : '#29be31',
                    tabBarButton: (props) => <CustomTabButton {...props} routeName="puzzles" />,
                }}
            />
            <Tabs.Screen
                name="lessons"
                options={{
                    title: 'Lessons',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={30} name={focused ? "book.fill" : "book"} color={color} />,
                    tabBarActiveTintColor: theme.dark ? '#94CFFF' : '#2e75c6',
                    tabBarButton: (props) => <CustomTabButton {...props} routeName="lessons" />,
                }}
            />
            <Tabs.Screen
                name="ranking"
                options={{
                    title: 'Ranking',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={30} name={focused ? "trophy.fill" : "trophy"} color={color} />,
                    tabBarActiveTintColor: theme.dark ? '#FFF37E' : '#ffa90a',
                    tabBarButton: (props) => <CustomTabButton {...props} routeName="ranking" />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={30} name={focused ? "person.fill" : "person"} color={color} />,
                    tabBarActiveTintColor: theme.dark ? '#FF7E7E' : '#dc4141',
                    tabBarButton: (props) => <CustomTabButton {...props} routeName="profile" />,
                }}
            />
            <Tabs.Screen
                name="themes"
                options={{
                    title: 'Themes',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={30} name={focused ? "paintbrush.fill" : "paintbrush"} color={color} />,
                    tabBarActiveTintColor: theme.dark ? '#6bddcd' : '#0aa3a5',
                    tabBarButton: (props) => <CustomTabButton {...props} routeName="themes" />,
                }}
            />
        </Tabs>
    );
}