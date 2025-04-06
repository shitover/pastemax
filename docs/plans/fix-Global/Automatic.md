Below is a very detailed markdown checklist that breaks down every single story and task required to implement the changes. Each task is scoped as a one‑story‑point item with an unchecked checkbox so that a competent AI coding agent can work through them step by step.

---

# Detailed Implementation Checklist

---

## Story 1: Persist Global Ignore Mode State and Custom Ignores

- [ ] **Verify LocalStorage Key for Ignore Mode**
  - [ ] Confirm that the key `"pastemax-ignore-mode"` is used in the `useIgnorePatterns` hook (File: `src/hooks/useIgnorePatterns.ts`) to save and retrieve the current ignore mode.
  - [ ] Check that the initial state is correctly set using the value from localStorage.

- [ ] **Ensure `setIgnoreMode` Persists Mode Changes**
  - [ ] In `src/hooks/useIgnorePatterns.ts`, review the `setIgnoreMode` function:
    - Example signature:
      ```typescript
      const setIgnoreMode = (mode: IgnoreMode): void => { ... }
      ```
  - [ ] Confirm that this function calls `localStorage.setItem('pastemax-ignore-mode', mode)` before updating the state.

- [ ] **Persist Custom Ignores to LocalStorage**
  - [ ] Verify that the custom ignore patterns are retrieved from localStorage under `"pastemax-custom-ignores"` during hook initialization.
  - [ ] In the custom ignores state initializer, ensure parsing is robust:
    - Example snippet:
      ```typescript
      const [customIgnores, _setCustomIgnores] = useState<string[]>(() => {
        const saved = localStorage.getItem('pastemax-custom-ignores');
        return saved ? JSON.parse(saved) : [];
      });
      ```
  - [ ] Confirm that any update via `setCustomIgnores` triggers a corresponding `localStorage.setItem` update.
  - [ ] **Normalize Custom Ignores Before Saving**
    - [ ] Add logic to trim and (optionally) sort the custom ignore strings before storing.

---

## Story 2: Ensure Custom Global Ignores Are Applied in the Backend

- [ ] **Verify IPC Parameter Passing in Renderer**
  - [ ] In `src/hooks/useIgnorePatterns.ts` within `handleViewIgnorePatterns`, ensure the IPC call includes customIgnores when `ignoreMode` is `'global'`:
    - Check that:
      ```typescript
      customIgnores: ignoreMode === 'global' ? customIgnores : []
      ```
      is correctly sent via `ipcRenderer.invoke('get-ignore-patterns', { ... })`.

- [ ] **Confirm Composite Cache Key in Backend Includes Custom Ignores**
  - [ ] In `main.js`, within the `loadGitignore` function, check that the cache key is generated as:
    ```javascript
    const cacheKey = `${rootDir}:${mode}:${JSON.stringify(customIgnores)}`;
    ```
  - [ ] **Normalize Custom Ignores for Cache Key**
    - [ ] Modify the code to sort and trim the `customIgnores` array before stringifying:
      - Example snippet:
        ```javascript
        const normalizedCustomIgnores = customIgnores.map(p => p.trim()).sort();
        const cacheKey = `${rootDir}:${mode}:${JSON.stringify(normalizedCustomIgnores)}`;
        ```

- [ ] **Implement Cache Invalidation if Custom Ignores Change**
  - [ ] In `main.js`, before creating a new ignore filter in global mode, check if a cache entry exists with the new composite key.
  - [ ] If not, or if the custom list has changed, explicitly delete the old cache entry:
    - Example:
      ```javascript
      if (ignoreCache.has(cacheKey)) {
        ignoreCache.delete(cacheKey);
      }
      ```

- [ ] **Test That Backend Filter Incorporates Custom Ignores**
  - [ ] Validate through logging that the global ignore filter includes patterns from `excludedFiles` combined with the user’s custom ignores.

---

## Story 3: Correct loadGitignore Behavior for Automatic vs. Global Mode

- [ ] **Always Add Default Patterns in loadGitignore**
  - [ ] In `main.js` within `loadGitignore`, confirm that the `defaultPatterns` array is defined and added before branching into mode‑specific logic.
  - [ ] Ensure that this is done regardless of the value of `mode`.

- [ ] **Update Global Mode Branch**
  - [ ] In the `if (mode === 'global')` branch:
    - [ ] First, add the `defaultPatterns`:
      ```javascript
      ig.add(defaultPatterns);
      ```
    - [ ] Then, add global excluded files (`excludedFiles`) and the normalized custom ignores:
      ```javascript
      const globalPatterns = [...excludedFiles, ...normalizedCustomIgnores];
      ig.add(globalPatterns);
      ```
    - [ ] Update console logs to indicate the number of default patterns and global patterns added.
  
