Below is a very detailed markdown checklist broken down into one-story-point tasks for every story in this project plan. Each task is represented by an unchecked checkbox. This checklist covers all modifications in the main process, the renderer/UI, data structures/interfaces, styling, and documentation. Use this list as a step‐by‐step guide for the autonomous AI Coding Agent.

---

# Global vs. Automatic Ignore Mode Feature Implementation Checklist

## 1. Main Process (main.js) Modifications

### 1.1. Update the `loadGitignore` Function

- [ ] **Add New Parameters:**  
  - Modify the function signature of `loadGitignore` to accept two new parameters:  
    - `mode` (type: `'automatic' | 'global'`, defaulting to `'automatic'`)
    - `customIgnores` (type: `string[]`, defaulting to an empty array)
- [ ] **Create Composite Cache Key:**  
  - In `loadGitignore`, generate a cache key using the normalized `rootDir`, the chosen `mode`, and `JSON.stringify(customIgnores)`.
- [ ] **Check Cache Using Composite Key:**  
  - Verify if the ignore filter for the composite key exists in `ignoreCache` and return it if available.
- [ ] **Global Mode – Build Global Ignore Filter:**  
  - If `mode` is `'global'`:
    - [ ] Combine `excludedFiles` and `customIgnores` into a single array (globalPatterns).
    - [ ] Initialize the ignore filter with `ig.add(globalPatterns)`.
    - [ ] Log a message showing the global ignore filter creation along with the patterns used.
    - [ ] Cache the ignore filter and the patterns using the composite cache key, storing the patterns in a structure such as `{ global: globalPatterns }`.
    - [ ] Return the ignore filter.
- [ ] **Automatic Mode – Preserve Gitignore Scanning:**  
  - If `mode` is `'automatic'`:
    - [ ] Remove any redundant default patterns (if present) from previous implementations.
    - [ ] Add `excludedFiles` to the ignore filter with `ig.add(excludedFiles)` and log the addition.
    - [ ] Call `collectGitignoreMapRecursive` to obtain a map of .gitignore patterns.
    - [ ] For each entry in the gitignore map:
      - [ ] Generate `patternsToAdd` by prepending directory context when necessary.
      - [ ] Add these patterns to the ignore filter with `ig.add(patternsToAdd)`.
      - [ ] Keep a running total of the added patterns and log the count.
    - [ ] Cache the ignore filter using the composite key, storing the patterns in a structure like `{ gitignoreMap: ... }`.
    - [ ] Return the ignore filter.

### 1.2. Update the IPC Handler for `get-ignore-patterns`

- [ ] **Change Parameter Format:**  
  - Modify the IPC handler to expect an object instead of a string. The object should have:
    - `folderPath` (string)
    - `mode` (either `'automatic'` or `'global'`, defaulting to `'automatic'`)
    - `customIgnores` (string[], defaulting to an empty array)
- [ ] **Destructure and Validate Options:**  
  - In the IPC handler, destructure the object to extract `folderPath`, `mode`, and `customIgnores`.  
  - Ensure that `folderPath` is provided; if not, return an error.
- [ ] **Call the Updated `loadGitignore`:**  
  - Pass `folderPath`, `mode`, and `customIgnores` to `loadGitignore`.
- [ ] **Retrieve and Return Cached Patterns:**  
  - Use the composite key (constructed in the same way as in `loadGitignore`) to retrieve cached patterns.
  - Log the mode and folder details before returning.
  - Return the patterns or an error if retrieval fails.

---

## 2. Renderer Process (UI) Modifications

### 2.1. Update the Ignore Patterns Viewer Modal (src/components/IgnorePatternsViewer.tsx)

- [ ] **Add Ignore Mode Toggle Control:**  
  - Create a new state variable `ignoreMode` (type: `'automatic' | 'global'`, defaulting to `'automatic'`).
  - [ ] Add a UI control (e.g., a segmented button or toggle switch) at the top of the modal with two buttons:
    - One labeled “Automatic Gitignore”
    - One labeled “Global Ignore”
  - [ ] Implement onClick handlers so that selecting one button sets `ignoreMode` and visually deactivates the other.
- [ ] **Implement Custom Global Ignores Section:**  
  - [ ] When `ignoreMode` is `'global'`, render a new section below the toggle.
  - [ ] Create a state variable `customIgnoreInput` for the text input and `customIgnores` (an array of strings).
  - [ ] Add an input field with a placeholder (e.g., “Enter additional ignore pattern”).
  - [ ] Add an “Add Pattern” button that, when clicked:
    - Trims the input.
    - Appends the pattern to `customIgnores`.
    - Clears the input field.
  - [ ] Render a list (e.g., `<ul>`) displaying each custom ignore pattern.
