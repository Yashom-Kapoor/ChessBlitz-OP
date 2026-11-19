import { getApiUrl } from "@/constants/urls";
import { supabase } from "@/api/SupabaseClient";

export async function fetchRandomPuzzle(themes?: string | readonly string[]): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to load a puzzle.');
  const filters = typeof themes === 'string' ? [themes] : themes ?? [];
  const query = filters.map(theme => `theme=${encodeURIComponent(theme)}`).join('&');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${getApiUrl()}/puzzles/random/${query ? `?${query}` : ''}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Could not load a puzzle. Please try again.');
    }
    if (typeof data?.puzzleid !== 'string' || typeof data?.fen !== 'string' || typeof data?.moves !== 'string') {
      throw new Error('The puzzle response was incomplete. Please try again.');
    }
    return data;
  } catch (err) {
    if (controller.signal.aborted) throw new Error('Loading the puzzle timed out. Please try again.');
    throw new Error(err instanceof Error ? err.message : 'An unknown error occurred');
  } finally {
    clearTimeout(timeout);
  }
}

// {FEN, ID, Moves, Rating}
