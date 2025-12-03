import { API_URL } from "@/constants/urls";

export interface CompletedPuzzleData {
    userId: string;
    puzzleId: string;
    timeElapsed: number; // seconds
    hintsUsed: number;
    undosUsed: number;
    redosUsed: number;
    completed: boolean;
}

export async function postCompletedPuzzle(data: CompletedPuzzleData): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/puzzles/completed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to post completed puzzle');
        }

        return result;
    } catch (error) {
        console.error('Error posting completed puzzle:', error);
        throw error;
    }
}