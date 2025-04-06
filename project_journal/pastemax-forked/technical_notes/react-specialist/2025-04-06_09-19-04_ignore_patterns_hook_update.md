## React Implementation
- Feature: Ignore Patterns Hook Update
- Component Type: Custom Hook
- Last Updated: 2025-04-06

### Component Structure
- Standalone hook used by components needing ignore patterns functionality
- Primarily used by IgnorePatternsViewer component

### State Management
- State type: Local component state
- Key state elements:
  - ignoreMode: 'automatic' | 'global' - Controls pattern generation mode
  - customIgnores: string[] - Stores custom ignore patterns for global mode
  - Existing states (isIgnoreViewerOpen, ignorePatterns, ignorePatternsError)

### Key Functionality
- Manages state for ignore patterns viewer
- Handles fetching ignore patterns from Electron backend
- Now supports both automatic and global ignore modes
- Passes mode and custom ignores to IPC handler

### Implementation Notes
```typescript
const [ignoreMode, setIgnoreMode] = useState('automatic' as 'automatic' | 'global');
const [customIgnores, setCustomIgnores] = useState([] as string[]);

// Updated IPC call:
const result = await window.electron.ipcRenderer.invoke('get-ignore-patterns', {
  folderPath: selectedFolder,
  mode: ignoreMode,
  customIgnores: ignoreMode === 'global' ? customIgnores : []
});
```

### Performance Considerations
- State updates are localized to relevant components
- No unnecessary re-renders from hook changes

### Testing Approach
- Verify mode switching works correctly
- Test custom ignores are passed only in global mode
- Ensure existing functionality remains unchanged