import { API_URL } from "@/constants/urls";
import { supabase } from "@/api/SupabaseClient";

export async function fetchHint(puzzleId: string, moveNumber: number): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_URL}/puzzles/${puzzleId}/hints/${moveNumber}`, {
            headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (!response.ok) {
            // Handle HTTP errors
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // Parse the JSON response
        if (!data.hint) {
            throw new Error("No hint available."); // Handle missing hint field
        }

        return data.hint; // Return the hint from the response
    } catch (err) {
        // Handle errors and return a meaningful message
        throw new Error(err instanceof Error ? err.message : "An unknown error occurred while fetching the hint.");
    }
}