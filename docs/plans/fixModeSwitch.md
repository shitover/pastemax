## Story 1: Refactor `useIgnorePatterns` Hook

> Ensure only user‐initiated changes flip the "settings modified" flag.

- [x] Open `src/hooks/useIgnorePatterns.ts`.
- [x] Remove any code in `handleViewIgnorePatterns` that writes to `pastemax-ignore-settings-modified` in localStorage.
- [x] Verify that **only** `setIgnoreMode` writes
  ```ts
  localStorage.setItem('pastemax-ignore-settings-modified', 'true');
  _setIgnoreSettingsModified(true);
  ```
- [x] Verify that **only** `setCustomIgnores` writes the same flag.
- [x] Ensure `resetIgnoreSettingsModified()` is the sole method to clear localStorage.
- [x] Save and confirm the hook compiles without errors.

---

## Story 2: Snapshot Initial State in `IgnorePatternsViewer`

> Capture both `ignoreMode` and `ignoreSettingsModified` _once_ when modal opens.

- [x] Open `src/components/IgnorePatternsViewer.tsx`.
- [x] Add at the top of the component, alongside `initialIgnoreModeRef`:
  ```ts
  const initialIgnoreSettingsModifiedRef = useRef(ignoreSettingsModified);
  ```
- [x] Locate the "on‑open" effect:
  ```ts
  useEffect(() => {
    if (isOpen) {
      initialIgnoreModeRef.current = ignoreMode;
    }
  }, [isOpen, ignoreMode]);
  ```
- [x] Change it to:
  ```diff
  useEffect(() => {
    if (isOpen) {
      initialIgnoreModeRef.current = ignoreMode;
  +   initialIgnoreSettingsModifiedRef.current = ignoreSettingsModified;
    }
  -}, [isOpen, ignoreMode]);
  +}, [isOpen]);
  ```
- [x] Save and verify there are no TypeScript or runtime errors.

---

## Story 3: Compute `changesMade` on Close

> Use our snapshots to decide if the user actually changed anything.

- [x] In `IgnorePatternsViewer.tsx`, locate `handleClose`:
  ```ts
  const handleClose = () => {
    const modeChanged = initialIgnoreModeRef.current !== ignoreMode;
    const changesMade = modeChanged || ignoreSettingsModified;
    onClose(changesMade);
  };
  ```
- [x] Update it to:
  ```diff
  const handleClose = () => {
  - const modeChanged = initialIgnoreModeRef.current !== ignoreMode;
  - const changesMade = modeChanged || ignoreSettingsModified;
  + const modeChanged = initialIgnoreModeRef.current !== ignoreMode;
  + const settingsChanged =
  +   initialIgnoreSettingsModifiedRef.current !== ignoreSettingsModified;
  + const changesMade = modeChanged || settingsChanged;
    onClose(changesMade);
  };
  ```
- [x] (Optional) Insert a `console.debug({ modeChanged, settingsChanged, changesMade })` to verify behavior.
- [x] Remove or comment-out the debug log.
- [x] Save and confirm behavior in dev.

---

## Story 4: Guard Reload in `App.tsx`

> Only send IPC + reload when `changesMade === true`.

- [x] Open `src/App.tsx`.
- [x] Find `handleIgnoreViewerClose` implementation.
- [x] Wrap the logic in:
  ```ts
  const handleIgnoreViewerClose = (changesMade?: boolean) => {
    if (!changesMade) return; // ← skip everything
    closeIgnoreViewer();
    setProcessingStatus({
      status: 'processing',
      message: 'Applying ignore mode…',
    });
    window.electron.ipcRenderer.send('set-ignore-mode', ignoreMode);
    window.electron.ipcRenderer.send('clear-ignore-cache');
    setTimeout(() => window.location.reload(), 1000);
  };
  ```
- [x] Confirm IPC channels match those in `electron/main.js`.
- [x] Save and run to verify that open+close no‑op no longer reloads.

---

## Story 5: Unit Tests for `useIgnorePatterns`

> Verify the hook's state transitions and storage interactions.

