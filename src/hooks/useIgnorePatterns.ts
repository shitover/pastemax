import { useState } from 'react';

interface IgnorePatternsState {
  default: string[];
  excludedFiles: string[];
  gitignore: string[];
}

/**
 * Hook for managing ignore patterns functionality
 * Handles state and operations related to viewing git ignore patterns
 *
 * @param selectedFolder - The currently selected folder path
 * @param isElectron - Whether the app is running in Electron environment
 * @returns {Object} An object containing:
 *   - isIgnoreViewerOpen: Boolean state for viewer visibility
 *   - ignorePatterns: Current ignore patterns state
 *   - ignorePatternsError: Error message if pattern fetch failed
 *   - handleViewIgnorePatterns: Function to fetch patterns
 *   - closeIgnoreViewer: Function to close the viewer
 *   - ignoreMode: Current ignore mode ('automatic' or 'global')
 *     - 'automatic': Combines .gitignore files with default excludes
 *     - 'global': Uses only default excludes and custom ignores
 *   - setIgnoreMode: Function to update ignore mode
 *   - customIgnores: Array of additional ignore patterns
 *     - Only used when ignoreMode is 'global'
 *   - setCustomIgnores: Function to update custom ignores
 *
 * @description The hook automatically includes customIgnores in the IPC call
 * when mode is 'global', but ignores them in 'automatic' mode.
 */
export function useIgnorePatterns(selectedFolder: string | null, isElectron: boolean) {
  const [isIgnoreViewerOpen, setIsIgnoreViewerOpen] = useState(false);
  const [ignorePatterns, setIgnorePatterns] = useState(null as IgnorePatternsState | null);
  const [ignorePatternsError, setIgnorePatternsError] = useState(null as string | null);
  /**
   * Current ignore mode state ('automatic' or 'global')
   * - 'automatic': Scans for .gitignore files and combines with default excludes
   * - 'global': Uses only default excludes and custom ignores
   */
  const [ignoreMode, setIgnoreMode] = useState('automatic' as 'automatic' | 'global');

  /**
   * Custom ignore patterns that will be included when mode is 'global'
   * These patterns are passed to the IPC handler when fetching ignore patterns
   */
  const [customIgnores, setCustomIgnores] = useState([] as string[]);

  /**
   * Fetches and displays ignore patterns for the selected folder
   * Handles both success and error states
   */
  const handleViewIgnorePatterns = async () => {
    console.time('handleViewIgnorePatterns');
    if (!selectedFolder || !isElectron) return;
    setIgnorePatterns(null);
    setIgnorePatternsError(null);

    try {
      const result = await window.electron.ipcRenderer.invoke('get-ignore-patterns', {
        folderPath: selectedFolder,
        mode: ignoreMode,
        customIgnores: ignoreMode === 'global' ? customIgnores : []
      });
      if (result.error) {
        setIgnorePatternsError(result.error);
      } else {
        setIgnorePatterns(result.patterns);
      }
    } catch (err) {
      console.error("Error invoking get-ignore-patterns:", err);
      setIgnorePatternsError(err instanceof Error ? err.message : "Failed to fetch ignore patterns.");
    } finally {
      setIsIgnoreViewerOpen(true);
      console.timeEnd('handleViewIgnorePatterns');
    }
  };

  return {
    isIgnoreViewerOpen,
    ignorePatterns,
    ignorePatternsError,
    handleViewIgnorePatterns,
    closeIgnoreViewer: () => setIsIgnoreViewerOpen(false),
    ignoreMode,
    setIgnoreMode,
    customIgnores,
    setCustomIgnores
  };
}