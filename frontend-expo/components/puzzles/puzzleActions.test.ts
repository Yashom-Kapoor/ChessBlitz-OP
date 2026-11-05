import { describe, expect, test } from '@jest/globals';
import { getPuzzleActionAvailability } from './puzzleActions';

const initial = {
    ready: true, playerTurn: true, retrying: false, completed: false,
    loadingHint: false, pendingMove: false, moveNumber: 1, redoUnlocked: 1,
    hasProgress: false, hasRedoMove: true,
};
const none = { hint: false, undo: false, redo: false, reset: false };

describe('puzzle action availability', () => {
    test.each([
        ['loading', { ready: false }, none],
        ['opening/opponent turn', { playerTurn: false }, none],
        ['hint request', { loadingHint: true, hasProgress: true }, none],
        ['queued redo', { pendingMove: true, hasProgress: true, redoUnlocked: 2 }, none],
        ['initial player turn', {}, { ...none, hint: true }],
        ['progress', { hasProgress: true, moveNumber: 2 }, { ...none, hint: true, undo: true, reset: true }],
        ['after undo', { redoUnlocked: 2 }, { ...none, hint: true, redo: true }],
        ['no redo move', { redoUnlocked: 2, hasRedoMove: false }, { ...none, hint: true }],
        ['wrong move', { retrying: true, playerTurn: false }, { ...none, undo: true, reset: true }],
        ['completed', { completed: true, playerTurn: false, hasProgress: true, redoUnlocked: 2 }, { ...none, undo: true, reset: true }],
    ])('%s', (_name, overrides, expected) => {
        expect(getPuzzleActionAvailability({ ...initial, ...overrides as Partial<typeof initial> })).toEqual(expected);
    });
});
