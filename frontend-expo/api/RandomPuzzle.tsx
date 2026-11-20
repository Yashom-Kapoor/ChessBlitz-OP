import { getApiUrl } from "@/constants/urls";
import { supabase } from "@/api/SupabaseClient";

export async function fetchRandomPuzzle(theme?: string): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const query = theme ? `?theme=${encodeURIComponent(theme)}` : '';
    const response = await fetch(`${getApiUrl()}/puzzles/random/${query}`, {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'An unknown error occurred');
  }
}

// {FEN, ID, Moves, Rating}
