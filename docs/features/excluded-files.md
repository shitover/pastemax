# Understanding File Exclusions in PasteMax

PasteMax employs a flexible system to help you focus on relevant files by excluding common project noise, binaries, and user-defined patterns. This document explains how it works and how you can customize it.

## Core Concepts

- **Ignore Modes:** PasteMax has two primary ignore modes, selectable via the "Ignore Patterns Viewer" (accessible from the gear icon or a button near the file list):

  - **Automatic Mode:** This mode uses a set of built-in default patterns (see `DEFAULT_PATTERNS` below) and also respects the `.gitignore` files found in your project. This is often the best mode for working within version-controlled repositories.
  - **Global Mode:** This mode uses the built-in `DEFAULT_PATTERNS` plus an additional list of `GlobalModeExclusion` patterns (see below), along with any "Custom Global Ignores" you define in the Ignore Patterns Viewer. This mode does _not_ use `.gitignore` files.

- **Built-in Pattern Lists (in `electron/excluded-files.js`):**

  - `DEFAULT_PATTERNS`: A foundational list of glob patterns (e.g., `.git`, `node_modules`, `dist/`, `*.log`) that are **always active** regardless of the selected ignore mode. These cover common version control, dependency, and build artifact directories/files.
  - `GlobalModeExclusion`: An additional list of glob patterns (e.g., `package-lock.json`, `__pycache__/`) that are applied **only when in Global Mode**. These supplement `DEFAULT_PATTERNS` to provide a broader set of general exclusions.
  - `binaryExtensions`: A list of file extensions (e.g., `.png`, `.jpg`, `.exe`, `.zip`) used to identify files as binary. Binary files are typically not processed for content and may have limited interaction in the UI.

- **User-Defined Patterns:**
  - **`.gitignore` files:** Standard Git ignore files. Used only in **Automatic Mode**.
  - **Custom Global Ignores:** Patterns you can add via the "Ignore Patterns Viewer". These are applied only in **Global Mode** and are saved locally in your application settings.

## How Exclusions Affect the File List

1.  When you load a folder, PasteMax filters the file list based on the active ignore mode and the relevant patterns.
2.  Files matching `DEFAULT_PATTERNS` (and `GlobalModeExclusion` if in Global Mode) are often marked with an "Excluded" badge and may appear with reduced opacity.
3.  You can usually still manually select an "excluded by default" file if you need to include it for a specific operation.
4.  Files ignored by `.gitignore` (in Automatic Mode) or "Custom Global Ignores" (in Global Mode) will typically be completely hidden from the file list.

## Customizing Exclusions

- **For most users, customization should be done via the "Ignore Patterns Viewer" in the application:**

  - Switch between "Automatic" and "Global" modes.
  - Add or remove "Custom Global Ignores" when in Global Mode.
  - View the active patterns being applied.

- **Modifying Built-in Defaults (Advanced):**
  If you need to change the fundamental `DEFAULT_PATTERNS`, `GlobalModeExclusion`, or `binaryExtensions` for all your projects, you can edit the `electron/excluded-files.js` file. This is generally not recommended unless you have a specific, persistent need.

  The structure of `electron/excluded-files.js` is:

  ```javascript
  // electron/excluded-files.js

  // Universal default patterns (always active)
  const DEFAULT_PATTERNS = [
    '.git',
    'node_modules/**',
    // ... many more common patterns
  ];

  // Additional patterns for Global Mode only
  const GlobalModeExclusion = [
    'package-lock.json',
    '__pycache__/',
    // ... more project-specific common patterns
  ];

  // Extensions to identify binary files
  const binaryExtensions = [
    '.png',
    '.jpg',
    '.zip',
    // ... many more binary extensions
  ];

  module.exports = {
    DEFAULT_PATTERNS,
    GlobalModeExclusion,
    binaryExtensions,
  };
  ```

## Benefits of the System

- **Cleaner Workspace:** Focus on your source code and relevant project files.
- **Performance:** Avoids processing unnecessary files, especially large binaries or dependency folders.
- **Flexibility:** Choose the ignore strategy (Automatic or Global) that best suits your task.
- **Customizable:** Tailor exclusions to your specific needs via the UI or by editing defaults (if necessary).

For a more detailed technical breakdown of the ignore logic, see `electron/ignore-logic.md`.
