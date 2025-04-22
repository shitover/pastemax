Below is a **very detailed** breakdown of all the implementation work—organized into high‑level stories, each broken into **one‑story‑point tasks**. An AI Coding Agent can follow this checklist to implement every change end‑to‑end.  

> **Note:** each bullet is a single story‑point task. All checkboxes are initially unchecked.

---

## Story: Expose Persistent Ignore‐Mode Toggle in Header

- [ ] **Create** `src/components/IgnoreModeToggle.tsx`  
  - Define a React component that accepts `mode: IgnoreMode` and `onChange: (mode: IgnoreMode) => void`  
  - Import existing `ToggleSwitch` component  
  - Export as default  

- [ ] **Implement** the JSX in `IgnoreModeToggle.tsx`  
  ```tsx
  import React from 'react';
  import ToggleSwitch from './ToggleSwitch';
  import type { IgnoreMode } from '../types/FileTypes';

  interface Props {
    mode: IgnoreMode;
    onChange: (mode: IgnoreMode) => void;
  }

  export default function IgnoreModeToggle({ mode, onChange }: Props) {
    return (
      <label className="ignore-mode-toggle">
        <span>Ignore Mode:</span>
        <ToggleSwitch 
          isOn={mode === 'global'} 
          onToggle={() => onChange(mode === 'automatic' ? 'global' : 'automatic')} 
        />
        <span>{mode === 'automatic' ? 'Automatic' : 'Global'}</span>
      </label>
    );
  }
  ```
  
- [ ] **Add CSS rules** for `.ignore-mode-toggle` in your existing stylesheet (e.g. `src/index.css`) to **match** the current `header-actions` toggle spacing, alignment, font and color:  
  ```css
  .ignore-mode-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-on-surface);
    /* copy padding/margin from .header-actions > * */
  }
  ```
  
- [ ] **Import** `IgnoreModeToggle` into `src/App.tsx`  
  ```ts
  import IgnoreModeToggle from './components/IgnoreModeToggle';
  ```
  
- [ ] **Destructure** `setIgnoreMode` from your hook call in `App.tsx`:  
  ```ts
  const {
    /* ... */,
    ignoreMode,
    setIgnoreMode,               // ← add this
    customIgnores,
    /* ... */
  } = useIgnorePatterns(selectedFolder, isElectron);
  ```

- [ ] **Insert** `<IgnoreModeToggle>` into the `<header>` in `App.tsx`, inside the `.header-actions` div **next to** `<ThemeToggle />`:  
  ```tsx
    <div className="header-actions">
      <ThemeToggle />
      <IgnoreModeToggle mode={ignoreMode} onChange={setIgnoreMode} />
      {/* existing folder-info buttons */}
    </div>
  ```
  - Ensure it respects `disabled={!isElectron}` if you don’t want it active in browser mode  

---

## Story: Always Fetch Ignore Patterns (Even with No Folder)

- [ ] **Open** `src/hooks/useIgnorePatterns.ts` and locate `handleViewIgnorePatterns`

- [ ] **Remove** the early‐return guard:
  ```diff
  - if (!selectedFolder || !isElectron) {
  -   console.log('…no folder…');
  -   return;
  - }
  ```
  so that `ipcRenderer.invoke('get-ignore-patterns', { … })` always executes (passing `folderPath: selectedFolder` even if `null`).

- [ ] **Verify** the `invoke` call now reads:
  ```ts
  const result = await window.electron.ipcRenderer.invoke('get-ignore-patterns', {
    folderPath: selectedFolder,
    mode: ignoreMode,
    customIgnores: ignoreMode === 'global' ? customIgnores : [],
  });
  ```
  
- [ ] **Ensure** any `setIgnorePatternsError` or `setIgnorePatterns` logic still runs afterwards, so the UI shows default/global patterns with no folder loaded.

---

## Story: Viewer Always Shows Global/Custom Sections

- [ ] **Open** `src/components/IgnorePatternsViewer.tsx`

- [ ] **Locate** the “Global Exclusions” section render:
  ```tsx
  {ignoreMode === 'global' && selectedFolder && (
    <PatternSection title="Global Exclusions" patterns={patterns?.global || []} …/>
  )}
  ```

