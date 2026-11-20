import { afterEach, describe, expect, jest, test } from '@jest/globals';
jest.mock('@/api/GetHint', () => ({ fetchHint: jest.fn(async () => 'LLM hint') }));

import { Chess } from 'chess.js';
import { fetchHint } from '@/api/GetHint';
import { TIERED_HINT_PUZZLES, getHintTiers } from '@/api/GetHintTiers';
import { hintButtonLabel, initialHintState, revealNext, revealedHints, withTiers } from '@/utils/hintTiers';

// Starting position (player to move) and full solution for the five hints-subteam puzzles,
// copied from new-backend/facts/data/records (Ticket 1/4).
const PUZZLES = [
    { id: '00AhO', fen: 'Q1b2rk1/2q2p1p/1p2pbp1/pP6/2P5/P2B1N2/5PPP/3R1RK1 b - - 0 20', line: 'Bb7 Qa7 Ra8 Qxa8+ Bxa8'.split(' ') },
    { id: '00Kia', fen: '5r1k/4n2p/1p4p1/pP5Q/P2pB2K/6P1/2P4P/4q3 w - - 0 38', line: 'Qe5+ Kg8 Bd5+ Nxd5 Qxe1'.split(' ') },
    { id: '01F1N', fen: 'r4rk1/pp1q2pp/3p1p2/2p2P2/5Q2/2Pn3P/PP1N1PP1/4RRK1 w - - 4 18', line: 'Qc4+ d5 Qxd3'.split(' ') },
    { id: '04E5q', fen: '5r1k/p3q1pp/1p6/3pB3/3Pb3/2P3Q1/P5PP/5RK1 w - - 0 28', line: 'Qxg7+ Qxg7 Rxf8#'.split(' ') },
    { id: '0cUVg', fen: '8/8/PPk3p1/1r6/2N1K3/8/8/8 w - - 1 74', line: 'a7 Kb7 Nd6+ Kxb6 a8=Q'.split(' ') },
];

describe('placeholder hints for the five puzzles', () => {
    afterEach(() => {
        jest.mocked(fetchHint).mockClear();
    });

    test('exactly the five puzzles use tiered hints', () => {
        expect([...TIERED_HINT_PUZZLES].sort()).toEqual(PUZZLES.map((p) => p.id).sort());
    });

    test.each(PUZZLES)('$id: play through every move, tapping Hint until it runs out', async ({ id, fen, line }) => {
        const game = new Chess(fen);
        const playerMoves = Math.ceil(line.length / 2);

        for (let moveIndex = 1; moveIndex <= playerMoves; moveIndex++) {
            const san = line[2 * (moveIndex - 1)];

            // New move: hints are back at tier 1.
            let state = initialHintState(moveIndex);
            expect(revealedHints(state)).toEqual([]);
            expect(hintButtonLabel(state)).toBe('Hint');

            const tiers = await getHintTiers(id, moveIndex);
            expect(tiers.length).toBeGreaterThan(0);
            state = withTiers(state, tiers);

            for (let tap = 1; tap <= tiers.length; tap++) {
                state = revealNext(state);
                expect(revealedHints(state)).toEqual(tiers.slice(0, tap));
            }
            expect(hintButtonLabel(state)).toBe('No more');

            // Exactly one tier gives the move away, and it names the right one.
            const moveTiers = tiers.filter((t) => /^Play /.test(t));
            expect(moveTiers).toHaveLength(1);
            expect(moveTiers[0]).toMatch(new RegExp(`^Play ${san.replace(/[+#=]/g, '\\$&')}\\.`));
            // Earlier tiers don't name the destination square.
            const square = san.replace(/[+#]|=.*/g, '').slice(-2);
            const moveTierIndex = tiers.indexOf(moveTiers[0]);
            tiers.slice(0, moveTierIndex).forEach((t) => expect(t).not.toContain(square));

            // Make the player's move and the opponent's reply on a real board.
            expect(game.move(san).san).toBe(san);
            const reply = line[2 * (moveIndex - 1) + 1];
            if (reply) expect(game.move(reply).san).toBe(reply);
        }

        // No hints past the end of the puzzle.
        expect(await getHintTiers(id, playerMoves + 1)).toEqual([]);
        expect(fetchHint).not.toHaveBeenCalled();
    });

    test('other puzzles still get their single hint from the old endpoint', async () => {
        expect(await getHintTiers('zzzzz', 2)).toEqual(['LLM hint']);
        expect(fetchHint).toHaveBeenCalledWith('zzzzz', 4);
    });
});
