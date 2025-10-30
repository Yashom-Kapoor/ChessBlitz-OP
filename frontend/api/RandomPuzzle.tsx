import { API_URL } from "@/constants/urls";

export async function fetchRandomPuzzle(): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/puzzles/random/`);
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