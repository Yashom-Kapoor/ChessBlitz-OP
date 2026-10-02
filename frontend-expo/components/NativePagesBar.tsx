import { useTheme } from "@/context/ThemeContext";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";
const { Platform } = require('react-native');

export default function NativePagesBar({}) {
    const isIOS = Platform.OS === 'ios';
    const { theme } = useTheme();

    return (
        <NativeTabs
            labelStyle={{
                fontFamily: "Nunito",
                fontSize: 10,
            }}
            backgroundColor={theme.background}
        >
            <NativeTabs.Trigger name="puzzles">
                <NativeTabs.Trigger.Label>Puzzles</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'puzzlepiece.extension', selected: 'puzzlepiece.extension.fill' }}
                    drawable={'ic_menu_agenda'}
                    selectedColor={isIOS ? DynamicColorIOS({ dark: '#93FF8F', light: '#29be31' }) : (theme.dark ? '#93FF8F' : '#29be31')} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="lessons">
                <NativeTabs.Trigger.Label>Lessons</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }}
                    selectedColor={isIOS ? DynamicColorIOS({ dark: '#94CFFF', light: '#2e75c6' }) : (theme.dark ? '#94CFFF' : '#2e75c6')} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="ranking">
                <NativeTabs.Trigger.Label>Ranking</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }}
                    selectedColor={isIOS ? DynamicColorIOS({ dark: '#FFF37E', light: '#ffa90a' }) : (theme.dark ? '#FFF37E' : '#ffa90a')} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="shop">
                <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }}
                    selectedColor={isIOS ? DynamicColorIOS({ dark: '#6bddcd', light: '#0aa3a5' }) : (theme.dark ? '#6bddcd' : '#0aa3a5')} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="profile">
                <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }}
                    selectedColor={isIOS ? DynamicColorIOS({ dark: '#FF7E7E', light: '#dc4141' }) : (theme.dark ? '#FF7E7E' : '#dc4141')} />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}