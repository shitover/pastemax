## React Implementation
- Feature: Ignore Patterns Viewer Modal Update
- Component Type: Functional Component with Hooks
- Last Updated: 2025-04-06

### Component Structure
- Parent: App component
- Child: PatternSection component
- Related: useIgnorePatterns hook

### Props
- isOpen: boolean - Controls modal visibility
- onClose: () => void - Callback to close modal
- patterns: object - Contains ignore patterns data
- error: string - Error message if pattern loading fails

### State Management
- State type: Local state with useState
- Key state elements:
  - ignoreMode: 'automatic' | 'global' - Controls which ignore mode is active
  - customIgnoreInput: string - Temporary input for custom patterns
  - customIgnores: string[] - List of user-added global ignore patterns
  - searchTerm: string - Filter term for pattern search

### Key Functionality
- Toggle between automatic gitignore and global ignore modes
- Add/remove custom global ignore patterns
- Search and filter displayed patterns
- Display different pattern sections based on mode

### Implementation Notes
```typescript
// Mode toggle implementation
const [ignoreMode, setIgnoreMode] = useState('automatic' as 'automatic' | 'global');

// Custom ignores management
const [customIgnores, setCustomIgnores] = useState([] as string[]);
const handleAddPattern = () => {
  const trimmed = customIgnoreInput.trim();
  if (trimmed) {
    setCustomIgnores([...customIgnores, trimmed]);
    setCustomIgnoreInput('');
  }
};
```

### Performance Considerations
- Memoized pattern filtering with useMemo
- Conditional rendering of global ignore section
- Efficient array operations for pattern management

### Testing Approach
1. Test mode switching updates UI correctly
2. Verify custom patterns are added/removed properly
3. Check pattern filtering works in both modes
4. Ensure IPC call includes correct mode and patterns