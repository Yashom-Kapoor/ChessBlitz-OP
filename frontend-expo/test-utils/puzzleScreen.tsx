/**
 * Shared mocks and helpers for the puzzle-screen play-through tests.
 *
 * The real screen is rendered. Only the parts that need a device (the chessboard, glass/blur
 * views, Supabase) are swapped for small fakes. The fake board is a chess.js game that calls
 * `onMove` the way react-native-chessboard does.
 */
import { Chess } from 'chess.js';

// Starting position (player to move) and full solution for the five hints-subteam puzzles,
// copied from new-backend/facts/data/records (Ticket 1/4).
export const PUZZLES = [
    { id: '00AhO', fen: 'Q1b2rk1/2q2p1p/1p2pbp1/pP6/2P5/P2B1N2/5PPP/3R1RK1 b - - 0 20', line: 'Bb7 Qa7 Ra8 Qxa8+ Bxa8'.split(' ') },
    { id: '00Kia', fen: '5r1k/4n2p/1p4p1/pP5Q/P2pB2K/6P1/2P4P/4q3 w - - 0 38', line: 'Qe5+ Kg8 Bd5+ Nxd5 Qxe1'.split(' ') },
    { id: '01F1N', fen: 'r4rk1/pp1q2pp/3p1p2/2p2P2/5Q2/2Pn3P/PP1N1PP1/4RRK1 w - - 4 18', line: 'Qc4+ d5 Qxd3'.split(' ') },
    { id: '04E5q', fen: '5r1k/p3q1pp/1p6/3pB3/3Pb3/2P3Q1/P5PP/5RK1 w - - 0 28', line: 'Qxg7+ Qxg7 Rxf8#'.split(' ') },
    { id: '0cUVg', fen: '8/8/PPk3p1/1r6/2N1K3/8/8/8 w - - 1 74', line: 'a7 Kb7 Nd6+ Kxb6 a8=Q'.split(' ') },
];

const SQUARES = 'abcdefgh'.split('').flatMap((f) => '12345678'.split('').map((r) => `${f}${r}`));

/**
 * The puzzle as Supabase stores it: the FEN *before* the opponent's setup move, plus every move in
 * UCI starting with that setup move. The records only keep the position after the setup move, so
 * this finds some legal non-pawn opponent move that leads to it.
 */
export function toSupabasePuzzle(p: (typeof PUZZLES)[number]) {
    const after = new Chess(p.fen);
    const opp = after.turn() === 'w' ? 'b' : 'w';
    for (const s of SQUARES) {
        const piece = after.get(s as any);
        if (!piece || piece.color !== opp || piece.type === 'p') continue;
        for (const t of SQUARES) {
            if (after.get(t as any)) continue;
            const g = new Chess(p.fen);
            g.remove(s as any);
            g.put(piece, t as any);
            const parts = g.fen().split(' ');
            parts[1] = opp;
            parts[3] = '-';
            let before: Chess;
            try {
                before = new Chess(parts.join(' '));
                before.move({ from: t, to: s });
            } catch {
                continue;
            }
            if (before.fen().split(' ').slice(0, 2).join(' ') !== p.fen.split(' ').slice(0, 2).join(' ')) continue;

            const solution = new Chess(p.fen);
            const uci = p.line.map((san) => {
                const m = solution.move(san);
                return m.from + m.to + (m.promotion ?? '');
            });
            return { puzzleid: p.id, fen: parts.join(' '), moves: [t + s, ...uci].join(' '), rating: 1500 };
        }
    }
    throw new Error(`no setup move found for ${p.id}`);
}

/** Fake board shared between the ChessboardDemo mock and the tests. */
export const fakeBoard: {
    game: Chess;
    props: any;
    puzzle: any;
    userMove: (uci: string) => void;
} = {
    game: new Chess(),
    props: null,
    puzzle: null,
    userMove(uci: string) {
        this.game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
        this.props.onMove({ state: { fen: this.game.fen() } });
    },
};

export const puzzleBar: { props: any } = { props: null };
