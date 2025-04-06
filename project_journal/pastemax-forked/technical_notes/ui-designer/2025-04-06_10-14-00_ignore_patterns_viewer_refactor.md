## UI Design Technical Note: Ignore Patterns Viewer Refactor

- **Project:** pastemax-forked
- **Design Version:** 1.1
- **Last Updated:** 2025-04-06
- **Task:** Refactor `IgnorePatternsViewer` UI based on user feedback.

### Changes Implemented:

1.  **Mode Toggle:**
    *   Replaced the two separate mode buttons ("Automatic Gitignore", "Global Ignore") with a single, modern toggle switch component.
    *   Used a standard HTML checkbox (`<input type="checkbox">`) wrapped in a `<label>` for accessibility and styled it using CSS (`.mode-toggle-switch`, `.toggle-slider`, etc.).
    *   Labels "Automatic" and "Global" are placed on either side of the switch for clarity.
    *   The toggle correctly updates the `ignoreMode` state via the `onChange` handler calling `setIgnoreMode`.
    *   **Rationale:** Provides a more compact and modern UI element for switching between two states, improving visual appeal and space efficiency.

2.  **Default Patterns Removed:**
    *   The `PatternSection` component instance displaying "Default Patterns" was completely removed from the JSX in `IgnorePatternsViewer.tsx`.
    *   **Rationale:** Simplifies the view by removing potentially less relevant information as requested.

3.  **Conditional Section Display:**
    *   The "Custom Global Ignores" section (input, button, list) is now conditionally rendered based on `ignoreMode === 'global'`. This was already correctly implemented using `&&` operator in the JSX.
    *   The "Global Exclusions" and "Repository Rules" sections remain visible in both modes when a folder is loaded, as they are outside the conditional block.
    *   **Rationale:** Tailors the displayed information to the selected mode, reducing clutter in "Automatic" mode.

4.  **Styling Enhancements:**
    *   **Toggle Switch:** Added CSS rules for `.mode-toggle-switch`, `.toggle-slider`, `.toggle-input`, and `.toggle-label` to create the visual appearance of the switch with smooth transitions. Added padding and border to the container (`.ignore-patterns-mode-toggle`).
    *   **Search Input:** Enhanced `.ignore-patterns-search .search-input` with a slightly larger font size, more padding, rounded corners, and a background color matching the theme's secondary background for better distinction. Focus state uses the accent color.
    *   **Custom Global Ignores Input/Button:** Styled the input (`.custom-global-ignores input`) similarly to the search input for consistency. Styled the "Add Pattern" button (`.add-pattern-button`) using primary button colors/styles, adjusted padding/font size, and made it not full-width. Arranged input and button horizontally using flexbox (`.custom-ignore-input`).
    *   **Layout:** Added padding and a bottom border to the `.ignore-patterns-mode-toggle` container for better separation. Ensured consistent spacing and alignment within the modal.
    *   **Rationale:** Improves the overall visual hierarchy, modernizes the look and feel, and makes interactive elements clearer.

5.  **Empty State (No Folder Loaded):**
    *   Added a conditional check at the beginning of the component's return statement (`if (!selectedFolder)`) to display a dedicated empty state message (`.ignore-patterns-empty-state`) when no folder is selected.
    *   The empty state includes the modal header for consistency.
    *   Added CSS for `.ignore-patterns-empty-state` for appropriate text styling and padding.
    *   **Rationale:** Provides clear feedback to the user when the component lacks the necessary data (selected folder) to display patterns.

### Accessibility Considerations:

*   The mode toggle uses a native checkbox input, ensuring keyboard accessibility and compatibility with screen readers. The `<label>` element provides the necessary association.
*   Focus states are defined for interactive elements (inputs, buttons, toggle) using the `--accent-blue` color for visibility.
*   Semantic HTML (`<section>`, `<h3>`, `<button>`, `<input>`) is used appropriately.

### File Modifications:

*   `src/components/IgnorePatternsViewer.tsx` (Structure & Logic - via `code` mode)
*   `src/styles/index.css` (Styling - via `ui-designer` mode)