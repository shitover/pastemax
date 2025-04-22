### 📜 Implementation Stories & One‑Story‑Point (1 SP) Task Checklist

_All tasks are deliberately granular (≈ 1 SP each) so an autonomous coding agent can tick them off in order. Every checkbox is **unchecked** (`[ ]`) for tracking._

---

## Story 1 — 🌐 Global "set‑ignore‑mode" IPC listener exists from app start

| #                                                                                                                                          | Task |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| [x] **1.1** Open `electron/main.js` and scroll to the top of the "IPC HANDLERS" section.                                                   |
| [x] **1.2** Verify that `ipcMain.eventNames()` does **not** already contain `"set-ignore-mode"`.                                           |
| [x] **1.3** Insert a `if (!ipcMain.eventNames().includes('set-ignore-mode')) { … }` guard.                                                 |
| [x] **1.4** Inside the guard, register `ipcMain.on('set-ignore-mode', async (_event, mode) => {…})`.                                       |
| [x] **1.5** Inside the handler, validate `mode` strictly equals `"automatic"` **or** `"global"`; early‑return otherwise.                   |
| [x] **1.6** Assign `currentIgnoreMode = mode`.                                                                                             |
| [x] **1.7** `console.log` the change with the exact string `[IgnoreMode] switched → ${mode}`.                                              |
| [x] **1.8** Call `.clear()` on `ignoreCache`, `fileCache`, and `fileTypeCache`.                                                            |
| [x] **1.9** If `currentWatcher` is truthy, wrap `await currentWatcher.close()` in `try/catch`, then set `currentWatcher = null`.           |
| [x] **1.10** Iterate over `BrowserWindow.getAllWindows()` and `.send('ignore-mode-updated', mode)` on each `webContents` (check for null). |
| [x] **1.11** Remove the now‑redundant _nested_ `"set-ignore-mode"` listener inside the `request-file-list` block completely.               |
| [x] **1.12** Re‑run TypeScript/ESLint (if configured) to ensure no unused imports surfaced.                                                |

---

## Story 2 — 🔗 Expose "ignoreSettingsModified" flag from the React hook

| #                                                                                                           | Task |
| ----------------------------------------------------------------------------------------------------------- | ---- |
| [x] **2.1** Open `src/hooks/useIgnorePatterns.ts`.                                                          |
| [x] **2.2** Confirm `ignoreSettingsModified` state already exists (`const [ignoreSettingsModified, …]`).    |
| [x] **2.3** Ensure it is **returned** in the object literal at the very bottom of the hook.                 |
| [x] **2.4** If absent, add `ignoreSettingsModified,` and `resetIgnoreSettingsModified,` to the return list. |
| [x] **2.5** Make sure any VS Code IntelliSense errors disappear after save.                                 |

---

## Story 3 — 🖼️ Modal tells App whether anything changed

| #                                                                                                                 | Task |
| ----------------------------------------------------------------------------------------------------------------- | ---- | ------------------------- |
| [x] **3.1** Open `src/components/IgnorePatternsViewer.tsx`.                                                       |
| [x] **3.2** Augment `IgnorePatternsViewerProps` with `ignoreSettingsModified: boolean`.                           |
| [x] **3.3** Update all current usages/imports to pass the new prop (TypeScript will flag them).                   |
| [x] **3.4** At top of component body, destructure the new prop.                                                   |
| [x] **3.5** Locate `handleClose()` and create `const modeChanged = initialIgnoreModeRef.current !== ignoreMode;`. |
| [x] **3.6** Next, build `const changesMade = modeChanged                                                          |      | ignoreSettingsModified;`. |
| [x] **3.7** Call `onClose(changesMade);` (instead of previous boolean).                                           |
| [x] **3.8** Delete any outdated comments that mention only "modeChanged".                                         |

---

## Story 4 — ⚡ App reload occurs **after** modal closes (only if changes made)

| #                                                                                                                         | Task |
| ------------------------------------------------------------------------------------------------------------------------- | ---- |
| [x] **4.1** Open `src/App.tsx`.                                                                                           |
| [x] **4.2** Import `useCallback` if not already used for the new wrapper.                                                 |
| [x] **4.3** Create `const handleIgnoreViewerClose = useCallback((changesMade?: boolean) => { … }, [closeIgnoreViewer]);`. |
| [x] **4.4** Inside wrapper, first invoke `closeIgnoreViewer();`.                                                          |
| [x] **4.5** If `changesMade` is falsy, simply `return;`.                                                                  |
| [x] **4.6** Call `setProcessingStatus({status:'processing', message:'Applying ignore mode…'});`.                          |
| [x] **4.7** `setTimeout(() => window.location.reload(), 50);` to ensure one paint cycle.                                  |
| [x] **4.8** Pass `handleIgnoreViewerClose` (not `closeIgnoreViewer`) to `<IgnorePatternsViewer onClose={…}>`.             |
| [x] **4.9** Provide the prop `ignoreSettingsModified={ignoreSettingsModified}` to the modal.                              |

