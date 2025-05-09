/**
 * Module to handle application update checks against GitHub releases.
 */
const { https } = require('https');
const { app } = require('electron');

// Consider using 'semver' for robust version comparison: npm install semver

/**
 * Checks for available updates by comparing current version with latest GitHub release.
 * @returns {Promise<Object>} Resolves to update status object with:
 *   - isUpdateAvailable {boolean}
 *   - currentVersion {string}
 *   - latestVersion {string|null}
 *   - releaseUrl {string|null}
 *   - error {string|null}
 */
async function checkForUpdates() {
  try {
    const currentVersion = app.getVersion();
    const GITHUB_API_URL = 'api.github.com';
    const GITHUB_API_PATH = '/kleneway/pastemax/releases/latest';
    const USER_AGENT = 'PasteMax-Update-Checker';

    const options = {
      hostname: GITHUB_API_URL,
      path: GITHUB_API_PATH,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT
      }
    };

    const { latestVersionFromApi, releaseUrlFromApi } = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned status code ${res.statusCode}`));
          return;
        }

        let rawData = '';
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          rawData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(rawData);
            if (!response.tag_name || !response.html_url) {
              reject(new Error('GitHub response missing required fields'));
              return;
            }
            
            resolve({
              latestVersionFromApi: response.tag_name,
              releaseUrlFromApi: response.html_url
            });
          } catch (error) {
            reject(new Error(`Failed to parse GitHub response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error while checking for updates: ${error.message}`));
      });

      req.end();
    });

    // Normalize version by removing 'v' prefix if present
    const normalizedLatestVersion = latestVersionFromApi.startsWith('v')
      ? latestVersionFromApi.substring(1)
      : latestVersionFromApi;

    // Simple version comparison - consider using semver for more robust comparison
    const isUpdateAvailable = normalizedLatestVersion > currentVersion;

    return {
      isUpdateAvailable,
      currentVersion,
      latestVersion: normalizedLatestVersion,
      releaseUrl: releaseUrlFromApi,
      error: null
    };
  } catch (error) {
    console.error('Update check failed:', error);
    return {
      isUpdateAvailable: false,
      currentVersion: app.getVersion(),
      latestVersion: null,
      releaseUrl: null,
      error: error.message
    };
  }
}

module.exports = { checkForUpdates };