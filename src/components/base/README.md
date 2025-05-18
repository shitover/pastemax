# Base Components

This folder contains **base UI components** for PasteMax. These are low-level, highly reusable building blocks that are used throughout the application.

## Guidelines for Base Components

- **Purpose:**  
  Base components are _not_ tied to any specific feature or business logic. They provide generic, accessible UI primitives (e.g., buttons, toggles, inputs) that can be styled globally and reused anywhere in the app.

- **Styling:**  
  All base components should rely on global stylesheets located in `src/styles/base/`.

  - For example, `ToggleSwitch.tsx` is styled by `src/styles/base/ToggleSwitch.css`, which is imported globally (e.g., in `main.tsx`).
  - Do **not** import CSS directly in the component file.
  - Use clear, prefixed class names (e.g., `.toggle-switch-*`) to avoid naming collisions.

- **Props:**  
  Base components should be as flexible as possible, exposing props for customization (e.g., `className`, `labelPosition`, etc.).

- **Accessibility:**  
  Always ensure base components are accessible (proper labels, keyboard navigation, focus states, etc.).

- **Usage:**  
  Import and use these components anywhere in the app.  
  Example:

  ```tsx
  import ToggleSwitch from 'src/components/base/ToggleSwitch';

  <ToggleSwitch
    id="my-toggle"
    label="Enable Feature"
    checked={isEnabled}
    onChange={handleToggle}
  />;
  ```

- **Extending:**  
  If you need a more specialized version of a base component, create a new component that composes the base one, rather than modifying the base directly.

---

## Existing Base Components

- **ToggleSwitch.tsx**  
  A reusable, accessible toggle switch component.
  - Styles: `src/styles/base/ToggleSwitch.css`
  - Usage: See above.

Add new base components here as needed, following the above guidelines.
