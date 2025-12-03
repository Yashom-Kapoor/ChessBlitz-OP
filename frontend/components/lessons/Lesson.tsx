import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from '../GlassBlurView';

interface LessonProps {
    name: string;
    description: string;
    id: number;
    icon?: any;
    offset: any;
    available: boolean;
    onPress?: () => void;
}

export default function Lesson({ name, description, id, icon, offset, available, onPress }: LessonProps) {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';
    const borderRadius = isTablet ? 30 : 20;

    const router = useRouter();

    const styles = GlobalStyle(theme, isTablet);
    const lessonStyles = StyleSheet.create({
        lesson: {
            position: 'absolute',
            width: isTablet ? 150 : 100,
            height: isTablet ? 150 : 100,
            justifyContent: 'center',
            alignContent: 'center',
            alignItems: 'center',
            transformOrigin: 'center',
            paddingBottom: 20,
            overflow: 'hidden',
            opacity: available ? 1 : 0.3,
        },
        card: {
            borderRadius: borderRadius,
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
            width: '65%',
            height: '65%',
            resizeMode: 'contain',
            tintColor: theme.buttonShadow,
            opacity: 0.3,
        },
    });

    return (
        <TouchableOpacity style={{...lessonStyles.lesson, left: '50%', top: 60,
                transform: `translate(${offset.x - (isTablet ? 75 : 50)}px, ${offset.y - (isTablet ? 75 : 50)}px)`}}
                onPress={onPress} >
            <GlassBlurView borderRadius={1000} theme={theme} isTablet={isTablet} color={theme.dark ? theme.player1Square : theme.player2Square} glass={'clear'} outset />
            {icon && <Image source={icon} style={lessonStyles.icon} />}
            <Text style={{...styles.title, position: 'absolute', textAlign: 'center', color: theme.secondaryText}}>{id}</Text>
        </TouchableOpacity>
    );

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