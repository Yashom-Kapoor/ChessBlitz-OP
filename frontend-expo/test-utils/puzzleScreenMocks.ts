/**
 * jest.mock calls for rendering app/puzzles/demo_puzzle.tsx without a device.
 * Import this file first in a test, before importing the screen.
 */
import { jest } from '@jest/globals';

jest.mock('expo-router', () => ({
    useGlobalSearchParams: () => ({}),
    useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-reanimated', () => {
    const { View, Image } = require('react-native');
    return {
        __esModule: true,
        default: { View, Image },
        useSharedValue: (v: unknown) => ({ value: v }),
        useAnimatedStyle: () => ({}),
        withTiming: (v: unknown) => v,
    };
});

jest.mock('@/context/ThemeContext', () => {
    const theme = new Proxy({}, { get: (_t, key) => (key === 'dark' ? false : '#123456') });
    return { useTheme: () => ({ theme, setTheme: () => {} }) };
});

jest.mock('@/context/GlobalStyle', () => () => new Proxy({}, { get: () => ({}) }));

jest.mock('@/context/Backgrounds', () => {
    const { View } = require('react-native');
    return { BackgroundContext: ({ children }: any) => require('react').createElement(View, null, children) };
});

jest.mock('@/components/GlassBlurView', () => () => null);
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));
jest.mock('@/api/SupabaseClient', () => ({
    supabase: {
        auth: {
            getSession: async () => ({ data: { session: { access_token: 't' } } }),
            getUser: async () => ({ data: { user: null } }),
        },
    },
}));
jest.mock('@/api/PostCompleted', () => ({ postCompletedPuzzle: async () => {} }));
jest.mock('@/api/GetHint', () => ({ fetchHint: jest.fn(async () => 'LLM hint') }));

jest.mock('@/components/puzzles/PuzzleBar', () => (props: any) => {
    require('./puzzleScreen').puzzleBar.props = props;
    return null;
});

jest.mock('@/components/puzzles/ChessboardDemo', () => {
    const React = require('react');
    const { Chess } = require('chess.js');
    const { fakeBoard } = require('./puzzleScreen');
    return React.forwardRef(function FakeChessboard(props: any, ref: any) {
        fakeBoard.props = props;
        React.useImperativeHandle(ref, () => ({
            getPuzzle: () => fakeBoard.puzzle,
            board: {
                // Programmatic moves fire onMove, like react-native-chessboard.
                move: async (m: any) => {
                    fakeBoard.game.move(m);
                    fakeBoard.props.onMove({ state: { fen: fakeBoard.game.fen() } });
                },
                resetBoard: (fen: string) => {
                    fakeBoard.game = new Chess(fen);
                },
            },
        }));
        React.useEffect(() => {
            fakeBoard.game = new Chess(fakeBoard.puzzle.fen);
            props.onPuzzleLoaded(fakeBoard.puzzle);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        return null;
    });
});
