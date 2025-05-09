# Update Checker Feature

## Overview
The Update Checker is an automated feature that helps users stay current with the latest version of PasteMax. It works by periodically checking GitHub releases for newer versions and notifying users when updates are available. The feature combines backend version checking with a user-friendly frontend modal interface.

## Backend (`electron/update-checker.js`)
The backend component handles the core update checking logic:
- Makes HTTPS requests to GitHub's API to fetch latest release information
- Compares current application version with latest available version
- Provides comprehensive update status including version details and release URLs
- Handles errors gracefully with informative error messages
- Normalizes version numbers by removing 'v' prefix for consistent comparison

## Frontend (`src/components/UpdateModal.tsx`)
The UpdateModal component provides a user interface for update information:
- Displays different states: checking, up-to-date, update available, and error
- Shows current and latest version numbers when updates are available
- Provides a direct link to release notes on GitHub
- Includes a close button for dismissing the modal
- Maintains clean visual hierarchy for information display

## IPC Communication
The feature utilizes the `check-for-updates` channel for communication between frontend and backend:
- Frontend initiates update checks
- Backend performs the check and returns results
- Results include update availability, version information, and any error messages

## API Endpoint
The feature connects to GitHub's API:
- Endpoint: `https://api.github.com/repos/kleneway/pastemax/releases/latest`
- Returns latest release information including:
  - Version tag
  - Release URL
  - Other release metadata

## Configuration
The update checker uses specific configuration for API requests:
- User-Agent: `PasteMax-Update-Checker`
- Hostname: `api.github.com`
- Request Method: GET
- Response Format: JSON

## Manual Testing Scenarios

### Test Case 1: Up-to-date Scenario
**Precondition:**
- Application version matches or is newer than the latest release

**Steps:**
1. Launch the application
2. Trigger update check
3. Observe the update modal

**Expected Result:**
- Modal displays "You're up to date with version X.X.X"
- No update prompt or download link shown

### Test Case 2: Update Available Scenario
**Precondition:**
- A newer version exists on GitHub releases

**Steps:**
1. Launch an older version of the application
2. Trigger update check
3. Observe the update modal

**Expected Result:**
- Modal shows current and latest version numbers
- "View release notes" link is present and functional
- Update information is clearly presented

### Test Case 3: Network Offline Scenario
**Precondition:**
- No internet connection available

**Steps:**
1. Disable internet connection
2. Launch application
3. Trigger update check
4. Observe error handling

**Expected Result:**
- Error message indicates network connectivity issue
- Interface remains responsive
- User can dismiss the modal

### Test Case 4: Modal Interaction
**Steps:**
1. Open update modal
2. Click "View release notes" (if update available)
3. Click close button
4. Reopen modal
5. Try keyboard navigation (Tab, Enter, Esc)

**Expected Result:**
- Modal opens and closes properly
- Release notes link opens in external browser
- All buttons are keyboard-accessible
- Modal can be closed using Esc key
- Focus management works correctly