import GlassBlurView from "@/components/GlassBlurView";
import { Themes } from "@/constants/Themes";
import { API_URL } from "@/constants/urls";
import backgroundImages from "@/context/Backgrounds";
import GlobalStyle from "@/context/GlobalStyle";
import { DeviceType, getDeviceTypeAsync } from "expo-device";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function LogInScreen() {
    const router = useRouter(); // Access router object
    const theme = Themes.default;
    const [isTablet, setIsTablet] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getDeviceTypeAsync().then(deviceType => {
            setIsTablet(deviceType === DeviceType.TABLET);
        });
    }, []);

    const handleLogIn = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/sign_in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store user ID if needed (consider using AsyncStorage or secure storage)
                const userId = data.uid;
                Alert.alert('Success', 'Logged in successfully!');
                router.push(`/(tabs)/lessons?isTablet=${isTablet}`);
            } else {
                Alert.alert('Error', data.error || data.message || 'Login failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error. Please try again.');
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    const styles = GlobalStyle(theme, isTablet);
    const localStyles = StyleSheet.create({
        landingContainer: {
            gap: 20,
            flexDirection: 'column',
            marginBottom: 300,
            alignItems: 'center',
            justifyContent: 'center',
        },

        backgroundImg: {
            height: 1350 / (isTablet ? 1.7 : 3),
            width: 1139 / (isTablet ? 1.7 : 3),
            bottom: 0,
            left: 0,
            position: 'absolute',
            opacity: 0.3,
        },

        continueButton: {
            padding: 10,
            paddingHorizontal: 20,
            width: '100%',
            alignItems: 'flex-end',
        },
        button: {
            borderRadius: isTablet ? 30 : 20,
            width: '70%',
            alignItems: 'center',
            boxShadow: `0 7 0 ${theme.buttonShadow}`,
        },

        logInSplash: {
            textAlign: 'center',
            color: theme.primaryText,
        },
        buttonText: {
            fontSize: 20,
            fontWeight: 'bold',
            textAlign: 'center',
        },
        input: {
            width: '100%',
            padding: 20,
            paddingHorizontal: 25,
            lineHeight: 0,
        },
        submit: {
            width: '100%',
            padding: 20,
            paddingHorizontal: 25,
            lineHeight: 0,
            textAlign: 'center',
        }

    });

    return (
        <ImageBackground
            source={backgroundImages[theme.name] || null}
            style={styles.contentContainer}
        >
            <Image source={require('@/assets/images/backgrounds/icon-full.png')} style={localStyles.backgroundImg} />

            <SafeAreaProvider style={localStyles.landingContainer}>

                <Text style={[styles.title, { color: theme.primaryText, textAlign: 'center' }]}>
                    Log in to your{'\n'}ChessBlitz account
                </Text>

                <TouchableOpacity style={[localStyles.button]}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
                    <TextInput
                            placeholderTextColor={`${theme.primaryText}30`}
                            placeholder={'Email'}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                            style={{...styles.h4, ...localStyles.input, color: theme.primaryText }}
                    ></TextInput>
                </TouchableOpacity>

                <TouchableOpacity style={[localStyles.button]}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
                    <TextInput
                            placeholderTextColor={`${theme.primaryText}30`}
                            placeholder={'Password'}
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                            secureTextEntry
                            style={{...styles.h4, ...localStyles.input, color: theme.primaryText }}
                    ></TextInput>
                </TouchableOpacity>

                <TouchableOpacity style={{...localStyles.button, marginTop: 20, width: '60%'}} onPress={handleLogIn} disabled={loading}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                    <Text
                            style={{...styles.h4, ...localStyles.submit, color: theme.secondaryText }}
                    >
                        {loading ? 'Signing in...' : 'Log In'}
                    </Text>
                </TouchableOpacity>

            </SafeAreaProvider>

        </ImageBackground>
    );
}