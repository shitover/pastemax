/**
 * Module to handle application update checks against GitHub releases.
 */
const { https } = require('https');
const { app } = require('electron');
const semver = require('semver');


/**
 * Checks for available updates by comparing current version with latest GitHub release.
 * Uses semver for robust version comparison.
 * @returns {Promise<Object>} Resolves to update status object with:
 *   - isUpdateAvailable {boolean}
 *   - currentVersion {string} (cleaned of any 'v' prefix)
 *   - latestVersion {string|null} (cleaned of any 'v' prefix)
 *   - releaseUrl {string|null}
 *   - error {string|null}
 */
async function checkForUpdates() {
  try {
    const currentVersion = app.getVersion();
    const GITHUB_API_URL = 'api.github.com';
    const GITHUB_API_PATH = '/repos/kleneway/pastemax/releases/latest';
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

    // Clean versions by removing 'v' prefix if present
    const cleanLatestVersion = latestVersionFromApi.replace(/^v/, '');
    const cleanCurrentVersion = currentVersion.replace(/^v/, '');

    // Robust version comparison using semver
    const isUpdateAvailable = semver.valid(cleanLatestVersion) &&
                              semver.valid(cleanCurrentVersion) &&
                              semver.gt(cleanLatestVersion, cleanCurrentVersion);

    return {
      isUpdateAvailable,
      currentVersion: cleanCurrentVersion,
      latestVersion: cleanLatestVersion,
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
