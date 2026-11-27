import { getApiUrl } from '@/constants/urls';
import { supabase } from '@/api/SupabaseClient';

/**
 * Nine distinct puzzle IDs for the Rated Puzzles board, drawn across `themes` (the player's
 * unlocked themes). `excludedIds` is the previous board, so a new board never repeats it.
 */
export async function fetchRandomPuzzleSet(themes: readonly string[], excludedIds: readonly string[] = []): Promise<string[]> {
  if (themes.length === 0) throw new Error('No puzzle themes are unlocked yet.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to load puzzles.');
  const query = [
    ...themes.map(theme => `theme=${encodeURIComponent(theme)}`),
    ...excludedIds.map(id => `exclude=${encodeURIComponent(id)}`),
  ].join('&');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${getApiUrl()}/puzzles/random-set/?${query}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    });
    const puzzles = await response.json().catch(() => null);
    if (!response.ok) throw new Error(puzzles?.error || 'Could not load the puzzles. Please try again.');
    if (!Array.isArray(puzzles) || puzzles.length !== 9 || puzzles.some(puzzle =>
      typeof puzzle?.puzzleid !== 'string' || !puzzle.puzzleid || typeof puzzle.fen !== 'string' ||
      typeof puzzle.moves !== 'string' || typeof puzzle.themes !== 'string' ||
      !puzzle.themes.split(/\s+/).some((tag: string) => themes.includes(tag)) || excludedIds.includes(puzzle.puzzleid)
    ) || new Set(puzzles.map(puzzle => puzzle.puzzleid)).size !== 9) {
      throw new Error('The puzzle set was incomplete. Please try again.');
    }
    return puzzles.map(puzzle => puzzle.puzzleid);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Loading the puzzles timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
