import { TAB_INFO, TAB_ROUTES, tabColor } from "@/constants/tabs";
import { useTheme } from "@/context/ThemeContext";
import { NativeTabs } from "expo-router/native-tabs";

// Icons only: each label is hidden but still read out as the tab's accessibility label.
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
            {TAB_ROUTES.map((name) => (
                <NativeTabs.Trigger key={name} name={name}>
                    <NativeTabs.Trigger.Label hidden>{TAB_INFO[name].title}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon sf={{ default: TAB_INFO[name].icon, selected: TAB_INFO[name].selectedIcon }}
                        drawable={name === 'puzzles' ? 'ic_menu_agenda' : undefined}
                        selectedColor={tabColor(name, theme.dark)} />
                </NativeTabs.Trigger>
            ))}
        </NativeTabs>
    );
}