- [ ] **Update Automatic Mode Branch**
  - [ ] In the automatic mode branch (else case):
    - [ ] Add only the `defaultPatterns`.
    - [ ] Do not add global `excludedFiles`; instead, proceed to collect patterns from repository `.gitignore` files:
      ```javascript
      // Collect .gitignore patterns recursively
      const gitignoreMap = await collectGitignoreMapRecursive(rootDir, rootDir);
      ```
    - [ ] Confirm that the ignore filter in automatic mode reflects repository-specific ignore rules.

- [ ] **Review Logging in loadGitignore**
  - [ ] Ensure that log messages clearly distinguish which patterns are added in global versus automatic mode.

---

## Story 4: Cache Invalidation for Ignore Filter

- [ ] **Review Composite Cache Key Creation**
  - [ ] In `main.js` within `loadGitignore`, verify that the composite key now uses the normalized custom ignores.
  - [ ] Confirm that any change to the custom ignore list produces a different cache key.

- [ ] **Implement Explicit Cache Invalidation**
  - [ ] If a new composite key is generated, remove any old cache entries that no longer match.
  - [ ] Add logging to indicate when a cache invalidation occurs.

- [ ] **Document Potential Performance Impacts**
  - [ ] Comment in the code the reasoning behind invalidating the cache and any potential tradeoffs.

---

## Story 5: Verify IPC Communication for Ignore Patterns

- [ ] **Validate IPC Invocation Parameters in Renderer**
  - [ ] In `src/hooks/useIgnorePatterns.ts`, ensure the call to `ipcRenderer.invoke('get-ignore-patterns', {...})` includes:
    - `folderPath`
    - `mode`
    - `customIgnores` (when in global mode)
  
- [ ] **Check Backend Handler in main.js**
  - [ ] In the `ipcMain.handle("get-ignore-patterns", ...)` handler, verify that:
    - The received `customIgnores` parameter is used to compute the cache key.
    - The correct branch (global vs. automatic) is executed.
  
- [ ] **Ensure Correct Response is Sent Back**
  - [ ] Confirm that the ignore patterns object returned from `loadGitignore` includes:
    - For global mode: an object with a `global` key containing the global patterns.
    - For automatic mode: an object with a `gitignoreMap` key.
  
- [ ] **Validate UI Updates in IgnorePatternsViewer**
  - [ ] In `src/components/IgnorePatternsViewer.tsx`, check that the component displays:
    - Global exclusions when in global mode.
    - Repository-specific .gitignore rules when in automatic mode.
  - [ ] Ensure that the search term filtering works on the patterns displayed.

---

## Story 6: Documentation & Logging Improvements

- [ ] **Update Comments in useIgnorePatterns Hook**
  - [ ] Add detailed comments explaining:
    - How `ignoreMode` is persisted.
    - How custom ignores are stored and updated.
  
- [ ] **Enhance Logging in loadGitignore (main.js)**
  - [ ] Log the counts for:
    - Number of default patterns added.
    - Number of global patterns added (from `excludedFiles` and custom ignores) in global mode.
    - Number of repository-specific patterns loaded in automatic mode.
  
- [ ] **Comment on Cache Key Normalization**
  - [ ] Document why normalization (e.g., sorting and trimming) is applied to the custom ignores.

---

## Story 7: Ensure Default Patterns Consistency Across Modes

- [ ] **Verify the Default Patterns Array**
  - [ ] In `main.js` inside `loadGitignore`, check that the same `defaultPatterns` array is defined and used in both branches.
  
- [ ] **Consider Refactoring Default Patterns**
  - [ ] If the default patterns are duplicated, refactor them into a separate module or constant file (e.g., `src/config/defaultIgnorePatterns.js`).
  
- [ ] **Update Code Comments**
  - [ ] Document that default patterns are always applied regardless of mode.

---

## Story 8: Verify Integration and User Experience

- [ ] **Test Global Ignore Mode Persistence**
  - [ ] Simulate a user selecting global mode, then reload the application and verify that the mode remains global.
  
- [ ] **Test Custom Ignore Pattern Addition**
  - [ ] In the Ignore Patterns Viewer UI, add a new custom ignore pattern.
  - [ ] Verify that it is saved (check localStorage) and sent to the backend.
  
- [ ] **Test Mode Switching**
  - [ ] Toggle between global and automatic modes and verify that:
    - The backend ignore filter updates accordingly.
    - The UI displays the correct patterns.
  
- [ ] **Verify File Loading Behavior**
  - [ ] Ensure that the file scanning respects the ignore filter:
    - In global mode, files matching excludedFiles and custom ignores are skipped.
    - In automatic mode, repository .gitignore patterns are applied.
  
- [ ] **Confirm UI Feedback**
  - [ ] Check that status messages (e.g., “Loading files...”, “Processing files…”) correctly reflect the mode and any errors if patterns fail to load.

---

This checklist covers every detail from persisting state in the renderer to ensuring the backend logic in `loadGitignore` respects the correct mode and custom ignore patterns. Each step is designed to ensure the global ignore mode works as intended across reloads and that custom ignore patterns provided by the user are actually used in the filtering logic.