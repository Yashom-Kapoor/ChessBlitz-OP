export const LOCAL_API_URL = 'http://127.0.0.1:5050';
export const REMOTE_API_URL = 'https://chessblitzbackend-caz1.onrender.com';

/**
 * Which backend the app talks to. Swap the constant below to point at the deployed API.
 *
 * Call `getApiUrl()` at request time rather than importing the constant directly — a couple of
 * screens used to shadow it with their own hardcoded localhost string, and routing every caller
 * through one accessor is what stops that happening again.
 */
const API_URL = LOCAL_API_URL;

export function getApiUrl() {
  return API_URL;
}
