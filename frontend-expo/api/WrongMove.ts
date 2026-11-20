import { getApiUrl } from '@/constants/urls';
import { supabase } from '@/api/SupabaseClient';
import { WRONG_MOVE_SOURCE, WRONG_MOVE_TIMEOUT_MS } from '@/constants/hints';

/**
 * Wrong-move feedback (Ticket 6), backed by Ticket 5's endpoint:
 *
 *   POST /puzzles/<puzzle_id>/wrong-move
 *   { "move_index": 1, "move": "h5g4" }          // move in UCI; the server loads the FEN itself
 *   -> 200 {
 *        "classification": "blunder" | "miss" | "also_works" | "solution",
 *        "move_san", "best_reply", "line", "score_before", "score_after",
 *        "mate_against", "material_change"
 *      }
 *   -> 400 for an illegal move (handled like any other failure)
 *
 * The extra fields are kept in `WrongMoveResult` for the feedback templates to use later.
 */

export type WrongMoveClassification = 'blunder' | 'miss' | 'also_works' | 'solution';

export type WrongMoveRequest = {
    puzzleId: string;
    /** Which player move, starting at 1. */
    moveIndex: number;
    /** The move the player made, in UCI (e.g. "e2e4", "a7a8q"). */
    move: string;
};

/** Everything /wrong-move returns. Fields the server leaves out or sends in an odd shape are `null`. */
export type WrongMoveResult = {
    classification: WrongMoveClassification;
    move_san: string | null;
    best_reply: string | null;
    line: string[] | null;
    score_before: number | null;
    score_after: number | null;
    mate_against: number | null;
    material_change: number | null;
};

export const WRONG_MOVE_FALLBACK = 'Not quite, try again';

/**
 * What the player sees for each classification. `solution` only comes back if the client sent
 * the actual solution move, which the screen never does (it checks the solution itself first),
 * so it gets the neutral fallback rather than a "wrong" message.
 */
export const WRONG_MOVE_MESSAGES: Record<WrongMoveClassification, string> = {
    blunder: 'Oops! That move gives something away. Try again!',
    miss: "Not bad, but there's a better move here. Try again!",
    also_works: 'That works too! Can you find the move the puzzle wants?',
    solution: WRONG_MOVE_FALLBACK,
};

const CLASSIFICATIONS: WrongMoveClassification[] = ['blunder', 'miss', 'also_works', 'solution'];

export function wrongMoveUrl(puzzleId: string): string {
    return `${getApiUrl()}/puzzles/${encodeURIComponent(puzzleId)}/wrong-move`;
}

export function buildRequestBody(req: WrongMoveRequest) {
    return { move_index: req.moveIndex, move: req.move };
}

const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strList = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null);

/** Read a /wrong-move response. An unknown or missing classification gives `null`. */
export function parseVerdict(body: unknown): WrongMoveResult | null {
    if (!body || typeof body !== 'object') {
        return null;
    }
    const b = body as Record<string, unknown>;
    if (!CLASSIFICATIONS.includes(b.classification as WrongMoveClassification)) {
        return null;
    }
    return {
        classification: b.classification as WrongMoveClassification,
        move_san: str(b.move_san),
        best_reply: str(b.best_reply),
        line: strList(b.line),
        score_before: num(b.score_before),
        score_after: num(b.score_after),
        mate_against: num(b.mate_against),
        material_change: num(b.material_change),
    };
}

/**
 * Stand-in for Ticket 5 while `WRONG_MOVE_SOURCE` is 'mock'. Picks a classification from the
 * move's letters, so the same wrong move always gets the same message and different moves show
 * all three. The other fields are dummy values in the real response's shape.
 */
export async function mockWrongMove(req: WrongMoveRequest): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let sum = 0;
    for (const ch of req.move) sum += ch.charCodeAt(0);
    const wrongOnly: WrongMoveClassification[] = ['blunder', 'miss', 'also_works'];
    return {
        classification: wrongOnly[sum % wrongOnly.length],
        move_san: req.move,
        best_reply: null,
        line: [],
        score_before: 0,
        score_after: 0,
        mate_against: null,
        material_change: 0,
        mock: true,
    };
}

async function liveWrongMove(req: WrongMoveRequest, signal: AbortSignal): Promise<unknown> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(wrongMoveUrl(req.puzzleId), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(buildRequestBody(req)),
        signal,
    });
    // 400 (illegal move) and every other non-200 end up as the fallback message.
    if (!response.ok) {
        throw new Error(`wrong-move HTTP ${response.status}`);
    }
    return response.json();
}

type Options = {
    source?: 'mock' | 'live';
    timeoutMs?: number;
    /** Swap the transport in tests. */
    transport?: (req: WrongMoveRequest, signal: AbortSignal) => Promise<unknown>;
};

/** The full /wrong-move result, or `null` if the call failed, was too slow, or made no sense. */
export async function classifyWrongMove(req: WrongMoveRequest, options: Options = {}): Promise<WrongMoveResult | null> {
    const source = options.source ?? WRONG_MOVE_SOURCE;
    const timeoutMs = options.timeoutMs ?? WRONG_MOVE_TIMEOUT_MS;
    const transport = options.transport ?? (source === 'mock' ? (r: WrongMoveRequest) => mockWrongMove(r) : liveWrongMove);

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
            controller.abort();
            resolve(null);
        }, timeoutMs);
    });

    try {
        const body = await Promise.race([transport(req, controller.signal), timeout]);
        return parseVerdict(body);
    } catch (err) {
        console.warn('wrong-move lookup failed:', err);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export function messageFor(result: WrongMoveResult | null): string {
    return result ? WRONG_MOVE_MESSAGES[result.classification] : WRONG_MOVE_FALLBACK;
}

/** The message to show the player. Never throws and never returns a raw error. */
export async function getWrongMoveMessage(req: WrongMoveRequest, options: Options = {}): Promise<string> {
    return messageFor(await classifyWrongMove(req, options));
}
