import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams } from 'expo-router';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from '../GlassBlurView';
interface RankingProps {
    rank: number;
    name: string;
    rating: number;
    icon?: any;
    isYou:boolean;
}

const GetColorFromRanking = (ranking:number):string => { //Returns the crown color for the icon from the given ranking (1, 2, 3)
    if (ranking === 1) {
        return '#fcd217';
    }

    if (ranking === 2) {
        return '#b3b2b1';
    }

    return '#7e5a05';
}

export default function RankingItem({ rank, name, rating, icon, isYou}: RankingProps) {
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
        rightContainer: {
            alignItems: 'flex-end',
            justifyContent: 'center',
            marginLeft: 12,
        },
        rankColumn: {
            width: isTablet ? 60 : 44,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rankNumber: {
            fontSize: isTablet ? 34 : 26,
            fontWeight: 'bold',
            color: theme.primaryText,
            textAlign: 'center',
        },
        crownIcon: {
            position: 'absolute',
            // Sits just above the digit, centred in the rank column.
            top: isTablet ? -30 : -22,
            alignSelf: 'center',
            // crown.png is square with transparent padding, so keep the box square.
            width: isTablet ? 38 : 28,
            height: isTablet ? 38 : 28,
        },
    });
    return (
        <View style={rankingStyles.card}>
            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
            <View style={rankingStyles.rankColumn}>
                {rank <= 3 && (
                    <Image
                        source={require('@/assets/images/crown.png')}
                        resizeMode="contain"
                        style={[rankingStyles.crownIcon, { tintColor: GetColorFromRanking(rank) }]}
                    />
                )}
                <Text style={rankingStyles.rankNumber}>{rank}</Text>
            </View>

            {icon && <Image source={icon} style={rankingStyles.icon} />}
            <View style={rankingStyles.textContainer}>
                <Text style={[styles.h3, { color: isYou ? "#fd3254" : theme.primaryText}]}>{name + (isYou ? " (You)": "")}</Text>
            </View>

            <View style={rankingStyles.rightContainer}>
                <Text style={[styles.h4, { color: theme.primaryText }]}>{rating}</Text>
                <Text style={[styles.h6, { color: `${theme.primaryText}80` }]}>Rating</Text>
            </View>
        </View>
    );
}