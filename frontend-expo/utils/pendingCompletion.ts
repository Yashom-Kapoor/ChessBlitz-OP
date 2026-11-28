/**
 * Puzzle results are saved in the background so the player returns to the board right away.
 * Screens that show rating, coins or puzzle counts wait on this before reloading, otherwise they
 * read the old numbers while the save is still in flight.
 */

/** Longest a reload waits for a save before giving up and showing whatever the server has. */
export const PENDING_COMPLETION_TIMEOUT_MS = 5000;

let pending: Promise<void> = Promise.resolve();

/** Remember an in-flight save. A failed save counts as finished. */
export function trackCompletion(save: Promise<unknown>): void {
  const settled = save.then(() => undefined, () => undefined);
  pending = Promise.all([pending, settled]).then(() => undefined);
}

/** Resolves once every save started so far has finished, or after the timeout. Never rejects. */
export function waitForPendingCompletion(timeoutMs = PENDING_COMPLETION_TIMEOUT_MS): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); });
  return Promise.race([pending, timeout]).finally(() => clearTimeout(timer));
}
