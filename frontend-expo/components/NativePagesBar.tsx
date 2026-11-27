import { useTheme } from "@/context/ThemeContext";
import { NativeTabs } from "expo-router/native-tabs";

// Icons only: each label is hidden but still read out as the tab's accessibility label.
// Order must match TAB_ROUTES in constants/tabs.ts.
export default function NativePagesBar({}) {
    const { theme } = useTheme();

    return (
        <NativeTabs
            labelStyle={{
                fontFamily: "Nunito",
                fontSize: 10,
            }}
            backgroundColor={theme.background}
        >
            <NativeTabs.Trigger name="lessons">
                <NativeTabs.Trigger.Label hidden>Lessons</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }}
                    selectedColor={theme.dark ? '#94CFFF' : '#2e75c6'} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="puzzles">
                <NativeTabs.Trigger.Label hidden>Puzzles</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'puzzlepiece.extension', selected: 'puzzlepiece.extension.fill' }}
                    drawable={'ic_menu_agenda'}
                    selectedColor={theme.dark ? '#93FF8F' : '#29be31'} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="home">
                <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }}
                    selectedColor={theme.dark ? '#C9A7FF' : '#8a4fd8'} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="classroom">
                <NativeTabs.Trigger.Label hidden>Classroom</NativeTabs.Trigger.Label>
                {/* Classroom keeps the trophy icon for now. */}
                <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }}
                    selectedColor={theme.dark ? '#FFF37E' : '#ffa90a'} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="shop">
                <NativeTabs.Trigger.Label hidden>Shop</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }}
                    selectedColor={theme.dark ? '#6bddcd' : '#0aa3a5'} />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
