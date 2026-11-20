/**
 * Tiered-hint state for one player move (Ticket 6).
 *
 * Each tap of Hint reveals the next tier. Earlier tiers stay visible. After the last tier there
 * are no more. When the player makes a correct move, the state starts over for the next move.
 *
 * Kept free of React so it can be unit tested. The screen stores one HintState and replaces it
 * with what these functions return.
 */

export type HintState = {
    /** Which player move these hints are for (1 = the player's first move). */
    moveIndex: number;
    /** All tiers for this move, most general first. `null` until they've been loaded. */
    tiers: string[] | null;
    /** How many tiers are on screen. */
    revealed: number;
};

export const NO_MORE_HINTS_MESSAGE = "That's all the hints for this move.";
export const NO_HINTS_MESSAGE = 'No hints for this move yet.';

export function initialHintState(moveIndex: number): HintState {
    return { moveIndex, tiers: null, revealed: 0 };
}

/** Store loaded tiers. Already-revealed tiers stay revealed. */
export function withTiers(state: HintState, tiers: string[]): HintState {
    const clean = tiers.filter((t) => typeof t === 'string' && t.trim().length > 0);
    return { ...state, tiers: clean, revealed: Math.min(state.revealed, clean.length) };
}

/** Reveal one more tier. Returns the same object when there is nothing left to reveal. */
export function revealNext(state: HintState): HintState {
    if (!state.tiers || state.revealed >= state.tiers.length) {
        return state;
    }
    return { ...state, revealed: state.revealed + 1 };
}

export function revealedHints(state: HintState): string[] {
    return state.tiers ? state.tiers.slice(0, state.revealed) : [];
}

/** True once tiers are loaded and every one is on screen (including a move with zero tiers). */
export function isExhausted(state: HintState): boolean {
    return state.tiers !== null && state.revealed >= state.tiers.length;
}

/** Text for the Hint button in the puzzle bar. */
export function hintButtonLabel(state: HintState): string {
    return isExhausted(state) ? 'No more' : 'Hint';
}
