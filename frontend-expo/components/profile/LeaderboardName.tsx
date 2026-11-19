import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Avatar from '@/components/Avatar';
import { validateLeaderboardName } from '@/api/LeaderboardName';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from '@/context/GlobalStyle';

export default function LeaderboardName({ isTablet }: { isTablet: boolean }) {
  const { authUserId, userData, saveLeaderboardName } = useUser();
  const { theme } = useTheme();
  const textStyles = GlobalStyle(theme, isTablet);
  const saved = userData.leaderboardName ?? null;
  const [draft, setDraft] = useState(saved ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { setDraft(saved ?? ''); }, [saved]);

  const ready = !!authUserId && userData.userId === authUserId;
  const canSave = ready && !busy && draft.trim() !== (saved ?? '');
  const previewName = draft.trim() || userData.name;

  const save = async (nickname: string | null) => {
    if (!ready || busyRef.current) return;
    const error = nickname === null ? null : validateLeaderboardName(nickname);
    if (error) { setMessage(error); return; }
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    try {
      await saveLeaderboardName(nickname, authUserId);
      if (mounted.current) {
        setDraft(nickname?.trim() ?? '');
        setMessage(nickname === null ? 'Your leaderboard now uses your account name.' : 'Leaderboard nickname saved.');
      }
    } catch (err) {
      if (mounted.current) setMessage(err instanceof Error ? err.message : 'Could not save your nickname. Please try again.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[textStyles.h4, { color: theme.primaryText }]}>Leaderboard nickname (optional)</Text>
      <Text style={[textStyles.h6, { color: theme.primaryText }]}>
        Shown beside your photo on rankings. Your account name stays the same.
      </Text>
      <TextInput accessibilityLabel="Leaderboard nickname" value={draft}
        placeholder={ready ? userData.name : 'Loading profile…'}
        placeholderTextColor={`${theme.primaryText}80`} editable={ready && !busy}
        onChangeText={value => { setDraft(value); setMessage(''); }}
        autoCorrect={false} autoCapitalize="none" returnKeyType="done"
        onSubmitEditing={() => { if (canSave) void save(draft); }}
        style={[textStyles.h5, styles.input, { color: theme.primaryText, borderColor: theme.buttonShadow }]} />
      <Text style={[textStyles.h6, { color: theme.primaryText }]}>3–24 characters. Spaces are welcome.</Text>
      {ready && <View style={styles.preview} accessibilityLabel={`Leaderboard preview: ${previewName}`}>
        <Avatar uri={userData.avatarUrl} name={previewName} size={40} />
        <Text numberOfLines={1} style={[textStyles.h5, styles.previewName, { color: theme.primaryText }]}>{previewName}</Text>
      </View>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save leaderboard nickname"
        accessibilityState={{ disabled: !canSave, busy }} disabled={!canSave}
        onPress={() => { void save(draft); }}
        style={[styles.button, { backgroundColor: theme.primaryText, opacity: canSave ? 1 : 0.5 }]}>
        {busy ? <ActivityIndicator accessibilityLabel="Saving leaderboard nickname" color={theme.primaryButton} /> :
          <Text style={[textStyles.b, { color: theme.primaryButton }]}>Save nickname</Text>}
      </TouchableOpacity>
      {saved !== null && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Use account name"
        accessibilityState={{ disabled: !ready || busy }} disabled={!ready || busy}
        onPress={() => { void save(null); }} style={[styles.button, { opacity: busy ? 0.5 : 1 }]}>
        <Text style={[textStyles.b, { color: theme.primaryText }]}>Use account name</Text>
      </TouchableOpacity>}
      {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
        style={[textStyles.h6, { color: theme.primaryText }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewName: { flex: 1 },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
