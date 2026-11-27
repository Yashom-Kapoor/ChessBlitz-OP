import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Themes } from '@/constants/Themes';
import GlobalStyle from '@/context/GlobalStyle';

// Shared pieces for the landing, log in and sign up screens, styled after the auth mockup.
const theme = Themes.default;
const YELLOW = '#FCEC7A';
const LIME = '#DDFB7A';

export function AuthCard({ isTablet, children }: { isTablet: boolean; children: ReactNode }) {
    return (
        <View style={{
            width: isTablet ? '60%' : '90%',
            padding: isTablet ? 30 : 20,
            gap: isTablet ? 18 : 14,
            borderRadius: isTablet ? 30 : 20,
            backgroundColor: '#2E3040CC',
            borderWidth: 1,
            borderColor: '#FFFFFF22',
        }}>
            {children}
        </View>
    );
}

export function AuthTitle({ isTablet, subtitle }: { isTablet: boolean; subtitle?: string }) {
    const styles = GlobalStyle(theme, isTablet);
    return (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
            {subtitle && <Text style={[styles.h4, { color: theme.primaryText }]}>{subtitle}</Text>}
            <Text style={[styles.title, { color: YELLOW, textAlign: 'center', padding: 0 }]}>ChessBlitz</Text>
        </View>
    );
}

export function AuthField({ isTablet, label, required, style, ...inputProps }: TextInputProps & { isTablet: boolean; label: string; required?: boolean }) {
    const styles = GlobalStyle(theme, isTablet);
    return (
        <View style={[{ gap: 6 }, style as ViewStyle]}>
            <Text style={[styles.h5, { color: theme.primaryText, fontWeight: 'bold' }]}>
                {required && <Text style={{ color: '#FF5C5C' }}>*</Text>}{label}
            </Text>
            <TextInput
                placeholderTextColor="#E4E4EA"
                autoCapitalize="none"
                autoCorrect={false}
                {...inputProps}
                style={[styles.h5, {
                    backgroundColor: '#A3A5B0',
                    color: theme.secondaryText,
                    borderRadius: isTablet ? 20 : 16,
                    paddingVertical: isTablet ? 14 : 10,
                    paddingHorizontal: 20,
                    lineHeight: undefined,
                }]}
            />
        </View>
    );
}

export function AuthButton({ isTablet, title, onPress, disabled }: { isTablet: boolean; title: string; onPress?: () => void; disabled?: boolean }) {
    const styles = GlobalStyle(theme, isTablet);
    return (
        <TouchableOpacity onPress={onPress} disabled={disabled} style={{ alignSelf: 'center', width: '55%', marginTop: 10 }}>
            <LinearGradient
                colors={[YELLOW, LIME]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 999, paddingVertical: isTablet ? 16 : 12, alignItems: 'center', opacity: disabled ? 0.6 : 1 }}
            >
                <Text style={[styles.h4, { color: theme.secondaryText }]}>{title}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}
