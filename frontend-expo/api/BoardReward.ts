import { getApiUrl } from '@/constants/urls';
import { supabase } from '@/api/SupabaseClient';

/** Blitz paid for finishing all nine puzzles on a Rated board. Must match BOARD_REWARD on the server. */
export const BOARD_REWARD = 1000;

/** Claims the reward for a finished Rated board and returns the player's new blitz total. */
export async function claimBoardReward(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to claim your blitz.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${getApiUrl()}/puzzles/board-reward`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'Could not claim your blitz. Please try again.');
    return result?.currency;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Claiming timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
