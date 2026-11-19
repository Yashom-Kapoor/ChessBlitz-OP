import { supabase } from './SupabaseClient';
import { getApiUrl } from '@/constants/urls';

export function validateLeaderboardName(value: string): string | null {
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(value)) {
    return 'Use a single line without control characters.';
  }
  const name = value.trim();
  if (Array.from(name).length < 3 || Array.from(name).length > 24) {
    return 'Use 3–24 characters for your leaderboard nickname.';
  }
  if (name.toLowerCase() === 'unknown student') return 'Please choose a different leaderboard nickname.';
  return null;
}

export async function updateLeaderboardName(userId: string, nickname: string | null): Promise<string | null> {
  if (nickname !== null) {
    const error = validateLeaderboardName(nickname);
    if (error) throw new Error(error);
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== userId) {
    throw new Error('Your session changed. Please sign in and try again.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${getApiUrl()}/users/me/leaderboard-name`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaderboard_name: nickname === null ? null : nickname.trim() }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'Could not save your leaderboard nickname. Please try again.');
    if (data?.leaderboard_name !== null && typeof data?.leaderboard_name !== 'string') {
      throw new Error('Could not confirm your leaderboard nickname. Please try again.');
    }
    return data.leaderboard_name;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The request timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
