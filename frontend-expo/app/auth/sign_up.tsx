import { AuthButton, AuthCard, AuthField, AuthTitle } from "@/components/AuthForm";
import { Themes } from "@/constants/Themes";
import backgroundImages from "@/context/Backgrounds";
import GlobalStyle from "@/context/GlobalStyle";
import { DeviceType, getDeviceTypeAsync } from "expo-device";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ImageBackground, StyleSheet, View } from "react-native";
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
        // Sign up in Supabase Auth
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

        // Insert row in Users
        const { data: student, error: studentError } = await supabase
        .from("Users")
        .insert([{
            user_id: userId, // match auth user ID
            username: username.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`,
            email: email.trim(),
            rating: 0,
            role: "student"
        }])
        .select()
        .single();

        if (studentError) {
        Alert.alert('Error', studentError.message);
        setLoading(false);
        return;
        }

        // Insert row in Shop. Without this the account has no currency record, so /shop/me
        // 404s and the shop tab cannot read a balance or unlock anything.
        const { error: shopError } = await supabase
        .from("Shop")
        .insert([{
            student_id: userId,
            currency: 0
        }]);

        // Non-blocking: the auth user and Users row already exist, so refusing to finish
        // sign-up over a secondary row would be worse than continuing without it. If this
        // fails it is almost always a missing INSERT policy on Shop.
        if (shopError) {
        console.error('[sign up] could not create Shop row:', shopError.message);
        Alert.alert(
            'Account created',
            `Your account is ready, but the shop could not be set up (${shopError.message}). Currency and unlocks will not work until that is fixed.`
        );
        } else {
        Alert.alert('Success', 'Signed up successfully!');
        }

        router.push(`/(tabs)/puzzles?isTablet=${isTablet}`);
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
            marginBottom: 100,
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
    });

    return (
        <ImageBackground
            source={backgroundImages[theme.name] || null}
            style={styles.contentContainer}
        >
            <Image source={require('@/assets/images/backgrounds/icon-full.png')} style={localStyles.backgroundImg} />

            <SafeAreaProvider style={localStyles.landingContainer}>

                <AuthCard isTablet={isTablet}>
                    <AuthTitle isTablet={isTablet} subtitle="sign up to join" />
                    <AuthField isTablet={isTablet} required label="Username" placeholder="username" value={username} onChangeText={setUsername} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <AuthField isTablet={isTablet} required label="First Name" placeholder="first name" value={firstName} onChangeText={setFirstName} style={{ flex: 1 }} />
                        <AuthField isTablet={isTablet} required label="Last Name" placeholder="last name" value={lastName} onChangeText={setLastName} style={{ flex: 1 }} />
                    </View>
                    <AuthField isTablet={isTablet} required label="Email" placeholder="username@email.com" value={email} onChangeText={setEmail} />
                    <AuthField isTablet={isTablet} required label="Password" placeholder="password" value={password} onChangeText={setPassword} secureTextEntry />
                    <AuthField isTablet={isTablet} required label="Confirm Password" placeholder="password" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
                    <AuthButton isTablet={isTablet} title={loading ? 'Registering...' : 'Sign up'} onPress={handleSignUp} disabled={loading} />
                </AuthCard>

            </SafeAreaProvider>

        </ImageBackground>
    );
}