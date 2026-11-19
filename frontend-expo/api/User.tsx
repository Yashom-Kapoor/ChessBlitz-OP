import { supabase } from "./SupabaseClient";
import { getApiUrl } from "@/constants/urls";
import { getAvatarUrls } from './Avatars';

export async function getCurrentUser() {
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) throw new Error("No session");

  const res = await fetch(`${getApiUrl()}/users/me`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const user = await res.json();
  let avatarUrl: string | null | undefined;
  try {
    const avatars = await getAvatarUrls([session.user.id]);
    avatarUrl = avatars[session.user.id] ?? null;
  } catch {
    // Preserve the rest of the profile when photo storage cannot be reached.
    console.warn('Profile photos are temporarily unavailable.');
  }
  return { ...user, user_id: session.user.id, avatar_url: avatarUrl };
}
