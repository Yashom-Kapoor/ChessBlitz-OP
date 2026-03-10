import { useTheme } from "@/context/ThemeContext";
import GlassBlurView from "../GlassBlurView";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import GlobalStyle from "@/context/GlobalStyle";

interface LessonBubbleProps {
    id: number;
    name: string;
    description: string;
    offset: any;
    available: boolean;
}

export default function LessonBubble({ id, name, description, offset, available }: LessonBubbleProps) {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';
    const router = useRouter();

    const onPress = () => {
        router.push(`/lessons/${id}?isTablet=${isTablet}`)
    }

    const styles = GlobalStyle(theme, isTablet);
    const localStyles = StyleSheet.create({
        bubble: {
            flexDirection: 'row', 
            position: 'absolute',
            padding: isTablet ? 20 : 15,
            left: '50%', 
            top: 200, 
            width: isTablet ? 500 : 350,
            maxHeight: isTablet? 230 : 200,
            minHeight: isTablet ? 170 : 135,
            zIndex: 100,
            gap: isTablet ? 10 : 5,
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 10,
        },
        button: {
            flex: 1,
            backgroundColor: theme.secondaryButton,
            borderRadius: isTablet ? 30 : 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        play: {
            width: '75%',
            height: '75%',
            tintColor: theme.secondaryText,
            opacity: 0.5,
        },
    })

    return (
        <View style={{...localStyles.bubble, transform: `translate(${offset.x - (isTablet ? 250 : 150)}px, ${offset.y - (isTablet ? 100 : 75)}px)`}}>
            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
            <View style={{flex: 2, paddingHorizontal: 10}}>
                <Text style={[styles.h2, { color: theme.primaryText, paddingBottom: 5, }]}>{name}</Text>
                <Text style={[styles.h5, { color: theme.primaryText }]}>{description}</Text>
            </View>
            <TouchableOpacity style={{...localStyles.button, opacity: available ? 1 : 0.3}} onPress={available ? onPress : (() => {})}>
                {available ? (
                    <Image resizeMode='contain' style={{...localStyles.play}} source={require('@/assets/images/play.png')}/>
                ) : (
                    <Image resizeMode='contain' style={{...localStyles.play}} source={require('@/assets/images/lock.png')}/>
                )}
            </TouchableOpacity>
        </View>
    )
}