- [ ] **Update the Fetch/Invocation Logic:**  
  - Modify the `handleViewIgnorePatterns` function so that when the user triggers the view:
    - It invokes `window.electron.ipcRenderer.invoke('get-ignore-patterns', options)` with an object that contains:
      - `folderPath`: the currently selected folder.
      - `mode`: the current value of `ignoreMode`.
      - `customIgnores`: if `ignoreMode` is `'global'`, pass the `customIgnores` array; otherwise, pass an empty array.
  - [ ] Ensure error handling and state updates are maintained.
  - [ ] Log debugging information that includes the current mode and custom ignores.

### 2.2. Update the `useIgnorePatterns` Hook (src/hooks/useIgnorePatterns.ts)

- [ ] **Add New State Variables in the Hook:**  
  - Add state for `ignoreMode` (defaulting to `'automatic'`).
  - Add state for `customIgnores` (defaulting to an empty array).
- [ ] **Expose New States and Setters:**  
  - Update the hook’s return object to include `ignoreMode`, `setIgnoreMode`, `customIgnores`, and `setCustomIgnores` (if needed).
- [ ] **Ensure Updated Invocation in the Hook:**  
  - Modify the hook’s `handleViewIgnorePatterns` function to use the new states when invoking the IPC call.

---

## 3. Data Structure and Interface Updates

- [ ] **Update IPC Parameter Types:**  
  - Update TypeScript definitions and JSDoc comments for the IPC channel `get-ignore-patterns` to reflect that it now expects an object with:
    - `folderPath`: string
    - `mode`: `'automatic' | 'global'`
    - `customIgnores`: string[]
- [ ] **Update Caching Key Logic:**  
  - Confirm that the caching in `loadGitignore` uses a composite key based on the folder path, mode, and custom ignores.
- [ ] **Update Documentation:**  
  - Update inline documentation in main.js and related files to explain the new parameters and mode behavior.

---

## 4. CSS and UI Styling Adjustments (src/styles/index.css)

- [ ] **Style the Ignore Mode Toggle Control:**  
  - Create a new CSS class (e.g., `.ignore-mode-toggle`) for the container of the toggle buttons.
  - [ ] Define styles for the active state of the toggle buttons.
  - [ ] Ensure the toggle control matches the modern theme and integrates with existing header styles.
- [ ] **Style the Custom Global Ignores Section:**  
  - Create styles for the input field (e.g., `.custom-global-ignores input`) to match current input styling.
  - [ ] Style the “Add Pattern” button to match the primary button theme.
  - [ ] Style the list (e.g., `<ul>` and `<li>`) displaying custom ignore patterns.
- [ ] **Ensure Consistent Layout:**  
  - Verify that the new elements do not disrupt the overall modal layout.
  - [ ] Adjust margins/padding as needed for a balanced appearance.

---

## 5. Documentation and Comments

- [ ] **Update Function Comments in main.js:**  
  - Add comments to `loadGitignore` explaining the new parameters `mode` and `customIgnores`.
  - [ ] Document the caching mechanism and how the composite key is built.
- [ ] **Update IPC Handler Comments:**  
  - Clarify in comments the expected structure of the object passed to `get-ignore-patterns`.
- [ ] **Update Comments in the Ignore Patterns Viewer Component:**  
  - Document the new toggle functionality and the purpose of the custom global ignore section.
- [ ] **Update the Hook Documentation:**  
  - Ensure the new state variables (`ignoreMode` and `customIgnores`) are documented in the `useIgnorePatterns` hook.

---

## 6. Integration and Validation Considerations

- [ ] **Validate Mode Switching:**  
  - Ensure that when the user switches between “Automatic Gitignore” and “Global Ignore,” the view updates immediately to show the correct patterns and settings.
- [ ] **Confirm Global Mode Behavior:**  
  - In global mode, verify that the ignore filter is built solely from `excludedFiles` plus any user-added custom ignores.
- [ ] **Confirm Automatic Mode Behavior:**  
  - In automatic mode, verify that the original .gitignore scanning functionality remains intact.
- [ ] **Test Cache Differentiation:**  
  - Validate that changes in mode or custom ignore entries create new cache entries and do not reuse the wrong ignore filter.
- [ ] **Persist User Preferences (Optional):**  
  - Consider saving the selected ignore mode and custom ignores to localStorage so that user settings persist between sessions.
- [ ] **Review Console Logs:**  
  - Ensure that logging in both main.js and the UI components provides clear debugging information for the new functionality.

---

This exhaustive checklist covers every detail required for implementing the new feature. Each checkbox represents a one-story-point task that must be completed. This list should enable an autonomous AI Coding Agent to proceed with the implementation without missing any critical details.