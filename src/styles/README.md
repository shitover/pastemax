# CSS Styles Documentation

This directory contains the CSS styles for the application. The `index.css` file, which previously held all global styles, has been broken down into smaller, component-specific or layout-specific CSS files (`.css`) located in subdirectories.

**Note:** This breakdown is primarily a separation effort to reduce the size and complexity of the main `index.css` file. It is **not** a complete or proper modularization of the CSS codebase. Many of the styles within the `.css` files still contain hardcoded legacy code and may not follow modern CSS modularization principles.

The remaining `index.css` file now primarily contains CSS variables (Design System) and some global resets and base styles.

**Guidance for Future Contributions:**

- **Gradual Modularization:** Future CSS development should aim for proper modularization using CSS Modules or other suitable methodologies.
- **New Components:** When creating new components, create a dedicated `.css` file for their styles within the appropriate layout subdirectory (`header`, `sidebar`, `contentarea`, `modals`, or `base`).
- **Refactoring Existing Styles:** When modifying existing styles, prioritize refactoring styles within the `.css` files to be more modular and maintainable.
- **Legacy Code:** The existing hardcoded legacy styles within the `.css` files and `index.css` should be left as they are for now, unless a specific need for refactoring arises. The focus is on gradually introducing better practices for new styles and components.
- **Importing Styles:** All `.css` files are imported in `src/main.tsx`. When adding new `.css` files, ensure they are also imported in `src/main.tsx`.

This approach allows for incremental improvement of the CSS codebase without a large-scale refactoring effort.

**Backups:**

A backup of the original `index.css` file before the breakdown is located at `src/styles/backup/index.css.bak`.

**Important:** Always create a backup of any CSS file before performing significant refactoring or making changes that could potentially break existing styles. This will help in easily reverting changes if needed.
