Below is the full list of CSS module files per logical section of `index.css`.

```text
src/styles/
├── variables.module.css
├── base.module.css
├── buttons.module.css
├── inputs.module.css
├── theme-toggle.module.css
├── header.module.css
├── sidebar.module.css
├── main-content.module.css
├── content-area.module.css
├── file-card.module.css
├── sidebar-resize.module.css
├── file-tree.module.css
├── tree-badges.module.css
├── ignore-patterns-modal.module.css
├── custom-global-ignores.module.css
├── search-bar.module.css
├── sort-dropdown.module.css
├── user-instructions.module.css
├── copy-button.module.css
├── processing-indicator.module.css
├── utilities.module.css
├── scrollbar.module.css
├── animations.module.css
├── responsive.module.css
├── high-contrast.module.css
├── icons.module.css
├── view-ignores-button.module.css
├── copy-button-wrapper.module.css
├── workspace-manager.module.css
├── task-type-selector.module.css
├── file-preview-modal.module.css
├── update-modal.module.css
├── custom-task-type-modal.module.css
└── task-type-list.module.css
```

**Mapping of content**

* **`variables.module.css`** — `:root {…}` + `.dark-mode {…}`
* **`base.module.css`** — global resets (`*`, `body`, `#root`)
* **`buttons.module.css`** — `button`, its states, variants, ripple effects
* **`inputs.module.css`** — `input[type=…]`, `textarea`, checkboxes, `:focus-visible`
* **`theme-toggle.module.css`** — `.theme-toggle-button` styles
* **`header.module.css`** — `.header`, `.header h1`, `.header-actions`
* **`sidebar.module.css`** — `.sidebar`, `.sidebar-header`, `.sidebar-title`, workspace badge, folder path, `.sidebar-search`, `.sidebar-actions`, `.sidebar-action-btn`
* **`main-content.module.css`** — `.app-container` and `.main-content`
* **`content-area.module.css`** — `.content-area`, `.content-header`, `.content-title`, `.content-actions`, `.stats-info`
* **`file-card.module.css`** — `.file-card`, `.file-card.binary-card`, badges, icons, hover/selected states
* **`sidebar-resize.module.css`** — `.sidebar-resize-handle`
* **`file-tree.module.css`** — `.file-tree`, `.tree-item`, loading states, toggle, icon, indent, etc.
* **`tree-badges.module.css`** — `.tree-item-badge`, `.tree-item-badge-binary-file`, `.tree-item-badge-folder`
* **`ignore-patterns-modal.module.css`** — `.ignore-patterns-container`, overlay, modal, header, search, content, error, loading, no-patterns
* **`custom-global-ignores.module.css`** — `.custom-global-ignores` and its internal sections/buttons/lists
* **`search-bar.module.css`** — `.search-bar`, `.search-input`, icon, clear button
* **`sort-dropdown.module.css`** — `.sort-options`, selector button, dropdown list, items, arrow
* **`user-instructions.module.css`** — `.user-instructions-container`, `.user-instructions textarea`
* **`copy-button.module.css`** — `.copy-button-container`, `label`, `.copy-button`, `.copy-status`
* **`processing-indicator.module.css`** — `.processing-indicator`, `.spinner`, `@keyframes spin`, `.cancel-btn`
* **`utilities.module.css`** — utility classes like `.monospace`, `.error-message`
* **`scrollbar.module.css`** — all `::-webkit-scrollbar` + Firefox scrollbar rules
* **`animations.module.css`** — all `@keyframes` (fadeIn, slideIn…, scaleIn, pulse) and global transition helpers
* **`responsive.module.css`** — your `@media (max-width: …)` rules
* **`high-contrast.module.css`** — `@media (prefers-contrast: high)` overrides
* **`icons.module.css`** — `svg.lucide` sizing variants
* **`view-ignores-button.module.css`** — `.view-ignores-button` fix
* **`copy-button-wrapper.module.css`** — `.copy-button-wrapper` adjustments
* **`workspace-manager.module.css`** — overlay, container, header, list, workspace-item styling
* **`task-type-selector.module.css`** — `.task-type-container`, dropdown, options for task-type selectors in sidebar and content
* **`file-preview-modal.module.css`** — preview modal overlay, header, tabs, code container, etc.
* **`update-modal.module.css`** — update-check modal overlay, header, body, buttons
* **`custom-task-type-modal.module.css`** — custom task-type modal styles (forms, list, actions)
* **`task-type-list.module.css`** — existing-task-types section, no-task-types, list and item styles

---

**Next steps:**

1. **Create** all these `.module.css` files.
2. **Import** `variables.module.css` and `base.module.css` once at your root (e.g. in `main.tsx`).
3. **Incrementally** move each block of rules from `index.css` into its module, update the corresponding component to import and use `styles.<className>`, then remove from `index.css`.
4. **Validate** after each slice with your visual and unit tests.

This structure will keep everything organized and make future maintenance or theming trivial.
