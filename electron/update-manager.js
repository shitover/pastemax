/**
 * Update Manager Module
 * Handles session-based caching and retry limiting for update checks in the Electron main process.
 * Ensures that only a limited number of API calls are made per app session, and caches the result.
 * Exports functions for retrieving update status and resetting session state.
 *
 * @module update-manager
 */

const { app } = require('electron');
const { checkForUpdates: actualCheckForUpdates } = require('./update-checker');

/**
 * Cached result of the last update check for the current session.
 * @type {null | import('./update-checker').UpdateCheckResultFromMain}
 */
let cachedUpdateResult = null;

/**
 * Number of API calls made to check for updates in the current session.
 * @type {number}
 */
/**
 * Get the update status for the current session.
 * Returns a cached result if available, otherwise performs a new API call (up to the session limit).
 * If the session limit is reached, returns the last error or a generic error.
 *
 * @async
 * @returns {Promise<import('./update-checker').UpdateCheckResultFromMain & { isLoading: boolean }>}
 */
async function getUpdateStatus() {
  // If we have a cached result, always return it for the session (no further API calls)
  if (cachedUpdateResult) {
    return { ...cachedUpdateResult, isLoading: false };
  }

  // Make a new API call (first call in session)
  try {
    const result = await actualCheckForUpdates();
    cachedUpdateResult = { ...result };
    return { ...result, isLoading: false };
  } catch (error) {
    const errorResult = {
      isUpdateAvailable: false,
      currentVersion: app.getVersion(),
      latestVersion: null,
      releaseUrl: null,
      error: error.message || 'Unknown error during update check execution',
      debugLogs: error.stack || '',
      isLoading: false,
    };
    cachedUpdateResult = { ...errorResult };
    return errorResult;
  }
}

/**
 * Reset the update session state.
 * Clears the cached update result and resets the API call attempt counter.
 */
function resetUpdateSessionState() {
  cachedUpdateResult = null;
}

module.exports = {
  getUpdateStatus,
  resetUpdateSessionState,
};
