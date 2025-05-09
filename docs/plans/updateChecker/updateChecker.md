# Project Plan: Feature - Check for Updates

## Phase 1: Backend Implementation (Electron Main Process - Modular)

### Story 1.1: Create `electron/update-checker.js` Module Foundation
- [x] Create the file `electron/update-checker.js` in the `electron` directory.
- [x] Add a JSDoc comment at the top of `electron/update-checker.js` describing its purpose: "Module to handle application update checks against GitHub releases."
- [x] In `electron/update-checker.js`, import the `https` module from Node.js: `const https = require('https');`
- [x] In `electron/update-checker.js`, import `app` from the `electron` module: `const { app } = require('electron');`
- [x] Add a comment in `electron/update-checker.js`: `// Consider using 'semver' for robust version comparison: npm install semver`
- [x] In `electron/update-checker.js`, define an exported asynchronous function named `checkForUpdates`: `async function checkForUpdates() { /* ... */ }`
- [x] Add the export statement for `checkForUpdates` at the bottom of the file: `module.exports = { checkForUpdates };`
- [x] Add a JSDoc comment above the `checkForUpdates` function detailing its purpose, parameters (none), and return type:
    ```javascript
    /**
     * Checks for application updates by querying the GitHub releases API.
     * @returns {Promise<object>} A promise that resolves to an object containing update status.
     * Expected success object: { isUpdateAvailable: boolean, currentVersion: string, latestVersion?: string, releaseUrl?: string }
     * Expected error object: { isUpdateAvailable: false, currentVersion: string, error: string }
     */
    ```

### Story 1.2: Implement GitHub API Call within `checkForUpdates`
- [x] Inside the `checkForUpdates` function in `electron/update-checker.js`, define the GitHub API URL constant: `const GITHUB_API_URL = 'api.github.com';`
- [x] Define the GitHub API path constant: `const GITHUB_API_PATH = '/repos/kleneway/pastemax/releases/latest';`
- [x] Define the `User-Agent` header string constant: `const USER_AGENT = 'PasteMax-Update-Checker/1.0.0'; // Or a dynamic version later`
- [x] Construct the options object for the `https.request` call:
    ```javascript
    const options = {
      hostname: GITHUB_API_URL,
      path: GITHUB_API_PATH,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
      },
    };
    ```
- [x] Wrap the `https.request` call within a `new Promise((resolve, reject) => { /* ... */ });` block.
- [x] Implement the `https.request(options, (res) => { /* ... */ });` call.
- [x] Inside the `https.request` callback, check `res.statusCode`. If not 200, `reject(new Error(\`GitHub API responded with status code: \${res.statusCode}\`)); return;`.
- [x] Initialize an empty string for data accumulation: `let rawData = '';`.
- [x] Set response encoding: `res.setEncoding('utf8');`.
- [x] Handle the `data` event on `res`: `res.on('data', (chunk) => { rawData += chunk; });`.
- [x] Handle the `end` event on `res`.
- [x] Inside the `end` event handler, attempt to `JSON.parse(rawData)` within a `try...catch` block.
- [x] If `JSON.parse` fails, `reject(new Error('Failed to parse GitHub API response.')); return;`.
- [x] If parsing is successful, extract `tag_name` and `html_url` from the parsed JSON data (e.g., `const { tag_name, html_url } = parsedData;`).
- [x] Check if `tag_name` and `html_url` exist. If not, `reject(new Error('Essential data (tag_name or html_url) missing from API response.')); return;`.
- [x] If data extraction is successful, `resolve({ latestVersionFromApi: tag_name, releaseUrlFromApi: html_url });`.
- [x] Handle the `error` event on the `req` object itself (from `https.request`): `req.on('error', (e) => { reject(new Error(\`Network error during GitHub API request: \${e.message}\`)); });`.
- [x] Call `req.end();` to send the request.

### Story 1.3: Implement Version Retrieval and Comparison in `checkForUpdates`
- [x] Get the current application version: `const currentVersion = app.getVersion();`. Place this near the top of `checkForUpdates` or where `currentVersion` is first needed.
- [x] Inside `checkForUpdates`, after successfully fetching API data (i.e., after `await`ing the promise from Story 1.2), normalize the `latestVersionFromApi` by removing any leading 'v': `const normalizedLatestVersion = latestVersionFromApi.replace(/^v/, '');`.
- [x] Perform version comparison. For now, use simple string comparison: `const isUpdateAvailable = normalizedLatestVersion > currentVersion;`. (Add a comment: `// TODO: Consider semver for robust comparison if versions become complex (e.g., pre-releases).`)
- [x] Construct the success result object to be returned by `checkForUpdates`:
    ```javascript
    return {
      isUpdateAvailable,
      currentVersion,
      latestVersion: normalizedLatestVersion,
      releaseUrl: releaseUrlFromApi,
    };
    ```
