import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGlobalSearchParams } from 'expo-router';
import GlobalStyle from '@/context/GlobalStyle';
import GlassBlurView from '../GlassBlurView';
interface RankingProps {
    rank: number;
    name: string;
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

export default function RankingItem({ rank, name, icon, isYou}: RankingProps) {
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
        },
        crownIcon: {
            width: isTablet ? 46 : 30,
            height: 40,
            marginLeft: isTablet ? -11 : -4,
            marginBottom:isTablet ? -42 : -28,
            backgroundRepeat: 'no-repeat',
            resizeMode:'contain'
        }
    });
    return (
        <View style={rankingStyles.card}>
            <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
            {/* <Text style={rankingStyles.rankNumber}>{rank}</Text> */}
            {
                rank === 1 || rank === 2 || rank === 3 ? (
                    <View>
                        <ImageBackground
                            source={require('@/assets/images/crown.png')}
                            style={rankingStyles.crownIcon}
                            tintColor={GetColorFromRanking(rank)}>
                        </ImageBackground>
                        <Text style={rankingStyles.rankNumber}>{rank}</Text>
                    </View>
                    
                    ) : 
                (
                <Text style={rankingStyles.rankNumber}>{rank}</Text>
                )
            }

            {icon && <Image source={icon} style={rankingStyles.icon} />}
            <View style={rankingStyles.textContainer}>
                <Text style={[styles.h3, { color: isYou ? "#fd3254" : theme.primaryText}]}>{name + (isYou ? " (You)": "")}</Text>
            </View>
        </View>
    );
}