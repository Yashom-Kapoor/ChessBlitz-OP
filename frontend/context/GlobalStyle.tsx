import { Platform, StyleSheet } from "react-native";
import { useTheme } from "./ThemeContext";
import { Themes, ArtThemes } from '@/constants/Themes';

export default function GlobalStyle(
    theme: (typeof Themes)[keyof typeof Themes] | (typeof ArtThemes)[keyof typeof ArtThemes],
    isTablet: boolean,
) {
    
    return StyleSheet.create({
        contentContainer: {
            flex: 1,
            paddingTop: Platform.select({ ios: 0, android: 0 }),
            backgroundColor: theme.background,
        },
        scrollContainer: {
            padding: isTablet ? 30 : 20,
            gap: isTablet ? 30 : 20,
            marginTop: 120,
            paddingBottom: 60,
            minHeight: '90%',
        },
        hStack: {
            width: '100%',
            flexDirection: 'row',
        },
        vStack: {
            height: '100%',
            flexDirection: 'column',
        },

        flexButton: {
            padding: isTablet ? 30 : 20,
            borderRadius: isTablet ? 30 : 20,
            width: '100%',
            height: isTablet ? 200 : 120,
        },
        flexBigButton: {
            padding: isTablet ? 40 : 30,
            borderRadius: isTablet ? 30 : 20,
            width: '100%',
            height: isTablet ? 350 : 250,
        },

        title: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 48 : 32,
            fontWeight: 900,
            lineHeight: isTablet ? 60 : 45,
            padding: 20,
            width: '100%',
        },
        subtitle: {
            fontFamily: 'Nunito',
            color: theme.primaryText,
            fontSize: isTablet ? 32 : 24,
            lineHeight: isTablet ? 38 : 32,
            fontWeight: 'bold',
        },
        h1: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 40 : 30,
            lineHeight: isTablet ? 45 : 35,
            fontWeight: 800,
        },
        h2: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 30 : 22,
            lineHeight: isTablet ? 38 : 30,
            fontWeight: 700,
        },
        h3: {
            fontFamily: 'NunitoSemiBoldItalic',
            fontSize: isTablet ? 24 : 18,
            lineHeight: isTablet ? 30 : 24,
        },
        h4: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 24 : 18,
            lineHeight: isTablet ? 30 : 24,
            fontWeight: 'bold',
        },
        h5: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 20 : 16,
            lineHeight: isTablet ? 26 : 22,
            fontWeight: 600,
        },
        h6: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 16 : 12,
            fontWeight: 500,
        },
        b: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 20 : 14,
            lineHeight: isTablet ? 26 : 20,
            fontWeight: 700,
        },
        p: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 20 : 14,
            lineHeight: isTablet ? 26 : 20,
        },
        link: {
            fontFamily: 'Nunito',
            fontSize: isTablet ? 20 : 16,
            textDecorationLine: 'underline',
        }
    });  
}