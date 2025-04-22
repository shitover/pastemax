Below is an **ultra‑granular, one‑story‑point task checklist** covering every change required to implement **hot‑reloadable ignore‑mode switching**.  
**Do not** check off a box until the task is fully complete and committed.

---

## Story 1 — Backend • Global Ignore‑Mode Flag
- [ ] ☐ Open `electron/main.js`.
- [ ] ☐ Scroll to the **“GLOBAL STATE”** header.
- [ ] ☐ Insert a new code block *above* `let isLoadingDirectory`:<br>`/** runtime ignore‑mode */`<br>`let currentIgnoreMode = 'automatic';`.
- [ ] ☐ Write a single‑line JSDoc explaining accepted values `'automatic' | 'global'`.
- [ ] ☐ Ensure **no export** or `module.exports` exposes this var.

---

## Story 2 — Backend • IPC Channel `set-ignore-mode`
- [ ] ☐ Verify `const { app, BrowserWindow, ipcMain, … }` already includes `BrowserWindow`.
- [ ] ☐ Below existing `ipcMain.on/handle` blocks, add:<br>`ipcMain.on('set-ignore-mode', async (event, mode) => { … });`
- [ ] ☐ Inside handler: *Guard invalid payload* → `if (mode!=='automatic' && mode!=='global') return;`.
- [ ] ☐ Assign `currentIgnoreMode = mode;`.
- [ ] ☐ Execute `ignoreCache.clear(); fileCache.clear(); fileTypeCache.clear();`.
- [ ] ☐ If `currentWatcher` is truthy:<br>`await currentWatcher.close(); currentWatcher = null;`.
- [ ] ☐ Log `console.log('[IgnoreMode] switched →', mode);`.
- [ ] ☐ Loop `BrowserWindow.getAllWindows()` and `send('ignore-mode-updated', mode)`.

---

## Story 3 — Backend • Respect Flag During Operations
### 3‑A `request-file-list`
- [ ] ☐ Find `const ignoreMode = folderPath.ignoreMode` line.
- [ ] ☐ Replace with `const ignoreMode = folderPath?.ignoreMode ?? currentIgnoreMode;`.
### 3‑B `get-ignore-patterns`
- [ ] ☐ Same replacement at top of handler.
- [ ] ☐ Remove obsolete comments referencing “default automatic”.

---

## Story 4 — Renderer Hook • Startup Sync
- [ ] ☐ Open `src/hooks/useIgnorePatterns.ts`.
- [ ] ☐ Inside hook body, add `useEffect(() => { if (isElectron) window.electron.ipcRenderer.send('set-ignore-mode', ignoreMode); }, []);`.
- [ ] ☐ Add comment: “Initial backend sync.”

---

## Story 5 — Renderer Viewer • Toggle Sends Mode
- [ ] ☐ Locate `setIgnoreMode` in same hook.
- [ ] ☐ Confirm it already calls `window.electron.ipcRenderer.send('set-ignore-mode', mode);`.  
  - [ ] ☐ If not present, insert this call **before** `clear-ignore-cache`.
- [ ] ☐ Run `npm run lint`, ensure hook still type‑checks.

---

## Story 6 — Renderer • Hot‑Reload on Backend Update
- [ ] ☐ Open `src/App.tsx`.
- [ ] ☐ Inside the IPC listener setup effect, add handler:  
  ```ts
  const handleBackendModeUpdate = (newMode: IgnoreMode) => {
    if (newMode !== ignoreMode) {
      console.info(`[IgnoreMode] Reloading for mode: ${newMode}`);
      window.location.reload();
    }
  };
  ```
- [ ] ☐ `on` subscribe to `'ignore-mode-updated'`.
- [ ] ☐ `removeListener` in cleanup.
- [ ] ☐ Delete old branch that manually rescanned folder after mode change.

---

## Story 7 — Renderer • Viewer Close Handler Simplification
- [ ] ☐ In `App.tsx` find `handleIgnoreViewerClose`.
- [ ] ☐ Replace body with only:  
  ```ts
  closeIgnoreViewer();
  // Backend event triggers the reload.
  ```
- [ ] ☐ Delete any state‑clearing or scan‑triggering code inside this handler.

---

## Story 8 — Backend • Watcher Disposal Safety
- [ ] ☐ Inside the new `set-ignore-mode` handler, wrap `currentWatcher.close()` in `try/catch`.
- [ ] ☐ Await the promise; log on error.
- [ ] ☐ Unit‑run app once in dev to ensure no “FS handle still in use” warning appears.

---

## Story 9 — Shared Types & Constants
- [ ] ☐ Open `src/types/FileTypes.ts`; confirm `export type IgnoreMode = 'automatic' | 'global';`.
- [ ] ☐ Add comment: “Hot reload occurs when mode changes.”

---

## Story 10 — Logging & Diagnostics
- [ ] ☐ Prefix **all new backend logs** with `[IgnoreMode]`.
- [ ] ☐ Wrap verbose logs in `if (process.env.NODE_ENV === 'development')`.

---

## Story 11 — Documentation
- [ ] ☐ Open `README.md`.
- [ ] ☐ Add **“Switching Ignore Modes”** subsection under “Usage”.
- [ ] ☐ Document toggle path: `Header → Ignore Filters → Automatic/Global`.
- [ ] ☐ Note: “Toggle triggers hot reload; current scan restarts.”

---

## Story 12 — Manual Regression Pass (Architecture Critical)
- [ ] ☐ Start app in dev; ensure default mode **Automatic**.
- [ ] ☐ Toggle to **Global** *before* selecting any folder; observe full reload & UI remains functional.
- [ ] ☐ Select a sample repo; ensure `.gitignore` rules **are NOT** applied (global list only).
- [ ] ☐ Toggle back to **Automatic**; observer reload; verify `.gitignore` rules **are** applied.
- [ ] ☐ While a long scan is running, toggle mode—confirm scan aborts, reload occurs, new scan restarts automatically.

---

### Legend  
*Each unchecked box **is a single story point**.*  
Complete tasks in order; earlier stories unblock later ones.