---

## Story 5 — 📨 Suppress premature auto‑reload when backend broadcasts mode

| #                                                                                            | Task |
| -------------------------------------------------------------------------------------------- | ---- |
| [x] **5.1** In `src/App.tsx`, locate `handleBackendModeUpdate`.                              |
| [x] **5.2** Replace its body with only a `console.info` acknowledging receipt _(no reload)_. |
| [x] **5.3** Remove any reference to `window.location.reload()` in that function.             |
| [x] **5.4** Ensure no other code path triggers reload on `"ignore-mode-updated"`.            |

---

## Story 6 — 📝 Status message wording update

| #                                                                                                                                            | Task |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| [x] **6.1** Still in `handleIgnoreViewerClose`, confirm message text is exactly “Applying ignore mode…”.                                     |
| [x] **6.2** Search entire repo for the literal `"Processing files ("` status emit string in `main.js`; keep as‑is (only UI wording changes). |
| [x] **6.3** Search `src/App.tsx` for `"Processing files"` and ensure it remains for normal scans (not mode switch).                          |

---

## Story 7 — 🔧 Changing custom ignores automatically sets “settings modified” flag

_(Already implemented but checklist ensures integrity.)_

| #                                                                                                             | Task |
| ------------------------------------------------------------------------------------------------------------- | ---- |
| [x] **7.1** Open `src/hooks/useIgnorePatterns.ts`.                                                            |
| [x] **7.2** Locate `setCustomIgnores` wrapper implementation.                                                 |
| [x] **7.3** Verify `localStorage.setItem('pastemax-ignore-settings-modified','true')` exists inside it.       |
| [x] **7.4** Verify `_setIgnoreSettingsModified(true);` follows immediately after.                             |
| [x] **7.5** Confirm the hook sends `window.electron.ipcRenderer.send('clear-ignore-cache')` when in Electron. |

---

## Story 8 — 🧩 Prop drilling & TypeScript hygiene

| #                                                                                                            | Task |
| ------------------------------------------------------------------------------------------------------------ | ---- |
| [x] **8.1** Update the import statement for `IgnorePatternsViewer` in `src/App.tsx` to include the new prop. |
| [x] **8.2** Run `tsc --noEmit` (or IDE diagnostics) and resolve any type errors about missing props.         |
| [x] **8.3** Re‑compile the renderer (e.g., `npm run dev`) to ensure no runtime errors.                       |

---

## Story 9 — 📑 Documentation & inline comments

| #                                                                                                                                 | Task |
| --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| [ ] **9.1** Add a short JSDoc comment above the new global `ipcMain.on('set-ignore-mode')` block describing its responsibilities. |
| [ ] **9.2** Document `handleIgnoreViewerClose` in `App.tsx` with why reload is deferred.                                          |
| [ ] **9.3** Update any README or dev‑notes that previously said “mode switch forces immediate reload”.                            |

---

## Story 10 — 🚦 Regression sanity checks (manual, no test code)

_(Though unit tests are out‑of‑scope, a coding agent should still run the app.)_

| #                                                                                                                                         | Task |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| [ ] **10.1** Start Electron with `npm run dev` and confirm the app boots without a selected folder.                                       |
| [ ] **10.2** Open _Ignore Filters_ modal; switch toggle; close modal; confirm **no** reload occurs (no changes).                          |
| [ ] **10.3** Switch toggle again, click **X**; confirm status message shows _Applying ignore mode…_ then app reloads once.                |
| [ ] **10.4** Without selecting a folder, switch modes; open DevTools console in main process to ensure `currentIgnoreMode` mutated.       |
| [ ] **10.5** Select a folder; scan completes; open modal; add a custom ignore; close modal; expect one reload with updated status string. |

---

### ✅ Completion Criteria

- All checkboxes above are ticked during implementation.
- `currentIgnoreMode` toggles correctly before any folder is opened.
- App reload occurs **exactly once** after the modal closes when changes occur.
- Status message reads “Applying ignore mode…” during that reload.
- Adding or removing custom patterns also triggers the same flow.
