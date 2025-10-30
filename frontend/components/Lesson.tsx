import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from './GlassBlurView';
interface LessonProps {
    name: string;
    description: string;
    icon?: any;
    onPress?: () => void;
}
export default function Lesson({ name, description, icon }: LessonProps) {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';

    const router = useRouter();
    const onPress = () => {
        router.push(`/lessons/demo_lesson?isTablet=${isTablet}`)
    }

    const styles = GlobalStyle(theme, isTablet);
    const lessonStyles = StyleSheet.create({
        card: {
            borderRadius: isTablet ? 30 : 20,
            padding: 20,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        textContainer: {
            flex: 1,
            flexDirection: 'column',
            gap: 4,
        },
        icon: {
            width: 50,
            height: 50,
            resizeMode: 'contain',
            borderRadius: '20%',
        },
    });
    return (
        <TouchableOpacity style={lessonStyles.card} onPress={onPress}>
            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
            {icon && <Image source={icon} style={lessonStyles.icon} />}
            <View style={lessonStyles.textContainer}>
                <Text style={[styles.h3, { color: theme.primaryText }]}>{name}</Text>
                <Text style={[styles.h5, { color: theme.primaryText }]}>{description}</Text>
            </View>
        </TouchableOpacity>
    );
}