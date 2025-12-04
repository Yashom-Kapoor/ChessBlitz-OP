import GlassBlurView from "@/components/GlassBlurView";
import { Themes } from "@/constants/Themes";
import { API_URL } from "@/constants/urls";
import backgroundImages from "@/context/Backgrounds";
import GlobalStyle from "@/context/GlobalStyle";
import { DeviceType, getDeviceTypeAsync } from "expo-device";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/api/SupabaseClient";

export default function SignUpScreen() {
    const router = useRouter(); // Access router object
    const theme = Themes.default;
    const [isTablet, setIsTablet] = useState(false);

    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getDeviceTypeAsync().then(deviceType => {
            setIsTablet(deviceType === DeviceType.TABLET);
        });
    }, []);

    const handleSignUp = async () => {
    if (!username || !firstName || !lastName || !email || !password || !passwordConfirm) {
        Alert.alert('Error', 'Fill out all required boxes!');
        return;
    }
    if (password !== passwordConfirm) {
        Alert.alert('Error', 'Passwords must match!');
        return;
    }

    setLoading(true);
    try {
        // 1️⃣ Sign up in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        });

        if (authError) {
        Alert.alert('Error', authError.message);
        setLoading(false);
        return;
        }

        if (!authData.user) {
            Alert.alert('Error', 'No user returned from Supabase. Try again.');
            setLoading(false);
            return;
        }

        const userId = authData.user.id;

        // 2️⃣ Insert row in Student-DB
        const { data: student, error: studentError } = await supabase
        .from("Student-DB")
        .insert([{
            uid: userId, // match auth user ID
            username: username.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`,
            email: email.trim(),
            ratings: 0,
            total_puzzles_completed: 0,
            classroom_code: null,
            daily_puzzle: false,
        }])
        .select()
        .single();

        if (studentError) {
        Alert.alert('Error', studentError.message);
        setLoading(false);
        return;
        }

        // 3️⃣ Optionally store locally (doesnt work on native)
        // localStorage.setItem("student", JSON.stringify(student));

        Alert.alert('Success', 'Signed up successfully!');
        router.push(`/(tabs)/lessons?isTablet=${isTablet}`);
    } catch (err: unknown) {
        if (err instanceof Error) {
            Alert.alert('Error', err.message);
        } else {
            Alert.alert('Error', 'Something went wrong.');
        }
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
                    Sign up to your{'\n'}ChessBlitz account
                </Text>

                <TouchableOpacity style={[localStyles.button]}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                    <TextInput
                            placeholderTextColor={`${theme.secondaryText}30`}
                            placeholder={'Username'}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                            style={{...styles.h4, ...localStyles.input, color: theme.secondaryText }}
                    ></TextInput>
                </TouchableOpacity>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '70%'}}>
                    <TouchableOpacity style={{...localStyles.button, width: '49%'}}>
                        <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                        <TextInput
                                placeholderTextColor={`${theme.secondaryText}30`}
                                placeholder={'First Name'}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize={'none'}
                                autoCorrect={false}
                                style={{...styles.h4, ...localStyles.input, color: theme.secondaryText }}
                        ></TextInput>
                    </TouchableOpacity>

                    <TouchableOpacity style={{...localStyles.button, width: '49%'}}>
                        <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                        <TextInput
                                placeholderTextColor={`${theme.secondaryText}30`}
                                placeholder={'Last Name'}
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize={'none'}
                                autoCorrect={false}
                                style={{...styles.h4, ...localStyles.input, color: theme.secondaryText }}
                        ></TextInput>
                    </TouchableOpacity>
                </View>

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

                <TouchableOpacity style={[localStyles.button]}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
                    <TextInput
                            placeholderTextColor={`${theme.primaryText}30`}
                            placeholder={'Confirm Password'}
                            value={passwordConfirm}
                            onChangeText={setPasswordConfirm}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                            secureTextEntry
                            style={{...styles.h4, ...localStyles.input, color: theme.primaryText }}
                    ></TextInput>
                </TouchableOpacity>

                <TouchableOpacity style={{...localStyles.button, marginTop: 20, width: '60%'}} onPress={handleSignUp} disabled={loading}>
                    <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                    <Text
                            style={{...styles.h4, ...localStyles.submit, color: theme.secondaryText }}
                    >
                        {loading ? 'Registering...' : 'Sign Up'}
                    </Text>
                </TouchableOpacity>

            </SafeAreaProvider>

        </ImageBackground>
    );
}