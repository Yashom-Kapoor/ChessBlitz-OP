import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { fetchRandomPuzzle } from '@/api/RandomPuzzle';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';
import { useTheme } from '@/context/ThemeContext';

// Define the props for ChessboardDemo
interface ChessboardDemoProps {
    onMove?: (info: any) => void; // Optional onMove callback
    colors?: { black: string; white: string }; // Optional colors for the chessboard
    gestureEnabled?: boolean; // Optional gesture enabled flag
    isTablet?: boolean;
}

// Define the type of the ref object
interface ChessboardDemoRef {
    getPuzzle: () => any; // Function to return the puzzle state
    board: ChessboardRef | null; // Reference to the Chessboard
}

const ChessboardDemo = forwardRef<ChessboardDemoRef, ChessboardDemoProps>((props, ref) => {
    const chessboardRef = React.useRef<ChessboardRef>(null);
    const { theme } = useTheme();

    const [puzzle, setPuzzle] = useState<any | undefined>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getPuzzle = async () => {
            try {
                const data = await fetchRandomPuzzle(); // Fetch the puzzle JSON
                setPuzzle(data); // Set the puzzle data
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred'); // Set the error message
            } finally {
                setLoading(false); // Stop loading
            }
        };
        getPuzzle();
    }, []);

    // Expose the chessboardRef and getPuzzle function to the parent component
    useImperativeHandle(ref, () => ({
        getPuzzle: () => puzzle, // Function to return the puzzle state
        board: chessboardRef.current, // Reference to the Chessboard
    }));

    if (loading) {
        return (
            <>
                <Text style={{ color: theme.primaryText }}>Loading...</Text>
                <ActivityIndicator size="large" color={theme.primaryText} />
            </>
        );
    }
    if (error) {
        return (
            <View>
                <Text>Error: {error}</Text>
            </View>
        );
    }
    return (
        <GestureHandlerRootView style={[styles.boardContainer, { transform: props.isTablet ? 'scale(0.95)' : 'scale(1)' }]}>
            <Chessboard
                colors={props.colors || { black: '#739552', white: '#ebecd0' }} // Default colors if not provided
                gestureEnabled={props.gestureEnabled} // Manage gestures
                fen={puzzle?.FEN} // Pass the fetched FEN to the chessboard
                ref={chessboardRef}
                onMove={props.onMove} // Pass the onMove callback
            />
        </GestureHandlerRootView>
    );
});

const styles = StyleSheet.create({
    boardContainer: {
        marginTop: -10,
        borderRadius: 2,
        overflow: 'hidden',
    },
});

export default ChessboardDemo;