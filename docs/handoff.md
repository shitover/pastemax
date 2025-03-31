# Handoff: Fixing Hierarchical .gitignore Handling

## 1. Problem Description

The application currently struggles to correctly handle `.gitignore` files in repositories with nested sub-repositories or complex directory structures containing multiple `.gitignore` files. Specifically:

*   The ignore patterns collected might not respect the directory hierarchy as intended by Git.
*   When viewing the applied ignore rules via the "View Ignore Patterns" modal (`IgnorePatternsViewer.tsx`), the "Repository Rules" section often shows "0 patterns" or is empty, even when `.gitignore` files exist and contain rules within the loaded project structure.
*   Initial debugging indicated that the backend was returning an empty list for `.gitignore` rules (`gitignoreHierarchy: []`) to the frontend viewer.

## 2. Goal

The primary goal is to refactor the `.gitignore` processing logic to:

*   Correctly identify and parse all relevant `.gitignore` files within the loaded project directory, respecting their hierarchical context (rules in subdirectories apply relative to that subdirectory).
*   Accurately apply these hierarchical rules when filtering files during the directory scan (`readFilesRecursively`).
*   Properly cache the collected hierarchical rules for performance.
*   Display the collected hierarchical rules correctly in the `IgnorePatternsViewer` modal, showing which rules come from which `.gitignore` file (relative to the project root).

## 3. Approach Taken &amp; Current Status

1.  **Initial Plan (Discarded):** The first plan considered (`docs/plans/fix_gitignore_global.md`) involved transforming all patterns into global patterns. This was identified as incorrect for achieving true hierarchical gitignore behavior.
2.  **Revised Plan (Hierarchical):** A new plan was created (`docs/plans/fix-gitignore-hierarchy.md`) focusing on collecting patterns hierarchically and applying them relative to their origin directory.
3.  **Implementation Attempt 1 (`collectGitignoreHierarchy`):**
    *   A function `collectGitignoreHierarchy` was implemented in `main.js` to collect patterns.
    *   **Issue:** This function incorrectly walked *up* the directory tree instead of recursively scanning *downwards*, resulting in it only finding `.gitignore` files in the immediate directory passed to it, not in subdirectories.
    *   Debugging confirmed this function returned an empty hierarchy (`[]`) when called for the root directory, explaining the empty viewer.
4.  **Implementation Attempt 2 (`collectGitignoreMapRecursive` - In Progress):**
    *   A new function `collectGitignoreMapRecursive` was designed to correctly scan *downwards* recursively from a starting directory. It aims to return a `Map` where keys are directory paths and values are the patterns found in the `.gitignore` file within that directory.
    *   **Current Blocker:** Attempts to replace `collectGitignoreHierarchy` with `collectGitignoreMapRecursive` in `main.js` using the `apply_diff` tool have repeatedly failed due to matching issues, even after reading the full file content. The next step was to attempt using `write_to_file` to overwrite `main.js` with the version containing the new function.

## 4. Next Steps (If Resuming Implementation)

1.  **Replace Collection Function:** Successfully replace `collectGitignoreHierarchy` with `collectGitignoreMapRecursive` in `main.js`. Using `write_to_file` with the complete intended content might be necessary if `apply_diff` continues to fail.
2.  **Update `loadGitignore`:** Modify `loadGitignore` in `main.js` to:
    *   Call the new `collectGitignoreMapRecursive(rootDir, rootDir)` function.
    *   Process the returned `Map`. For each entry (directory path -> patterns), calculate the relative path of the patterns *with respect to their directory* and add them to the `ignore` instance (`ig`).
    *   Store the collected `Map` in the cache under a key like `gitignoreMap` instead of `gitignoreHierarchy`.
3.  **Update `get-ignore-patterns` Handler:** Modify the IPC handler in `main.js` to:
    *   Retrieve the cached data.
    *   Return the `patterns` object containing the `gitignoreMap`.
    *   Remove the temporary debugging/force-reload logic added previously.
4.  **Update `IgnorePatternsViewer.tsx`:** Modify the frontend component to:
    *   Expect `patterns.gitignoreMap` (a Map) instead of `patterns.gitignoreHierarchy` (an array).
    *   Iterate over the `gitignoreMap`. For each entry, display a separate `PatternSection` showing the patterns, using the Map key (directory path) to display the relative path in the section title/subtitle.
5.  **Testing:** Thoroughly test the changes with various repository structures, including nested repositories and different `.gitignore` rule types, to ensure correctness and performance.