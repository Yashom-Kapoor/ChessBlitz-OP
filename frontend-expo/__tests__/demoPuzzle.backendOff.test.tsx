import '@/test-utils/puzzleScreenMocks';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import DemoPuzzle from '@/app/puzzles/demo_puzzle';
import { WRONG_MOVE_FALLBACK } from '@/api/WrongMove';
import { PUZZLES, fakeBoard, toSupabasePuzzle } from '@/test-utils/puzzleScreen';

// Talk to the real /wrong-move endpoint instead of the mock.
jest.mock('@/constants/hints', () => ({ WRONG_MOVE_SOURCE: 'live', WRONG_MOVE_TIMEOUT_MS: 2500, SHOW_SOLUTION_HUD: false }));

const wait = async (ms: number) => {
    await act(async () => {
        await jest.advanceTimersByTimeAsync(ms);
    });
};
const bubble = (tree: ReactTestRenderer) =>
    tree.root.findAllByType(Text).map((t) => [].concat(t.props.children as any).join('')).find((t) => t.length > 0 && t !== '1500' && !/^\d+:\d\d/.test(t));

const realFetch = global.fetch;
beforeEach(() => {
    jest.useFakeTimers();
});
afterEach(() => {
    jest.useRealTimers();
    global.fetch = realFetch;
});

async function playWrongMove(): Promise<ReactTestRenderer> {
    const puzzle = toSupabasePuzzle(PUZZLES[1]);
    fakeBoard.puzzle = puzzle;
    let tree!: ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(<DemoPuzzle />);
    });
    await wait(600);
    const expected = puzzle.moves.split(' ')[1];
    const wrong = fakeBoard.game.moves({ verbose: true }).map((m) => m.from + m.to).find((m) => m !== expected)!;
    await act(async () => fakeBoard.userMove(wrong));
    return tree;
}

describe('wrong-move fallback with the backend unavailable', () => {
    test('backend off: shows "Not quite, try again", no raw error', async () => {
        global.fetch = jest.fn(async () => {
            throw new TypeError('Network request failed');
        }) as unknown as typeof fetch;
        const tree = await playWrongMove();
        await wait(1000);
        expect(bubble(tree)).toBe(WRONG_MOVE_FALLBACK);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/wrong-move$/), expect.anything());
    });

    test('backend too slow: falls back after the timeout', async () => {
        global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;
        const tree = await playWrongMove();
        await wait(1000);
        expect(bubble(tree)).toBe('Hmmm...');
        await wait(2000);
        expect(bubble(tree)).toBe(WRONG_MOVE_FALLBACK);
    });

    test('illegal move (400): falls back', async () => {
        global.fetch = jest.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: 'Illegal move' }) })) as unknown as typeof fetch;
        const tree = await playWrongMove();
        await wait(1000);
        expect(bubble(tree)).toBe(WRONG_MOVE_FALLBACK);
    });

    test('sends move_index and the UCI move to /puzzles/<id>/wrong-move', async () => {
        global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ classification: 'miss' }) })) as unknown as typeof fetch;
        await playWrongMove();
        await wait(1000);
        const [url, init] = jest.mocked(global.fetch).mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toMatch(/\/puzzles\/00Kia\/wrong-move$/);
        const body = JSON.parse(init.body as string);
        expect(Object.keys(body).sort()).toEqual(['move', 'move_index']);
        expect(body.move_index).toBe(1);
        expect(body.move).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
    });

    test('backend returns 500: falls back', async () => {
        global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'Something went wrong' }) })) as unknown as typeof fetch;
        const tree = await playWrongMove();
        await wait(1000);
        expect(bubble(tree)).toBe(WRONG_MOVE_FALLBACK);
    });
});
