import { fetchHint } from '@/api/GetHint';

import hints00AhO from '@/data/hints/00AhO.json';
import hints00Kia from '@/data/hints/00Kia.json';
import hints01F1N from '@/data/hints/01F1N.json';
import hints04E5q from '@/data/hints/04E5q.json';
import hints0cUVg from '@/data/hints/0cUVg.json';

/**
 * The one place the app gets hint tiers from (Ticket 6).
 *
 * Right now the five hints-subteam puzzles read placeholder tiers from `data/hints/<id>.json`.
 * When the real hints endpoint exists, change `loadLocal` below to a fetch and nothing else in the
 * app has to change.
 */

export type HintFile = {
    puzzle_id: string;
    placeholder?: boolean;
    moves: { move_index: number; move_san?: string; tiers: { tier: number; text: string }[] }[];
};

const LOCAL_HINTS: Record<string, HintFile> = {
    '00AhO': hints00AhO,
    '00Kia': hints00Kia,
    '01F1N': hints01F1N,
    '04E5q': hints04E5q,
    '0cUVg': hints0cUVg,
};

/** Puzzle ids whose hints come from the tiered files (and never from the old LLM call). */
export const TIERED_HINT_PUZZLES = Object.keys(LOCAL_HINTS);

export function hasTieredHints(puzzleId: string): boolean {
    return Object.prototype.hasOwnProperty.call(LOCAL_HINTS, puzzleId);
}

function loadLocal(file: HintFile, moveIndex: number): string[] {
    const move = file.moves.find((m) => m.move_index === moveIndex);
    if (!move) {
        return [];
    }
    return [...move.tiers].sort((a, b) => a.tier - b.tier).map((t) => t.text);
}

/**
 * Hint tiers for one player move, most general first. Any number of tiers is allowed, including
 * none.
 *
 * @param puzzleId  Lichess puzzle id, e.g. "00AhO".
 * @param moveIndex Which player move, starting at 1 (matches `move_index` in the facts records).
 */
export async function getHintTiers(puzzleId: string, moveIndex: number): Promise<string[]> {
    const local = LOCAL_HINTS[puzzleId];
    if (local) {
        return loadLocal(local, moveIndex);
    }

    // Every other puzzle keeps its old single hint, shown as one tier. The ply number is
    // 2 * moveIndex because the opponent's setup move comes first.
    const hint = await fetchHint(puzzleId, 2 * moveIndex);
    return [hint];
}
