## React Implementation
- Feature: Ignore Patterns Persistence & UI Updates
- Component Type: Hook (`useIgnorePatterns`), Component (`ViewIgnoresButton`, `App`)
- Last Updated: 2025-04-06

### Component Structure
- `useIgnorePatterns`: Modified to handle localStorage persistence for `customIgnores`.
- `ViewIgnoresButton`: Text updated, `disabled` prop made optional.
- `App`: Removed `disabled` prop from `ViewIgnoresButton` usage.

### Props
- `ViewIgnoresButton`:
  - `onClick`: `() => void` - Function to call when button is clicked.
  - `disabled?`: `boolean` - (Optional) Whether the button is disabled. Defaults to `false`.

### State Management
- `useIgnorePatterns`:
  - State type: Local state within the hook, persisted to `localStorage`.
  - Key state elements:
    - `customIgnores`: `string[]` - User-defined ignore patterns. Loaded from `localStorage` on init, saved on change.
    - `ignoreMode`: `'automatic' | 'global'` - Persisted separately in `localStorage`.

### Key Functionality
- **Persistence:** The `customIgnores` array in `useIgnorePatterns` is now saved to `localStorage` under the key `pastemax-custom-ignores` whenever it changes. It's loaded on hook initialization, defaulting to an empty array if no data exists or parsing fails.
- **UI Update:** The button previously labeled "View Ignores" is now labeled "Ignore Filters".
- **Button Enablement:** The "Ignore Filters" button in the main `App` header is now always enabled, regardless of whether a folder is selected. The `disabled` prop was removed from its usage in `App.tsx`, and the prop was made optional in the `ViewIgnoresButton` component itself.

### Implementation Notes
- **`useIgnorePatterns.ts`:**
  - Imported `useEffect`.
  - Used `useState` with an initializer function to load `customIgnores` from `localStorage`. Includes `try...catch` for safe JSON parsing.
  - Added a `useEffect` hook that triggers on `customIgnores` changes to save the current state to `localStorage` using `JSON.stringify`. Includes `try...catch` for safe stringification.
  - Renamed `setCustomIgnores` to `_setCustomIgnores` and created a wrapper `setCustomIgnores` for potential future side effects (though none currently needed).
  - Fixed a TypeScript error by removing the explicit type argument from `useState` when using an initializer function.
- **`ViewIgnoresButton.tsx`:**
  - Made the `disabled` prop optional in `ViewIgnoreButtonProps` using `?`.
  - Provided a default value (`false`) for the `disabled` prop in the component's destructuring assignment.
- **`App.tsx`:**
  - Removed the `disabled={...}` prop entirely from the `<ViewIgnoresButton />` component invocation.

### Performance Considerations
- `localStorage` access is synchronous and can block the main thread if overused or with large data. The current usage for small arrays (`customIgnores`, `ignoreMode`) is acceptable.
- Consider debouncing the `useEffect` that saves `customIgnores` if the user could potentially update it very rapidly (e.g., typing in an input field), although this is unlikely with the current UI.

### Testing Approach
- **Manual:**
  - Verify `customIgnores` persist across page reloads/app restarts.
  - Check the "Ignore Filters" button text.
  - Confirm the "Ignore Filters" button is always enabled.
  - Test adding/removing custom ignores and ensure they are saved/loaded correctly.
- **Unit (Future):**
  - Mock `localStorage` to test the `useIgnorePatterns` hook's persistence logic.
  - Test `ViewIgnoresButton` rendering with and without the `disabled` prop.