- [ ] **Remove** `&& selectedFolder` so it becomes:
  ```tsx
  {ignoreMode === 'global' && (
    <PatternSection title="Global Exclusions" patterns={patterns?.global || []} …/>
  )}
  ```

- [ ] **Locate** the “Custom Global Ignores” block:
  ```tsx
  {ignoreMode === 'global' && selectedFolder && (
    <div className="custom-global-ignores">…</div>
  )}
  ```

- [ ] **Remove** `&& selectedFolder` from its condition as well.

- [ ] **Test** in both no‑folder and folder‑loaded states: verify you can view/add custom patterns before selecting anything.

---

## Story: Immediate Reload on Mode Change

- [ ] **In** `src/App.tsx`, **rename** the destructured `closeIgnoreViewer` to `hookCloseIgnoreViewer`:
  ```diff
  - const { …, closeIgnoreViewer, … } = useIgnorePatterns(…);
  + const { …, closeIgnoreViewer: hookCloseIgnoreViewer, … } = useIgnorePatterns(…);
  ```

- [ ] **Below** that, **add** a new callback:
  ```ts
  const handleIgnoreViewerClose = (modeChanged?: boolean) => {
    hookCloseIgnoreViewer(modeChanged);
    if (modeChanged && selectedFolder) {
      setProcessingStatus({
        status: 'processing',
        message: 'Applying new ignore rules…',
      });
      window.electron.ipcRenderer.send('request-file-list', {
        folderPath: selectedFolder,
        ignoreMode,
        customIgnores,
        ignoreSettingsModified,
      });
      resetIgnoreSettingsModified();
    }
  };
  ```

- [ ] **Swap** the `<IgnorePatternsViewer>` prop:
  ```diff
  - onClose={hookCloseIgnoreViewer}
  + onClose={handleIgnoreViewerClose}
  ```

- [ ] **Confirm** that flipping modes within the modal immediately re‑requests the file list.

---

## Story: Contextual “Applying new ignore rules…” Feedback

- [ ] **Find** the `useEffect` in `src/App.tsx` that triggers the initial folder load:
  ```ts
  useEffect(() => {
    if (!isElectron || !selectedFolder || isSafeMode) return;
    if (processingStatus.status === 'processing') return;
    setProcessingStatus({
      status: 'processing',
      message: 'Loading files…',
    });
    // …
  }, [selectedFolder, isSafeMode]);
  ```

- [ ] **Change** its dependency array to:
  ```ts
  }, [
    selectedFolder,
    ignoreMode,
    customIgnores,
    ignoreSettingsModified,
    isSafeMode,
  ]);
  ```

- [ ] **Update** `setProcessingStatus` call:
  ```diff
    setProcessingStatus({
      status: 'processing',
-     message: 'Loading files…',
+     message: ignoreSettingsModified
+       ? 'Applying new ignore rules…'
+       : 'Loading files…',
    });
  ```

- [ ] **After** the `ipcRenderer.send('request-file-list', …)` line, add:
  ```ts
  if (ignoreSettingsModified) resetIgnoreSettingsModified();
  ```

- [ ] **Verify** that:
  1. On first folder load you see “Loading files…”  
  2. After mode/custom‐pattern changes you see “Applying new ignore rules…”  

---

## Story: Code Cleanup & Consistency

- [ ] **Search** the entire codebase for any remaining `selectedFolder` guards around ignore logic and remove/reconcile them now that mode is independent.  
- [ ] **Ensure** `useIgnorePatterns` continues to set `ignoreSettingsModified` in localStorage whenever `setIgnoreMode` or `setCustomIgnores` fire.  
- [ ] **Run** the application in both browser and Electron modes to confirm no runtime errors.  
- [ ] **Perform** a final visual check that the new toggle matches existing header styling exactly.

---

❏ When every checkbox above is done, your app will support **pre‑selection of ignore modes**, **immediate re‑loading** on mode flips, **unconditional pattern viewing**, and **contextual spinner feedback**—all without sacrificing the existing UI look‑and‑feel.