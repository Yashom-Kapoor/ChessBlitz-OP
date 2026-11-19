import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Classroom, enrollInClassroom, getMyClassroom, unenrollFromClassroom } from '@/api/Classrooms';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from '@/context/GlobalStyle';

export default function ClassroomMembership({ isTablet, refreshKey }: { isTablet: boolean; refreshKey: number }) {
  const { authUserId } = useUser();
  const { theme } = useTheme();
  const textStyles = GlobalStyle(theme, isTablet);
  const [classroom, setClassroom] = useState<Classroom | null | undefined>(undefined);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const focused = useRef(false);
  const version = useRef(0);

  const load = useCallback(async () => {
    if (!authUserId || busyRef.current) return;
    const request = ++version.current;
    setLoading(true);
    setError('');
    try {
      const saved = await getMyClassroom(authUserId);
      if (request === version.current) setClassroom(saved);
    } catch (err) {
      if (request === version.current) {
        setClassroom(undefined);
        setError(err instanceof Error ? err.message : 'Could not load your classroom.');
      }
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [authUserId]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load();
    return () => { focused.current = false; version.current += 1; };
  }, [load, refreshKey]));

  const update = async (leave: boolean) => {
    if (!authUserId || busyRef.current || loading) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const request = ++version.current;
    try {
      const saved = await (leave ? unenrollFromClassroom(authUserId) : enrollInClassroom(authUserId, code));
      if (request === version.current) {
        setClassroom(saved);
        setCode('');
      }
    } catch (err) {
      if (request === version.current) setError(err instanceof Error ? err.message : 'Could not update your enrollment.');
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (focused.current && request !== version.current) void load();
    }
  };

  const confirmLeave = () => {
    if (!classroom || busyRef.current || loading) return;
    Alert.alert('Unenroll?', `Leave ${classroom.name}? You can rejoin with its classroom code.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unenroll', style: 'destructive', onPress: () => { void update(true); } },
    ]);
  };
  const disabled = busy || loading;
  const canEnroll = !disabled && /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());

  return (
    <View style={styles.container}>
      <Text style={[textStyles.h4, { color: theme.primaryText }]}>Enroll/Unenroll</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading classroom" color={theme.primaryText} /> :
        classroom === undefined ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading classroom" onPress={load}>
            <Text style={[textStyles.b, { color: theme.primaryText }]}>Try again</Text>
          </TouchableOpacity>
        ) : classroom ? (
          <>
            <Text style={[textStyles.h6, { color: theme.primaryText }]}>Your classroom</Text>
            <View style={styles.row}>
              <Text style={[textStyles.h5, styles.name, { color: theme.primaryText }]}>{classroom.name}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Unenroll from classroom"
                accessibilityState={{ disabled, busy }} disabled={disabled} onPress={confirmLeave}
                style={[styles.button, { opacity: disabled ? 0.5 : 1 }]}>
                <Text style={[textStyles.b, { color: theme.primaryText }]}>{busy ? 'Leaving…' : 'Unenroll'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={[textStyles.h6, { color: theme.primaryText }]}>Enter the classroom code from your teacher.</Text>
            <TextInput accessibilityLabel="Classroom join code" placeholder="Classroom code" value={code}
              onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={12}
              editable={!disabled} placeholderTextColor={`${theme.primaryText}80`}
              style={[textStyles.h5, styles.input, { color: theme.primaryText, borderColor: theme.buttonShadow }]}
              returnKeyType="done" onSubmitEditing={() => { if (canEnroll) void update(false); }} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enroll in classroom"
              accessibilityState={{ disabled: !canEnroll, busy }} disabled={!canEnroll}
              onPress={() => { void update(false); }}
              style={[styles.button, { backgroundColor: theme.primaryText, opacity: canEnroll ? 1 : 0.5 }]}>
              <Text style={[textStyles.b, { color: theme.primaryButton }]}>{busy ? 'Enrolling…' : 'Enroll'}</Text>
            </TouchableOpacity>
          </>
        )}
      {!!error && <Text accessibilityRole="alert" style={[textStyles.h6, { color: theme.primaryText }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
