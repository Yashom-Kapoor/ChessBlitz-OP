import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Orientation, squareToXY } from './geometry';
import type { BoardPiece } from './logic';

export const MOVE_DURATION = 180;
const RETURN_DURATION = 140;

type Props = {
    piece: BoardPiece;
    orientation: Orientation;
    boardSize: number;
    /** Id of the piece the finger is holding ('' for none). */
    draggedId: SharedValue<string>;
    /** 1 once the held piece has actually moved under the finger. */
    dragActive: SharedValue<number>;
    /** Top-left of the dragged piece, in board coordinates. */
    dragX: SharedValue<number>;
    dragY: SharedValue<number>;
    children: React.ReactNode;
};

/**
 * One piece, absolutely positioned. It slides to its square whenever the square (or the board's
 * orientation/size) changes, and follows the finger while it is being dragged.
 */
function Piece({ piece, orientation, boardSize, draggedId, dragActive, dragX, dragY, children }: Props) {
    const cell = boardSize / 8;
    const target = squareToXY(piece.square, orientation, boardSize);
    const id = piece.id;

    const x = useSharedValue(target.x);
    const y = useSharedValue(target.y);
    const homeX = useSharedValue(target.x);
    const homeY = useSharedValue(target.y);

    useEffect(() => {
        homeX.value = target.x;
        homeY.value = target.y;
        // While held, the drag reaction below owns the position; on release it slides home.
        if (!(draggedId.value === id && dragActive.value === 1)) {
            x.value = withTiming(target.x, { duration: MOVE_DURATION });
            y.value = withTiming(target.y, { duration: MOVE_DURATION });
        }
    }, [target.x, target.y]);

    useAnimatedReaction(
        () => (draggedId.value === id && dragActive.value === 1 ? [dragX.value, dragY.value] : null),
        (current, previous) => {
            if (current) {
                x.value = current[0];
                y.value = current[1];
            } else if (previous) {
                x.value = withTiming(homeX.value, { duration: RETURN_DURATION });
                y.value = withTiming(homeY.value, { duration: RETURN_DURATION });
            }
        }
    );

    const style = useAnimatedStyle(() => {
        const held = draggedId.value === id && dragActive.value === 1;
        return {
            zIndex: held ? 100 : 1,
            transform: [
                { translateX: x.value },
                { translateY: y.value },
                { scale: withTiming(held ? 1.15 : 1, { duration: 100 }) },
            ],
        };
    });

    return (
        <Animated.View pointerEvents="none" style={[styles.piece, { width: cell, height: cell }, style]}>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    piece: { position: 'absolute', left: 0, top: 0 },
});

export default React.memo(Piece);
