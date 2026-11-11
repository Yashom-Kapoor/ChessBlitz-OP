import { describe, expect, test } from '@jest/globals';
import {
    hintButtonLabel,
    initialHintState,
    isExhausted,
    revealNext,
    revealedHints,
    withTiers,
} from '@/utils/hintTiers';

describe('hint tiers', () => {
    test('starts with nothing revealed and the normal button', () => {
        const s = initialHintState(1);
        expect(revealedHints(s)).toEqual([]);
        expect(hintButtonLabel(s)).toBe('Hint');
        expect(isExhausted(s)).toBe(false);
    });

    test.each([1, 2, 3, 5, 8])('reveals %i tiers one at a time, keeping earlier ones', (n) => {
        const tiers = Array.from({ length: n }, (_, i) => `tier ${i + 1}`);
        let s = withTiers(initialHintState(1), tiers);
        for (let i = 1; i <= n; i++) {
            expect(hintButtonLabel(s)).toBe('Hint');
            s = revealNext(s);
            expect(revealedHints(s)).toEqual(tiers.slice(0, i));
        }
        expect(isExhausted(s)).toBe(true);
        expect(hintButtonLabel(s)).toBe('No more');
        // Tapping again changes nothing.
        expect(revealNext(s)).toBe(s);
    });

    test('a move with zero tiers is exhausted straight away', () => {
        const s = withTiers(initialHintState(2), []);
        expect(isExhausted(s)).toBe(true);
        expect(hintButtonLabel(s)).toBe('No more');
        expect(revealNext(s)).toBe(s);
    });

    test('blank tiers are dropped', () => {
        const s = withTiers(initialHintState(1), ['a', '', '  ', 'b']);
        expect(s.tiers).toEqual(['a', 'b']);
    });

    test('next move starts again at tier 1', () => {
        let s = revealNext(revealNext(withTiers(initialHintState(1), ['a', 'b', 'c'])));
        expect(revealedHints(s)).toEqual(['a', 'b']);
        s = initialHintState(2);
        expect(s.tiers).toBeNull();
        expect(revealedHints(s)).toEqual([]);
        expect(hintButtonLabel(s)).toBe('Hint');
    });
});
