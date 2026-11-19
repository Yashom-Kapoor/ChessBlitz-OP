import { decode } from 'base64-arraybuffer';
import { supabase } from './SupabaseClient';

const BUCKET = 'avatars';
const MAX_BYTES = 2 * 1024 * 1024;

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getAvatarUrls(userIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const avatars: Record<string, string> = {};
  // Keep query URLs bounded as the leaderboard grows.
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await supabase.from('user_avatars')
      .select('user_id,storage_path').in('user_id', ids.slice(offset, offset + 100));
    if (error) throw error;
    for (const row of data ?? []) avatars[row.user_id] = publicUrl(row.storage_path);
  }
  return avatars;
}

export async function uploadAvatar(base64: string, expectedUserId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== expectedUserId) {
    throw new Error('Your session changed. Please sign in and try again.');
  }

  const bytes = decode(base64);
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
    throw new Error('Please choose a photo smaller than 2 MB.');
  }

  const { data: previous, error: readError } = await supabase.from('user_avatars')
    .select('storage_path').eq('user_id', expectedUserId).maybeSingle();
  if (readError) {
    throw new Error('Photo uploads are unavailable. Please contact your ChessBlitz administrator.');
  }

  // Immutable filenames let other devices load the new photo without a stale cache.
  const version = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const path = `${expectedUserId}/${version}.jpg`;
  const bucket = supabase.storage.from(BUCKET);
  const { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: 'image/jpeg', cacheControl: '31536000', upsert: false,
  });
  if (uploadError) throw new Error('Could not upload your photo. Please try again.');

  const { error: saveError } = await supabase.from('user_avatars').upsert({
    user_id: expectedUserId, storage_path: path,
  }, { onConflict: 'user_id' });
  if (saveError) {
    // A lost response may still mean the save committed, so retain the new object.
    throw new Error('Could not confirm your photo was saved. Refresh your profile and try again.');
  }

  if (previous?.storage_path && previous.storage_path !== path) {
    try {
      await bucket.remove([previous.storage_path]);
    } catch {
      // Cleanup failure must not invalidate a successfully saved photo.
    }
  }
  return publicUrl(path);
}
