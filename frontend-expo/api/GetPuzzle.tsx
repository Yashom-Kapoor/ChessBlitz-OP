import { API_URL } from "@/constants/urls";
import { fetchWithAuth } from "./fetchWithAuth";

export async function fetchPuzzle(puzzleId: string): Promise<any> {
  try {
    const response = await fetchWithAuth(`${API_URL}/puzzles/${puzzleId}/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Return the JSON object for the puzzle
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'An unknown error occurred');
  }
}

// {FEN, ID, Moves, Rating}