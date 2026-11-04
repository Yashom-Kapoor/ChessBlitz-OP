import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/api/SupabaseClient', () => ({
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}));
jest.mock('@/constants/urls', () => ({ getApiUrl: () => 'http://127.0.0.1:5000' }));

import {
    WRONG_MOVE_FALLBACK,
    WRONG_MOVE_MESSAGES,
    buildRequestBody,
    classifyWrongMove,
    getWrongMoveMessage,
    mockWrongMove,
    parseVerdict,
    wrongMoveUrl,
} from '@/api/WrongMove';

const req = { puzzleId: '00Kia', moveIndex: 1, move: 'h5g4' };

// A response in Ticket 5's shape.
const FULL = {
    classification: 'blunder',
    move_san: 'Qg4',
    best_reply: 'Qe5+',
    line: ['Qe5+', 'Kh3', 'Qh5#'],
    score_before: 2.81,
    score_after: -5.58,
    mate_against: 2,
    material_change: -9,
};

function fakeFetch(status: number, body: unknown) {
    return jest.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch;
}

describe('wrong-move request', () => {
    test('puzzle id goes in the path', () => {
        expect(wrongMoveUrl('00Kia')).toBe('http://127.0.0.1:5000/puzzles/00Kia/wrong-move');
    });

    test('body is just move_index and the UCI move (no FEN)', () => {
        expect(buildRequestBody(req)).toEqual({ move_index: 1, move: 'h5g4' });
    });

    test('live call POSTs that body to that path', async () => {
        const realFetch = global.fetch;
        global.fetch = fakeFetch(200, FULL);
        try {
            await classifyWrongMove(req, { source: 'live' });
            const [url, init] = jest.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
            expect(url).toBe('http://127.0.0.1:5000/puzzles/00Kia/wrong-move');
            expect(init.method).toBe('POST');
            expect(JSON.parse(init.body as string)).toEqual({ move_index: 1, move: 'h5g4' });
        } finally {
            global.fetch = realFetch;
        }
    });
});

describe('parseVerdict', () => {
    test('keeps every field the feedback templates need', () => {
        expect(parseVerdict(FULL)).toEqual(FULL);
    });

    test.each(['blunder', 'miss', 'also_works', 'solution'])('accepts classification %s', (c) => {
        expect(parseVerdict({ ...FULL, classification: c })?.classification).toBe(c);
    });

    test('missing or odd-shaped extra fields become null instead of failing', () => {
        expect(parseVerdict({ classification: 'miss', line: 'Qe5+ Kh3', score_before: 'big' })).toEqual({
            classification: 'miss',
            move_san: null,
            best_reply: null,
            line: null,
            score_before: null,
            score_after: null,
            mate_against: null,
            material_change: null,
        });
    });

    test.each([null, 'oops', {}, { classification: 'bad' }, { error: 'Illegal move' }])('rejects %p', (body) => {
        expect(parseVerdict(body)).toBeNull();
    });
});

describe('wrong-move messages', () => {
    test.each(['blunder', 'miss', 'also_works'] as const)('%s shows its message', async (c) => {
        const msg = await getWrongMoveMessage(req, { transport: async () => ({ ...FULL, classification: c }) });
        expect(msg).toBe(WRONG_MOVE_MESSAGES[c]);
    });

    test('the three wrong-move messages are different and short', () => {
        const all = [WRONG_MOVE_MESSAGES.blunder, WRONG_MOVE_MESSAGES.miss, WRONG_MOVE_MESSAGES.also_works];
        expect(new Set(all).size).toBe(3);
        all.forEach((m) => expect(m.split(' ').length).toBeLessThanOrEqual(12));
    });

    test('"solution" never tells the player they were wrong', async () => {
        const msg = await getWrongMoveMessage(req, { transport: async () => ({ ...FULL, classification: 'solution' }) });
        expect(msg).toBe(WRONG_MOVE_FALLBACK);
    });

    test.each([400, 401, 404, 500])('HTTP %i falls back', async (status) => {
        const realFetch = global.fetch;
        global.fetch = fakeFetch(status, { error: 'Illegal move' });
        try {
            expect(await getWrongMoveMessage(req, { source: 'live' })).toBe(WRONG_MOVE_FALLBACK);
        } finally {
            global.fetch = realFetch;
        }
    });

    test('backend off falls back', async () => {
        const realFetch = global.fetch;
        global.fetch = jest.fn(async () => {
            throw new TypeError('Network request failed');
        }) as unknown as typeof fetch;
        try {
            expect(await getWrongMoveMessage(req, { source: 'live' })).toBe(WRONG_MOVE_FALLBACK);
        } finally {
            global.fetch = realFetch;
        }
    });

    test('slow reply falls back after the timeout', async () => {
        const started = Date.now();
        const msg = await getWrongMoveMessage(req, {
            timeoutMs: 100,
            transport: () => new Promise((resolve) => setTimeout(() => resolve(FULL), 2000)),
        });
        expect(msg).toBe(WRONG_MOVE_FALLBACK);
        expect(Date.now() - started).toBeLessThan(1000);
    });

    test('classifyWrongMove never throws', async () => {
        await expect(classifyWrongMove(req, { transport: () => Promise.reject('boom') })).resolves.toBeNull();
    });
});

describe('mock', () => {
    test('is repeatable, uses the real response shape, and produces every wrong-move classification', async () => {
        const moves = ['h5g4', 'h5h6', 'e4d5', 'h5f7', 'e4g6', 'h5e8', 'a4a5'];
        const seen = new Set<string>();
        for (const move of moves) {
            const a = parseVerdict(await mockWrongMove({ ...req, move }));
            const b = parseVerdict(await mockWrongMove({ ...req, move }));
            expect(a).not.toBeNull();
            expect(a).toEqual(b);
            seen.add(a!.classification);
        }
        expect(seen).toEqual(new Set(['blunder', 'miss', 'also_works']));
    });
});