- [ ] Create `src/hooks/__tests__/useIgnorePatterns.test.ts`.
- [ ] Mock `localStorage` using `jest.spyOn(window.localStorage, 'setItem')`.
- [ ] Render the hook with `renderHook`.
- [ ] Assert initial `ignoreSettingsModified` matches localStorage.
- [ ] Call `setIgnoreMode('global')` and assert:
  - `_setIgnoreSettingsModified(true)`
  - `localStorage.setItem('pastemax-ignore-settings-modified', 'true')`
- [ ] Call `setCustomIgnores([...])` and assert the same two effects.
- [ ] Call `resetIgnoreSettingsModified()` and assert:
  - `_setIgnoreSettingsModified(false)`
  - `localStorage.setItem('pastemax-ignore-settings-modified', 'false')`
- [ ] Run `npm test` and ensure all assertions pass.

---

## Story 6: Unit Tests for `IgnorePatternsViewer`

> Confirm the viewer only flags changes when appropriate.

- [ ] Create `src/components/__tests__/IgnorePatternsViewer.test.tsx`.
- [ ] Mock `useIgnorePatterns` to control `ignoreMode` and `ignoreSettingsModified`.
- [ ] Render `<IgnorePatternsViewer isOpen onClose={mockFn} …/>`.
- [ ] **Case A:** No toggle, no settings change → click the close overlay → expect `mockFn(false)`.
- [ ] **Case B:** Toggle switch but no custom ignores → click close → expect `mockFn(true)`.
- [ ] **Case C:** No toggle, but `ignoreSettingsModified = true` → click close → expect `mockFn(true)`.
- [ ] Use `@testing-library/react` to fire events and assert onClose calls.
- [ ] Ensure tests cover both clicking the overlay and the "×" button.
- [ ] Run suite and confirm.

---

## Story 7: E2E Tests (Cypress)

> End‑to‑end simulation within the Electron shell.

- [ ] Add or update your Cypress/Electron test setup in `cypress/plugins/index.js`.
- [ ] Write `cypress/integration/ignore_mode.spec.js` with two scenarios:
  1. **Open & Close**:
     - Launch app
     - Click "Ignore Filters" button
     - Verify modal is visible
     - Close modal
     - Assert **no** IPC events (`set-ignore-mode`, `clear-ignore-cache`) were emitted
     - Assert window did **not** reload
  2. **Toggle & Close**:
     - Repeat steps but flip the toggle
     - Close modal
     - Assert both IPC events fired once
     - Assert window reload happened exactly once
- [ ] Stub or spy on `window.electron.ipcRenderer.send` in the test harness.
- [ ] Run `npx cypress open` and confirm both tests pass.

---

## Story 8: Documentation & Comments

> Keep code and docs in sync for future maintainers.

- [ ] In `IgnorePatternsViewer.tsx`, add above the snapshot effect:
  ```tsx
  // Snapshot mode & settings‐modified once on open.
  // Compare on close—no side‑effects on open.
  ```
- [ ] In `README.md` (or your docs folder), update **Ignore Patterns Viewer** section:
  - Describe the new "no‑op on open/close" behavior.
  - Note that only real toggles trigger a reload.
- [ ] Commit documentation changes.

---

## Story 9: Manual QA Across Environments

> Smoke‑test dev and packaged builds on all OSes.

- [ ] **Dev Build**:
  - `npm run start`
  - Open viewer → close → verify no reload
  - Open → toggle → close → verify reload
- [ ] **Packaged Build** (`npm run build && npm run package`):
  - macOS
  - Windows
  - Linux
- [ ] On each:
  - Confirm persisted `ignoreMode` in localStorage after reload
  - Confirm file‐watcher behavior matches selected mode
- [ ] Document any anomalies; fix and re‑test.

---

## Story 10: Merge & Release

> Finalize, merge the PR, and publish a patch version.

- [ ] Create a PR titled "fix: only reload on real ignore‐mode changes."
- [ ] Ensure all CI checks (unit, E2E) are green.
- [ ] Get approvals, then merge into `main`.
- [ ] Bump version (e.g. `1.2.3 → 1.2.4`) in `package.json`.
- [ ] Publish the release (`npm publish` / GitHub Releases).
- [ ] Announce the patch to stakeholders.

---

> **Total Stories:** 10  
> **Total Points:** ~30 (3 points for testing & QA stories)
