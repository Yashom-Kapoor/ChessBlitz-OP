import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams } from 'expo-router';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from '../GlassBlurView';
interface RankingProps {
    rank: number;
    name: string;
    icon?: any;
}
export default function RankingItem({ rank, name, icon }: RankingProps) {
    const { theme } = useTheme();
    const isTablet = useGlobalSearchParams().isTablet === 'true';
    const styles = GlobalStyle(theme, isTablet);
    const rankingStyles = StyleSheet.create({
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
        icon: {
            width: 50,
            height: 50,
            resizeMode: 'contain',
            borderRadius: '20%',
        },
        textContainer: {
            flex: 1,
            flexDirection: 'column',
            gap: 4,
        },
        rankNumber: {
            fontSize: isTablet ? 34 : 26,
            fontWeight: 'bold',
            color: theme.primaryText,
            marginRight: 12,
        }
    });
    return (
        <View style={rankingStyles.card}>
            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
            <Text style={rankingStyles.rankNumber}>{rank}</Text>
            {icon && <Image source={icon} style={rankingStyles.icon} />}
            <View style={rankingStyles.textContainer}>
                <Text style={[styles.h3, { color: theme.primaryText }]}>{name}</Text>
            </View>
        </View>
    );
}