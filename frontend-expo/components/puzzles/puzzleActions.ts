export type PuzzleAction = 'hint' | 'undo' | 'redo' | 'reset';
export type PuzzleActionAvailability = Record<PuzzleAction, boolean>;

export function getPuzzleActionAvailability({ ready, playerTurn, retrying, completed, loadingHint, pendingMove, moveNumber, redoUnlocked, hasProgress, hasRedoMove }: {
    ready: boolean;
    playerTurn: boolean;
    retrying: boolean;
    completed: boolean;
    loadingHint: boolean;
    pendingMove: boolean;
    moveNumber: number;
    redoUnlocked: number;
    hasProgress: boolean;
    hasRedoMove: boolean;
}): PuzzleActionAvailability {
    const settled = ready && !pendingMove && !loadingHint && (playerTurn || retrying || completed);
    return {
        hint: settled && !retrying && !completed,
        undo: settled && (retrying || hasProgress),
        redo: settled && !retrying && !completed && hasRedoMove && moveNumber < redoUnlocked,
        reset: settled && (retrying || hasProgress || completed),
    };
}
