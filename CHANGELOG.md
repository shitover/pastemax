## [1.0.8] - 2025-05-17

### Changed

- **CSS Modularization:**
  - Broke down the large `src/styles/index.css` into smaller, component-specific and layout-specific `.css` files organized in subdirectories (`header`, `sidebar`, `contentarea`, `modals`, `base`).
  - `index.css` now primarily contains CSS variables (Design System), global resets, and base styles.
  - Legacy styles remain in their respective files; future CSS work should use modular files for new components and features.
  - All `.css` files are imported in `src/main.tsx` for global availability.
  - A backup of the original `index.css` is stored at `src/styles/backup/index.css.bak`.
  - Guidance for future contributions and modularization strategy documented in `src/styles/README.md`.

## [1.0.7] - 2025-05-16

### Added

- `WorkspaceManager.tsx` feature:
  - Allows users to create and manage multiple workspaces
  - Each workspace can have its own set of folders and files
  - Users can switch between workspaces easily
  - Workspace data is persisted between sessions

### Improved

- **UI Improvements**:
  - Enhanced workspace manager modal with clear visual hierarchy
  - Improved action buttons with distinct colors for better visibility
  - Fixed styling issues with workspace item display

## [1.0.6] - 2025-05-13

### Added:

- `TaskTypeSelector.tsx` feature:

  - Allows users to select and manage task types
  - Users can create custom task types with specific prompts
  - Task types are stored in localStorage for persistence
  - UI improvements for better user experience

- `CustomTaskTypeModal.tsx` feature:

  - Modal for creating and editing custom task types
  - Users can define task type names and associated prompts
  - Improved error handling for invalid inputs

- Task type selection dropdown in the sidebar
- Default task types (None, Feature, Refactor, Question, Debug)
- Custom task type creation and management
- Persistent storage of task types in localStorage
- Task-specific prompts that automatically populate the instructions area
- UI improvements and error handling for the task type system

### Technical Details:

- Added `TaskTypeSelector` component to manage task type selection
- Created `CustomTaskTypeModal` for adding/editing custom task types
- Implemented proper state management for task types
- Fixed error handling to prevent undefined object references
- Added localStorage integration for persistence across sessions

## [1.0.5] - 2025-05-10

### Improved

- **Tokenization Accuracy and Consistency:**
  - Standardized token counting to use the `o200k_base` encoding across the application.
  - The displayed token count now accurately reflects the entire formatted output, including file contents, file tree (if enabled), user instructions, and all formatting tags.

### Fixed

- Resolved an issue where the token count was not accurately reflecting the entire formatted output.

### Changed

- Refactored token counting mechanism:
  - The renderer process (`src/App.tsx`) now prepares the complete string for copying.
  - This string is then sent to the main process (`electron/main.js`) via an IPC channel (`get-token-count`).
  - The main process performs the tokenization using the `countTokens` function from `electron/file-processor.js`, ensuring consistent use of the `o200k_base` encoder.

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
