import { getApiUrl } from '@/constants/urls';
import { supabase } from './SupabaseClient';
import { getAvatarUrls } from './Avatars';

type RankingRow = {
  student_id?: string | null;
  name?: string | null;
  overall?: number | null;
  rating?: number | null;
};

export async function getRankings() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const response = await fetch(`${getApiUrl()}/leaderboards/35/elo`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch rankings');
  const data: RankingRow[] = await response.json();
  const rows = data.filter(({ name, overall, rating }) => {
    const normalizedName = name?.trim().toLowerCase();
    return Boolean(normalizedName && normalizedName !== 'unknown student')
      && Number.isFinite(overall ?? rating);
  }).reverse();

  let avatars: Record<string, string> = {};
  let photosUnavailable = false;
  try {
    avatars = await getAvatarUrls(rows.map(row => row.student_id ?? ''));
  } catch {
    photosUnavailable = true;
  }
  return {
    photosUnavailable,
    rankings: rows.map((row, index) => ({
      userId: row.student_id ?? null, rank: index + 1, name: row.name!.trim(),
      rating: (row.overall ?? row.rating)!,
      avatarUrl: avatars[row.student_id ?? ''] ?? null,
      isYou: row.student_id === session.user.id,
    })),
  };
}
