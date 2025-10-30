import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";

export default function NativePagesBar({}) {
    return (
        <NativeTabs
            labelStyle={{
                fontFamily: "Nunito",
                fontSize: 10,
            }}
        >
            <NativeTabs.Trigger name="puzzles">
                <Label>Puzzles</Label>
                <Icon sf={{ default: 'puzzlepiece.extension', selected: 'puzzlepiece.extension.fill' }}
                    selectedColor={DynamicColorIOS({ dark: '#93FF8F', light: '#29be31' })} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="lessons">
                <Label>Lessons</Label>
                <Icon sf={{ default: 'book', selected: 'book.fill' }}
                    selectedColor={DynamicColorIOS({ dark: '#94CFFF', light: '#2e75c6' })} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="ranking">
                <Label>Ranking</Label>
                <Icon sf={{ default: 'trophy', selected: 'trophy.fill' }}
                    selectedColor={DynamicColorIOS({ dark: '#FFF37E', light: '#ffa90a' })} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="profile">
                <Label>Profile</Label>
                <Icon sf={{ default: 'person', selected: 'person.fill' }}
                    selectedColor={DynamicColorIOS({ dark: '#FF7E7E', light: '#dc4141' })} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="themes">
                <Label>Themes</Label>
                <Icon sf={{ default: 'paintbrush', selected: 'paintbrush.fill' }}
                    selectedColor={DynamicColorIOS({ dark: '#6bddcd', light: '#0aa3a5' })} />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}