- [x] Wrap the entire logic of `checkForUpdates` (API call, version comparison) in a top-level `try...catch (error)` block.
- [x] In the `catch (error)` block at the end of `checkForUpdates`:
    - [x] `console.error('Error in checkForUpdates module:', error);`
    - [x] Return an error object:
        ```javascript
        return {
          isUpdateAvailable: false,
          currentVersion: app.getVersion(), // Attempt to get current version even on error
          error: error.message || 'An unknown error occurred in the update checker module.',
        };
        ```

### Story 1.4: Integrate `update-checker` Module into `electron/main.js`
- [x] Open `electron/main.js`.
- [x] At the top of `electron/main.js`, import the `checkForUpdates` function: `const { checkForUpdates } = require('./update-checker');`. Also import `ipcMain` if not already: `const { app, BrowserWindow, ipcMain } = require('electron');`.
- [x] Locate or create the section for IPC handlers in `main.js` (typically within or after `app.whenReady()`).
- [x] Define the IPC handler for `check-for-updates`: `ipcMain.handle('check-for-updates', async (event) => { /* ... */ });`.
- [x] Inside the `check-for-updates` IPC handler, wrap the call to `checkForUpdates` in a `try...catch` block.
- [x] In the `try` block, call and return the result: `const updateStatus = await checkForUpdates(); return updateStatus;`.
- [x] In the `catch (error)` block of the IPC handler:
    - [x] `console.error('IPC Error: Failed to check for updates:', error);`
    - [x] Return a standardized error object:
        ```javascript
        return {
          isUpdateAvailable: false,
          currentVersion: app.getVersion(), // Provide current version if possible
          error: error.message || 'An IPC error occurred while processing the update check.',
        };
        ```

## Phase 2: Preload Script (`electron/preload.js`)

### Story 2.1: Expose `checkForUpdates` Functionality via Context Bridge
- [x] Open `electron/preload.js`.
- [x] Ensure `contextBridge` and `ipcRenderer` are imported from `electron`: `const { contextBridge, ipcRenderer } = require('electron');`.
- [x] Locate the `contextBridge.exposeInMainWorld('electronAPI', { /* ... existing API methods ... */ });` block.
- [x] Add the `checkForUpdates` method to the `electronAPI` object:
    ```javascript
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    ```
- [x] Add a JSDoc comment above the `checkForUpdates` property in `preload.js` describing its purpose and return type (Promise resolving to the update status object from the main process).
    ```javascript
    // checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    /**
     * Invokes the main process to check for application updates.
     * @returns {Promise<object>} A promise that resolves to an object containing update status.
     * Expected format: { isUpdateAvailable: boolean, currentVersion: string, latestVersion?: string, releaseUrl?: string, error?: string }
     */
    ```

## Phase 3: Frontend Implementation (React/TypeScript - `src/`)

