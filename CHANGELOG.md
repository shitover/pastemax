## [1.0.4] - 2025-05-09

### Added

- **Update Checker Feature:**
  - Introduced an in-app Update Checker accessible from the main UI.
  - Added `UpdateModal` React component for update status and Github release download links.
  - Implemented backend GitHub release integration (`electron/update-checker.js`).
  - Added session-based caching in `electron/update-manager.js` to prevent repeated API calls.
  - IPC integration for renderer/main process communication.

### Fixed

- **Update Checker Robustness:**
  - Prevented repeated GitHub API calls by caching update results for the session.
  - Removed retry/re-check buttons from the modal to avoid rate limiting and UI confusion.
  - Ensured update status is consistent and only one API call is made per session.
  - Fixed TypeScript type error in update modal state logic.

## [1.0.3] - 2025-05-09

### Fixed

- **File Watching Improvements:**
  - Resolved issues with watched folder synchronization:
    - File removal now properly triggers updates
    - New file additions are correctly detected
    - File content changes are now reflected immediately after refreshing
  - Added refresh button to refresh when files are added, removed, or modified
  - Resolved circular dependency issues in the `electron/main.js` file, improving stability and performance.

## [1.0.2] - 2025-05-07

### Refactor

- **Core Logic Modularization:** Initiated a significant refactor to modularize the backend logic previously concentrated in `electron/main.js`.
  - Extracted file system interaction, file processing, and token counting logic into a new dedicated module: `electron/file-processor.js`.
  - Extracted all ignore logic (handling `.gitignore` files, default patterns, global ignores, and contextual filtering) into a new dedicated module: `electron/ignore-manager.js`.
- **Ignore Logic Enhancements (`electron/ignore-manager.js`):**
  - Renamed several functions and internal variables for improved clarity and consistency. Key renames include:
    - `defaultIgnoreFilter` (global variable) to `systemDefaultFilter`
    - `ignorePatternsCache` (global variable) to `rawGitignorePatternsCache`
    - `shouldExcludeByDefault()` to `isPathExcludedByDefaults()`
    - `shouldIgnorePath()` to `isPathIgnoredByActiveFilter()`
    - `loadGitignore()` to `loadAutomaticModeIgnoreFilter()`
    - `createGlobalIgnores()` to `createGlobalIgnoreFilter()`
  - Ensured all exported functions and variables use the new naming convention.
- **Integration Updates:**
  - Updated `electron/main.js` to import and utilize functions from the new `electron/file-processor.js` and `electron/ignore-manager.js` modules, reducing its direct responsibilities.
  - Updated `electron/file-processor.js` to correctly import and use the refactored functions and variables from `electron/ignore-manager.js`.

### Changed

- Improved separation of concerns in the Electron main process, leading to more maintainable and testable code.
- Enhanced clarity of ignore handling mechanisms through explicit function naming in `ignore-manager.js`.
