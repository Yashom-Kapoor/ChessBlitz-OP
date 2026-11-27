import { AuthButton, AuthCard, AuthField, AuthTitle } from "@/components/AuthForm";
import { Themes } from "@/constants/Themes";
import backgroundImages from "@/context/Backgrounds";
import GlobalStyle from "@/context/GlobalStyle";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, ImageBackground, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/api/SupabaseClient";
import { useIsTablet } from '@/hooks/useIsTablet';

export default function LogInScreen() {
  const router = useRouter();
  const theme = Themes.default;
  const isTablet = useIsTablet();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        Alert.alert('Error', 'Failed to log in');
        setLoading(false);
        return;
      }
      const userId = data.user.id;

      // fetch student profile from Users
      const { data: student, error: studentError } = await supabase
        .from("Users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (studentError) {
        Alert.alert('Warning', 'Logged in but failed to fetch student profile');
      } else {
        // Optionally store locally (doesn't work on react native)
        // localStorage.setItem("student", JSON.stringify(student));
      }

      Alert.alert('Success', 'Logged in successfully!');
      router.push('/(tabs)/puzzles');
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
    landingContainer: { gap: 20, flexDirection: 'column', marginBottom: 300, alignItems: 'center', justifyContent: 'center' },
    backgroundImg: { height: 1350 / (isTablet ? 1.7 : 3), width: 1139 / (isTablet ? 1.7 : 3), bottom: 0, left: 0, position: 'absolute', opacity: 0.3 },
  });

    return (
        <ImageBackground
            source={backgroundImages[theme.name] || null}
            style={styles.contentContainer}
        >
            <Image source={require('@/assets/images/backgrounds/icon-full.png')} style={localStyles.backgroundImg} />

            <SafeAreaProvider style={localStyles.landingContainer}>

                <AuthCard isTablet={isTablet}>
                    <AuthTitle isTablet={isTablet} />
                    <AuthField isTablet={isTablet} label="Email" placeholder="email address" value={email} onChangeText={setEmail} />
                    <AuthField isTablet={isTablet} label="Password" placeholder="password" value={password} onChangeText={setPassword} secureTextEntry />
                    <AuthButton isTablet={isTablet} title={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogIn} disabled={loading} />
                    <TouchableOpacity onPress={() => router.push('/auth/sign_up')} style={{ alignSelf: 'center' }}>
                        <Text style={[styles.h5, { color: theme.primaryText, fontWeight: 'bold', textDecorationLine: 'underline' }]}>Sign up</Text>
                    </TouchableOpacity>
                </AuthCard>

            </SafeAreaProvider>

        </ImageBackground>
    );
}
