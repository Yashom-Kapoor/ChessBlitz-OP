import '@/test-utils/puzzleScreenMocks';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { Chess } from 'chess.js';

import DemoPuzzle from '@/app/puzzles/demo_puzzle';
import { fetchHint } from '@/api/GetHint';
import { getHintTiers } from '@/api/GetHintTiers';
import { WRONG_MOVE_MESSAGES } from '@/api/WrongMove';
import { NO_MORE_HINTS_MESSAGE } from '@/utils/hintTiers';
import { PUZZLES, fakeBoard, puzzleBar, toSupabasePuzzle } from '@/test-utils/puzzleScreen';

const wait = async (ms: number) => {
    await act(async () => {
        await jest.advanceTimersByTimeAsync(ms);
    });
};

function bubble(tree: ReactTestRenderer): string {
    const texts = tree.root.findAllByType(Text).map((t) => [].concat(t.props.children as any).join(''));
    return texts.find((t) => t !== '1500' && !/^\d+:\d\d/.test(t) && t !== '') ?? '';
}

async function tapHint() {
    await act(async () => {
        await puzzleBar.props.onHint();
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(fetchHint).mockClear();
});
afterEach(() => {
    jest.useRealTimers();
});

describe('puzzle screen play-through (mocked /wrong-move)', () => {
    test.each(PUZZLES)('$id: every move, every hint tier, a wrong move, and the reset', async (p) => {
        const puzzle = toSupabasePuzzle(p);
        fakeBoard.puzzle = puzzle;
        const uci = puzzle.moves.split(' ');

        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<DemoPuzzle />);
        });
        await wait(600); // opponent's setup move

        expect(fakeBoard.game.fen().split(' ')[0]).toBe(p.fen.split(' ')[0]);
        expect(bubble(tree)).toBe('Need a hint?');
        // The solution readout is off unless SHOW_SOLUTION_HUD is turned on.
        expect(JSON.stringify(tree.toJSON())).not.toContain('BEST');

        const playerMoves = Math.ceil(p.line.length / 2);
        for (let moveIndex = 1; moveIndex <= playerMoves; moveIndex++) {
            const tiers = await getHintTiers(p.id, moveIndex);
            expect(puzzleBar.props.hintLabel).toBe('Hint');

            // Tap through every tier. Earlier tiers stay on screen.
            for (let k = 1; k <= tiers.length; k++) {
                await tapHint();
                expect(bubble(tree)).toBe(tiers.slice(0, k).join('\n\n'));
            }
            expect(puzzleBar.props.hintLabel).toBe('No more');
            await tapHint();
            expect(bubble(tree)).toBe([NO_MORE_HINTS_MESSAGE, ...tiers].join('\n\n'));

            // A wrong move: a short message, the piece goes back, hints stay listed.
            const before = fakeBoard.game.fen();
            const expected = uci[2 * moveIndex - 1];
            const wrong = new Chess(before)
                .moves({ verbose: true })
                .map((m) => m.from + m.to + (m.promotion ?? ''))
                .find((m) => m !== expected)!;
            await act(async () => fakeBoard.userMove(wrong));
            expect(bubble(tree).split('\n\n')[0]).toBe('Hmmm...');
            await wait(1000);
            const [message, ...rest] = bubble(tree).split('\n\n');
            expect(Object.values(WRONG_MOVE_MESSAGES)).toContain(message);
            expect(rest).toEqual(tiers);
            expect(fakeBoard.game.fen()).toBe(before);
            expect(puzzleBar.props.hintLabel).toBe('No more');

            // The correct move.
            await act(async () => fakeBoard.userMove(expected));
            await wait(1000); // opponent's reply
            if (moveIndex < playerMoves) {
                expect(bubble(tree)).toBe('Great job! Keep going!');
                expect(puzzleBar.props.hintLabel).toBe('Hint');
            } else {
                expect(bubble(tree)).toBe('Congratulations! You completed the puzzle!');
            }
        }

        // No hint call went to the LLM endpoint.
        expect(fetchHint).not.toHaveBeenCalled();
        await act(async () => tree.unmount());
    });

    test('undo goes back to the previous move and its hints start at tier 1', async () => {
        const p = PUZZLES.find((x) => x.id === '00Kia')!;
        const puzzle = toSupabasePuzzle(p);
        fakeBoard.puzzle = puzzle;
        const uci = puzzle.moves.split(' ');

        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<DemoPuzzle />);
        });
        await wait(600);
        await tapHint();
        await act(async () => fakeBoard.userMove(uci[1]));
        await wait(1000);
        await tapHint();
        await tapHint();
        const move2 = await getHintTiers(p.id, 2);
        expect(bubble(tree)).toBe(move2.slice(0, 2).join('\n\n'));

        await act(async () => puzzleBar.props.onUndo());
        await wait(100);
        expect(bubble(tree)).toBe('Need a hint?');
        expect(puzzleBar.props.hintLabel).toBe('Hint');
        await tapHint();
        expect(bubble(tree)).toBe((await getHintTiers(p.id, 1))[0]);
        await act(async () => tree.unmount());
    });
});
