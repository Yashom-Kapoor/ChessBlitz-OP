/**
 * Switches for the hint and wrong-move features (Ticket 6).
 *
 * Flip these here rather than editing the screens.
 */

/**
 * Where wrong-move feedback comes from.
 * - 'mock': a fake response built in the app, so the UI works before Ticket 5's endpoint exists.
 * - 'live': POST `${getApiUrl()}/wrong-move` (Ticket 5).
 */
export const WRONG_MOVE_SOURCE: 'mock' | 'live' = 'mock';

/** Give up on /wrong-move after this long and show the fallback message instead. */
export const WRONG_MOVE_TIMEOUT_MS = 2500;

/**
 * Show the "BEST: <move>" solution readout on puzzle screens.
 *
 * Off by default, even in development, so testers see what players see. It is also ANDed with
 * `__DEV__` in PuzzleDevHUD, so it can never appear in a release build even if left on.
 */
export const SHOW_SOLUTION_HUD = false;