### Story 3.1: Define TypeScript Types for the Update Feature
- [x] Open `src/declarations.d.ts` (or the project's designated global TypeScript definitions file).
- [x] Define and export an interface `UpdateCheckResultFromMain`:
    ```typescript
    export interface UpdateCheckResultFromMain {
      isUpdateAvailable: boolean; // Note: backend always provides this
      currentVersion: string;    // Note: backend always provides this
      latestVersion?: string;
      releaseUrl?: string;
      error?: string;
    }
    ```
- [x] Define and export an interface `UpdateDisplayState` for the frontend component's state:
    ```typescript
    export interface UpdateDisplayState extends UpdateCheckResultFromMain {
      isLoading: boolean; // Frontend specific state
    }
    ```
- [x] Locate or define the `IElectronAPI` interface.
- [x] Add the `checkForUpdates` method signature to `IElectronAPI`:
    ```typescript
    checkForUpdates: () => Promise<UpdateCheckResultFromMain>;
    ```
- [x] Ensure the `Window` interface in `declare global { ... }` includes `electronAPI: IElectronAPI;`.

### Story 3.2: Create `UpdateModal.tsx` Component Structure
- [x] Create the file `src/components/UpdateModal.tsx`.
- [x] In `UpdateModal.tsx`, import `React`: `import React from 'react';`.
- [x] Import the `UpdateDisplayState` type: `import { UpdateDisplayState } from '../declarations'; // Adjust path as needed`.
- [x] Define the props interface for the `UpdateModal` component:
    ```typescript
    interface UpdateModalProps {
      isOpen: boolean;
      onClose: () => void;
      updateStatus: UpdateDisplayState;
    }
    ```
- [x] Create the functional component `UpdateModal`: `const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateStatus }) => { /* ... */ };`.
- [x] Add the export statement: `export default UpdateModal;`.
- [x] Implement the conditional rendering: `if (!isOpen) { return null; }`.
- [x] Return the basic modal JSX structure:
    ```tsx
    return (
      <div className="update-modal-overlay">
        <div className="update-modal-content">
          {/* Content will go here */}
          <button onClick={onClose} className="update-modal-close-button">Close</button>
        </div>
      </div>
    );
    ```

### Story 3.3: Implement Dynamic Content Rendering in `UpdateModal.tsx`
- [x] Inside `UpdateModal.tsx`, within the `update-modal-content` div, add a section for the title: `<h4>Update Status</h4>`.
- [x] Implement conditional rendering for `updateStatus.isLoading`:
    ```tsx
    {updateStatus.isLoading && <p>Checking for updates...</p>}
    ```
- [x] Implement conditional rendering for `updateStatus.error` (only if not loading):
    ```tsx
    {!updateStatus.isLoading && updateStatus.error && (
      <p className="update-error">Error: {updateStatus.error}</p>
    )}
    ```
- [x] Implement conditional rendering for `updateStatus.isUpdateAvailable === true` (only if not loading and no error):
    ```tsx
    {!updateStatus.isLoading && !updateStatus.error && updateStatus.isUpdateAvailable && (
      <div>
        <p>A new version (<strong>{updateStatus.latestVersion || 'N/A'}</strong>) is available!</p>
        <p>Your current version is: {updateStatus.currentVersion}.</p>
        {updateStatus.releaseUrl && (
          <p>
            <a href={updateStatus.releaseUrl} target="_blank" rel="noopener noreferrer">
              View Release Notes & Download
            </a>
          </p>
        )}
      </div>
    )}
    ```
- [x] Implement conditional rendering for `updateStatus.isUpdateAvailable === false` (only if not loading and no error):
    ```tsx
    {!updateStatus.isLoading && !updateStatus.error && !updateStatus.isUpdateAvailable && (
      <p>You are using the latest version ({updateStatus.currentVersion}).</p>
    )}
    ```

### Story 3.4: Integrate "Check for Updates" Button and Logic (e.g., in `Sidebar.tsx`)
- [x] Open the chosen component file for the button (e.g., `src/components/Sidebar.tsx`).
- [x] Import `React` and `useState`: `import React, { useState } from 'react';`.
- [x] Import the `UpdateModal` component: `import UpdateModal from './UpdateModal'; // Adjust path`.
- [x] Import the `UpdateDisplayState` type: `import { UpdateDisplayState } from '../declarations'; // Adjust path`.
- [x] Add state for modal visibility: `const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);`.
- [x] Add state for update status, initializing `isLoading` to `false` and other fields as undefined or default:
    ```typescript
    const [updateStatus, setUpdateStatus] = useState<UpdateDisplayState>({
      isLoading: false,
      isUpdateAvailable: false, // Default to false
      currentVersion: 'N/A',   // Default
    });
    ```
- [x] Create an asynchronous function `handleCheckForUpdates`: `const handleCheckForUpdates = async () => { /* ... */ };`.
- [x] Inside `handleCheckForUpdates`:
    - [x] `setIsUpdateModalOpen(true);`
    - [x] `setUpdateStatus(prev => ({ ...prev, isLoading: true, error: undefined })); // Clear previous error`
    - [x] Wrap the API call in `try...catch (error: any)`:
        ```typescript
        try {
          const result = await window.electronAPI.checkForUpdates();
          setUpdateStatus({ isLoading: false, ...result });
        } catch (err: any) {
          console.error("Frontend: Error checking for updates", err);
          setUpdateStatus({
            isLoading: false,
            isUpdateAvailable: false, // Sensible default on error
            currentVersion: updateStatus.currentVersion, // Keep old if available
            error: err.message || 'Failed to check for updates from frontend.',
          });
        }
        ```
- [x] In the JSX of the chosen component, add the "Check for Updates" button:
    ```tsx
    <button onClick={handleCheckForUpdates} className="check-updates-button">
      Check for Updates
    </button>
    ```
- [x] In the JSX, render the `UpdateModal` component, passing the necessary props:
    ```tsx
    <UpdateModal
      isOpen={isUpdateModalOpen}
      onClose={() => setIsUpdateModalOpen(false)}
      updateStatus={updateStatus}
    />
    ```

### Story 3.5: Style the Update Modal and Button
- [x] Open `src/styles/index.css` (or the project's main/component-specific stylesheet).
- [x] Add CSS for `.update-modal-overlay`:
    ```css
    .update-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; /* Ensure it's on top */
    }
    ```
- [x] Add CSS for `.update-modal-content`:
    ```css
    .update-modal-content {
      background-color: #fff; /* Or theme-appropriate background */
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
      max-width: 500px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      color: #333; /* Or theme-appropriate text color */
    }
    /* Add styles for dark mode if applicable */
    ```
- [x] Add CSS for `.update-modal-close-button` (e.g., float right, simple styling).
- [x] Add CSS for `.update-error` (e.g., `color: red;`).
- [x] Style the `.check-updates-button` to be consistent with other buttons in the application.
- [x] Style any links within the modal for better visibility and interaction.

## Phase 4: Documentation and Testing

### Story 4.1: Create Documentation for the Update Feature
- [x] Create a new markdown file: `docs/features/update-checker.md`.
- [x] In `update-checker.md`, add a title: `# Update Checker Feature`.
- [x] Add a section "Overview" describing the feature's purpose.
- [x] Add a section "Backend (`electron/update-checker.js`)" detailing its role in fetching and comparing versions.
- [x] Add a section "Frontend (`src/components/UpdateModal.tsx`)" describing the modal's role and states.
- [x] Add a section "IPC Communication" mentioning the `check-for-updates` channel.
- [x] Add a section "API Endpoint" specifying `https://api.github.com/repos/kleneway/pastemax/releases/latest`.
- [x] Add a section "Configuration" noting the `User-Agent` used.

### Story 4.2: Manual Testing Plan and Execution
- [x] In `docs/features/update-checker.md` (or a separate test plan), add a section "Manual Testing Scenarios".
- [x] Document Test Case 1: "Up-to-date Scenario"
- Precondition: Local app version matches or is newer than the latest GitHub release `tag_name`.
    - Steps: Click "Check for Updates".
    - Expected Result: Modal shows "You are using the latest version (vX.Y.Z)."
- [x] Document Test Case 2: "Update Available Scenario"
    - Precondition: Manually edit `package.json` to an older version (e.g., "0.9.0"). If needed, rebuild/restart Electron.
    - Steps: Click "Check for Updates".
    - Expected Result: Modal shows "A new version (vLatest) is available!" with current and latest versions, and a working link to release notes.
- [x] Document Test Case 3: "Network Offline Scenario"
    - Precondition: Disconnect the machine from the internet.
    - Steps: Click "Check for Updates".
    - Expected Result: Modal shows an appropriate error message (e.g., "Network error..." or "Failed to fetch...").
- [x] Document Test Case 4: "Modal Interaction"
    - Steps: Open modal, click "Close" button.
    - Expected Result: Modal closes. Re-clicking "Check for Updates" re-opens and re-fetches.
- [x] Execute all documented manual test cases and verify results.

## Phase 5: (Optional but Recommended) Refinements

### Story 5.1: Implement `semver` for Robust Version Comparison
- [x] In the project root, run `npm install semver`.
- [x] Run `npm install --save-dev @types/semver` to install TypeScript type definitions for `semver`.
- [x] In `electron/update-checker.js`, import `semver`: `const semver = require('semver');`.
- [x] In `checkForUpdates`, ensure both `currentVersion` and `normalizedLatestVersion` are clean (e.g., "1.2.3", not "v1.2.3").
    - `const cleanCurrentVersion = currentVersion.replace(/^v/, '');`
    - `const cleanLatestVersion = normalizedLatestVersion; // Already cleaned`
- [x] Replace the string comparison with `semver.gt()`: `const isUpdateAvailable = semver.valid(cleanLatestVersion) && semver.valid(cleanCurrentVersion) && semver.gt(cleanLatestVersion, cleanCurrentVersion);`. Add null/invalid checks for safety.
- [x] Update any JSDoc comments or internal comments regarding version comparison to reflect the use of `semver`.
- [x] Retest "Up-to-date" and "Update Available" scenarios with `semver` logic.
