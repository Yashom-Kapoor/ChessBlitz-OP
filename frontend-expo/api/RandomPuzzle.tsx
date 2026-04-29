import { API_URL } from "@/constants/urls";
import { supabase } from "@/api/SupabaseClient";

export async function fetchRandomPuzzle(): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/puzzles/random/`, {
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