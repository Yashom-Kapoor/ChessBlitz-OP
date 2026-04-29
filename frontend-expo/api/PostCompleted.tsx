import { API_URL } from "@/constants/urls";
import { supabase } from "@/api/SupabaseClient";

export interface CompletedPuzzleData {
    studentid: string;
    puzzleid: string;
    completed: boolean;
    timeElapsed?: number; // seconds
    hintsUsed?: number;
    undosUsed?: number;
    redosUsed?: number;
}

export async function postCompletedPuzzle(data: CompletedPuzzleData): Promise<unknown> {
    try {
        const payload = {
            studentid: data.studentid,
            puzzleid: data.puzzleid,
            completed: data.completed,
            ...(data.timeElapsed !== undefined ? { timeElapsed: data.timeElapsed } : {}),
            ...(data.hintsUsed !== undefined ? { hintsUsed: data.hintsUsed } : {}),
            ...(data.undosUsed !== undefined ? { undosUsed: data.undosUsed } : {}),
            ...(data.redosUsed !== undefined ? { redosUsed: data.redosUsed } : {}),
        };

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_URL}/puzzles/completed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify(payload),
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