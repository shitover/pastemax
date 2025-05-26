/* ============================== IMPORTS ============================== */
import { useState, useEffect, useCallback, useRef } from 'react';
import ConfirmUseFolderModal from './components/ConfirmUseFolderModal';
import Sidebar from './components/Sidebar';
import FileList from './components/FileList';
import { FileData, IgnoreMode } from './types/FileTypes';
import { ThemeProvider } from './context/ThemeContext';
import IgnoreListModal from './components/IgnoreListModal';
import ThemeToggle from './components/ThemeToggle';
import UpdateModal from './components/UpdateModal';
import { useIgnorePatterns } from './hooks/useIgnorePatterns';
import UserInstructions from './components/UserInstructions';
// import { STORAGE_KEY_TASK_TYPE } from './types/TaskTypes';
import { DownloadCloud, ArrowDownUp, FolderKanban, MessageSquare } from 'lucide-react';
import CustomTaskTypeModal from './components/CustomTaskTypeModal';
import TaskTypeSelector from './components/TaskTypeSelector';
import WorkspaceManager from './components/WorkspaceManager';
import { Workspace } from './types/WorkspaceTypes';
import CopyHistoryModal, { CopyHistoryItem } from './components/CopyHistoryModal';
import CopyHistoryButton from './components/CopyHistoryButton';
import ModelDropdown from './components/ModelDropdown';
import ToggleSwitch from './components/base/ToggleSwitch';
import LlmSettingsModal from './components/LlmSettingsModal';
import ChatView from './components/ChatView';
import ChatButton from './components/ChatButton';
// Ensure all necessary types are imported from llmTypes
import {
  AllLlmConfigs,
  LlmConfig,
  ChatMessage,
  ChatTarget,
  LlmProvider,
  ProviderSpecificConfig,
  LlmApiWindow,
  MessageRole,
} from './types/llmTypes';
import SystemPromptEditor from './components/SystemPromptEditor';
import { ChatSession } from './components/ChatHistorySidebar';
import { normalizePath, arePathsEqual, isSubPath } from './utils/pathUtils';
import { formatBaseFileContent, formatUserInstructionsBlock } from './utils/contentFormatUtils';
import type { UpdateDisplayState } from './types/UpdateTypes';

// Augment the Window interface
declare global {
  interface Window {
    electron: any; // Consider more specific typing if possible
    llmApi: LlmApiWindow['llmApi']; // MODIFIED: Removed '?' to make it non-optional
  }
}

const STORAGE_KEYS = {
  SELECTED_FOLDER: 'pastemax-selected-folder',
  INCLUDE_FILE_TREE: 'pastemax-include-file-tree',
  INCLUDE_BINARY_PATHS: 'pastemax-include-binary-paths',
  SELECTED_FILES: 'pastemax-selected-files',
  SORT_ORDER: 'pastemax-sort-order',
  SEARCH_TERM: 'pastemax-search-term',
  USER_INSTRUCTIONS: 'pastemax-user-instructions',
  EXPANDED_NODES: 'pastemax-expanded-nodes',
  IGNORE_MODE: 'pastemax-ignore-mode',
  IGNORE_SETTINGS_MODIFIED: 'pastemax-ignore-settings-modified',
  THEME: 'pastemax-theme',
  RECENT_FOLDERS: 'pastemax-recent-folders',
  WORKSPACES: 'pastemax-workspaces',
  CURRENT_WORKSPACE: 'pastemax-current-workspace',
  WINDOW_SIZES: 'pastemax-window-sizes',
  TASK_TYPE: 'pastemax-task-type',
  COPY_HISTORY: 'pastemax-copy-history',
  ALL_LLM_CONFIGS: 'pastemax-all-llm-configs',
  SYSTEM_PROMPT: 'pastemax-system-prompt',
  CHAT_HISTORY: 'pastemax-chat-history',
  CURRENT_CHAT_SESSION: 'pastemax-current-chat-session',
};

export const DEFAULT_SYSTEM_PROMPT = `## System Prompt for Code/File Edit Agent

You are a specialized file and code editing assistant. Your primary function is to help users analyze, modify, and manage their code files with efficiency and precision.

### Core Capabilities:

- Analyze code files across multiple programming languages
- Suggest improvements to code quality, structure, and performance
- Make targeted edits to files as requested by the user
- Explain code functionality and identify potential issues
- Help refactor and optimize existing code

### Working Process:

1. When presented with code files, first analyze the structure and content
2. Understand the user's editing or analysis request clearly
3. Provide concise, practical solutions or edits
4. When making changes, highlight exactly what was modified and why
5. Offer explanations in plain language that both novice and expert programmers can understand

### Response Format:

- Be direct and efficient in your communication
- Use markdown formatting for code blocks with appropriate language syntax highlighting
- For complex edits, show "before" and "after" code snippets
- Include brief explanations for why specific changes were made

### Usage Guidelines:

- Focus on solving the specific editing task at hand
- Prioritize practical solutions over theoretical discussions
- When suggesting multiple approaches, clearly indicate which you recommend and why
- Clarify any ambiguous requests before proceeding with significant code changes

You have permission to access and modify files when explicitly requested. Always confirm important changes before implementing them. If a requested edit could cause errors or issues, warn the user and suggest alternatives.

Remember that you are a tool to enhance the user's coding experience - aim to save them time and improve their code quality with every interaction.`;

const App = (): JSX.Element => {
  const savedFolder = localStorage.getItem(STORAGE_KEYS.SELECTED_FOLDER);
  const [selectedFolder, setSelectedFolder] = useState(
    savedFolder ? normalizePath(savedFolder) : null
  );
  const isElectron = window.electron !== undefined;
  const [allFiles, setAllFiles] = useState<FileData[]>([]);
  // ... other non-LLM state initializations from your App.tsx file ...
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE)
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    /* ... */ return [];
  });
  const [isConfirmUseFolderModalOpen, setIsConfirmUseFolderModalOpen] = useState(false);
  const [confirmFolderModalDetails, setConfirmFolderModalDetails] = useState<{
    workspaceId: string | null;
    workspaceName: string;
    folderPath: string;
  }>({ workspaceId: null, workspaceName: '', folderPath: '' });
  const {
    isIgnoreViewerOpen,
    ignorePatterns,
    ignorePatternsError,
    handleViewIgnorePatterns,
    closeIgnoreViewer,
    ignoreMode,
    customIgnores,
    ignoreSettingsModified,
    resetIgnoreSettingsModified,
  } = useIgnorePatterns(selectedFolder, isElectron);
  const [selectedFiles, setSelectedFiles] = useState<string[]>(
    localStorage.getItem(STORAGE_KEYS.SELECTED_FILES)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_FILES)!).map(normalizePath)
      : []
  );
  const [sortOrder, setSortOrder] = useState<string>(
    localStorage.getItem(STORAGE_KEYS.SORT_ORDER) || 'tokens-desc'
  );
  const [searchTerm, setSearchTerm] = useState<string>(
    localStorage.getItem(STORAGE_KEYS.SEARCH_TERM) || ''
  );
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [displayedFiles, setDisplayedFiles] = useState<FileData[]>([]);
  const [processingStatus, setProcessingStatus] = useState<{
    status: 'idle' | 'processing' | 'complete' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [includeFileTree, setIncludeFileTree] = useState(false);
  const [includeBinaryPaths, setIncludeBinaryPaths] = useState(
    localStorage.getItem(STORAGE_KEYS.INCLUDE_BINARY_PATHS) === 'true'
  );
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('');
  const [isCustomTaskTypeModalOpen, setIsCustomTaskTypeModalOpen] = useState(false);
  const [userInstructions, setUserInstructions] = useState<string>('');
  const [totalFormattedContentTokens, setTotalFormattedContentTokens] = useState(0);
  const [cachedBaseContentString, setCachedBaseContentString] = useState('');
  const [cachedBaseContentTokens, setCachedBaseContentTokens] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const lastSentIgnoreSettingsModifiedRef = useRef<boolean | null>(null);
  const [copyHistory, setCopyHistory] = useState<CopyHistoryItem[]>(() => {
    /* ... */ return [];
  });
  const [isCopyHistoryModalOpen, setIsCopyHistoryModalOpen] = useState(false);

  // LLM and Chat State
  const [allLlmConfigs, setAllLlmConfigs] = useState<AllLlmConfigs | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    localStorage.getItem('pastemax-selected-model') || ''
  );
  const [recentModels, setRecentModels] = useState<{ [key: string]: string[] }>({});
  const [isLlmSettingsModalOpen, setIsLlmSettingsModalOpen] = useState(false);
  const [isChatViewOpen, setIsChatViewOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatTarget, setChatTarget] = useState<ChatTarget | undefined>(undefined);
  const [isLlmLoading, setIsLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    /* ... */ return [];
  });
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(
    localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_SESSION)
  );
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [isSystemPromptEditorOpen, setIsSystemPromptEditorOpen] = useState(false);

  useEffect(() => {
    try {
      const sm = localStorage.getItem('pastemax-recent-models');
      if (sm) setRecentModels(JSON.parse(sm));
    } catch (e) {
      console.error('Error loading recent models', e);
    }
  }, []);

  const loadAllLlmConfigs = async () => {
    try {
      const savedConfigs = localStorage.getItem(STORAGE_KEYS.ALL_LLM_CONFIGS);
      if (savedConfigs) {
        setAllLlmConfigs(JSON.parse(savedConfigs) as AllLlmConfigs);
        console.log('All LLM configs loaded:', JSON.parse(savedConfigs));
      } else {
        setAllLlmConfigs({}); // Initialize with an empty object if nothing is saved
        console.log('No LLM configs found in localStorage, initialized empty.');
      }
    } catch (error) {
      console.error('Error loading LLM configurations:', error);
      setAllLlmConfigs({}); // Initialize on error
    }
  };

  useEffect(() => {
    loadAllLlmConfigs();
    // ... any other initial loading logic like system prompt, etc.
    const savedSystemPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
  }, []);

  // Helper to extract provider from model ID (e.g., "mistral/mistral-small-latest" -> "mistral")
  const getProviderFromModelId = (modelId: string): LlmProvider | null => {
    if (!modelId || !modelId.includes('/')) {
      // Attempt to guess if not in the new format - this is a fallback
      // and should ideally be phased out as ChatModelSelector provides full IDs.
      if (modelId.startsWith('gpt-')) return 'openai';
      if (modelId.startsWith('claude-')) return 'anthropic';
      if (modelId.startsWith('gemini-')) return 'gemini';
      if (modelId.startsWith('mistral-') || modelId.startsWith('open-mistral')) return 'mistral';
      if (
        allLlmConfigs?.openrouter?.defaultModel === modelId ||
        (recentModels?.openrouter && recentModels.openrouter.includes(modelId))
      ) {
        return 'openrouter';
      }
      console.warn(
        `Cannot determine provider from modelId: "${modelId}". It should be in 'provider/modelName' format.`
      );
      return null;
    }
    return modelId.split('/')[0] as LlmProvider;
  };

  // Helper to get just the model name (e.g., "mistral/mistral-small-latest" -> "mistral-small-latest")
  const getActualModelName = (modelIdWithProvider: string): string => {
    if (!modelIdWithProvider || !modelIdWithProvider.includes('/')) {
      return modelIdWithProvider; // Return as is if not in expected format
    }
    return modelIdWithProvider.split('/')[1];
  };

  /**
   * Effect hook for loading file list data when dependencies change.
   * Handles debouncing requests and prevents duplicate requests when ignoreSettingsModified is reset.
   * @dependencies selectedFolder, isElectron, isSafeMode, ignoreMode, customIgnores, ignoreSettingsModified, reloadTrigger
   */
  useEffect(() => {
    if (!isElectron || !selectedFolder || isSafeMode) {
      lastSentIgnoreSettingsModifiedRef.current = null; // Reset ref when not processing
      return;
    }

    // Debug log kept intentionally (see Story 4.2) - helps track effect triggers
    // and state changes during development
    console.log(
      `[useEffect triggered] Folder: ${selectedFolder}, ReloadTrigger: ${reloadTrigger}, IgnoreModified: ${ignoreSettingsModified}`
    );

    // Check if this is a refresh vs initial load
    const isRefreshingCurrentFolder =
      reloadTrigger > 0 && selectedFolder === localStorage.getItem(STORAGE_KEYS.SELECTED_FOLDER);

    if (ignoreSettingsModified === false && lastSentIgnoreSettingsModifiedRef.current === true) {
      console.log('[useEffect] Skipping request: run is due to ignoreSettingsModified reset.');
      lastSentIgnoreSettingsModifiedRef.current = false; // Update ref to reflect current state
      return; // Skip the rest of this effect run
    }

    setProcessingStatus({
      status: 'processing',
      message: isRefreshingCurrentFolder ? 'Refreshing file list...' : 'Loading files...',
    });

    const timer = setTimeout(() => {
      console.log('[useEffect] Sending request-file-list with payload:', {
        folderPath: selectedFolder,
        ignoreMode,
        customIgnores,
        ignoreSettingsModified, // Send the current state
      });
      lastSentIgnoreSettingsModifiedRef.current = ignoreSettingsModified;
      window.electron.ipcRenderer.send('request-file-list', {
        folderPath: selectedFolder,
        ignoreMode,
        customIgnores,
        ignoreSettingsModified, // Send the current state
      });
      // Reset ignoreSettingsModified *after* sending the request that uses it.
      if (ignoreSettingsModified) {
        resetIgnoreSettingsModified();
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timer);
      console.log('[useEffect] Cleanup - canceling pending request-file-list timer');
    };
  }, [
    selectedFolder,
    isElectron,
    isSafeMode,
    ignoreMode,
    customIgnores,
    ignoreSettingsModified,
    reloadTrigger,
    resetIgnoreSettingsModified,
  ]);

  /**
   * Handles folder selection with validation and state management.
   * Prevents redundant processing when the same folder is selected.
   * @param folderPath - The path of the selected folder
   * @dependencies selectedFolder, allFiles, processingStatus
   */
  const handleFolderSelected = useCallback(
    (folderPath: string) => {
      // Validate input
      if (typeof folderPath !== 'string') {
        console.error('Invalid folder path received:', folderPath);
        setProcessingStatus({
          status: 'error',
          message: 'Invalid folder path received',
        });
        return;
      }

      // Skip if same folder is already loaded/loading
      if (
        arePathsEqual(folderPath, selectedFolder) &&
        (allFiles.length > 0 || processingStatus.status === 'processing')
      ) {
        // Skip if same folder is already loaded/loading
        return;
      }

      const normalizedFolderPath = normalizePath(folderPath);
      // Log kept for debugging folder selection
      console.log('Folder selected:', normalizedFolderPath);

      // Update state - main data loading is handled by separate useEffect
      setSelectedFolder(normalizedFolderPath);

      // Clear selections if folder changed
      if (!arePathsEqual(normalizedFolderPath, selectedFolder)) {
        setSelectedFiles([]);
      }

      // Update current workspace's folder path if a workspace is active
      if (currentWorkspaceId) {
        setWorkspaces((prevWorkspaces: Workspace[]) => {
          const updatedWorkspaces = prevWorkspaces.map((workspace: Workspace) =>
            workspace.id === currentWorkspaceId
              ? { ...workspace, folderPath: normalizedFolderPath, lastUsed: Date.now() }
              : workspace
          );
          // Save to localStorage
          localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(updatedWorkspaces));
          return updatedWorkspaces;
        });
      }
    },
    [selectedFolder, allFiles, processingStatus, currentWorkspaceId]
  );

  // The handleFileListData function is implemented as stableHandleFileListData below
  // with proper dependency tracking

  const handleProcessingStatus = useCallback(
    (status: { status: 'idle' | 'processing' | 'complete' | 'error'; message: string }) => {
      setProcessingStatus(status);
    },
    []
  );

  // Listen for folder selection from main process
  // Removed listenersAddedRef as it's no longer needed with the new IPC listener implementation

  // Memoize handlers with stable dependencies
  const stableHandleFolderSelected = useCallback(
    (folderPath: string) => {
      handleFolderSelected(folderPath);
    },
    [handleFolderSelected]
  );

  const stableHandleFileListData = useCallback(
    (files: FileData[]) => {
      setAllFiles((prevFiles: FileData[]) => {
        if (files.length !== prevFiles.length) {
          console.debug(
            '[handleFileListData] Updating files from',
            prevFiles.length,
            'to',
            files.length
          );
        }
        return files;
      });

      setProcessingStatus({
        status: 'complete',
        message: `Loaded ${files.length} files`,
      });

      setSelectedFiles((prevSelected: string[]) => {
        // If we have previous selections, preserve all existing selections
        if (prevSelected.length > 0) {
          // Only filter out files that no longer exist in the new list
          return prevSelected.filter((selectedPath: string) =>
            files.some((file) => arePathsEqual(file.path, selectedPath))
          );
        }

        // No previous selections - select all eligible files
        return files
          .filter(
            (file: FileData) =>
              !file.isSkipped && !file.excludedByDefault && (includeBinaryPaths || !file.isBinary)
          )
          .map((file: FileData) => file.path);
      });
    },
    [includeBinaryPaths]
  );

  const stableHandleProcessingStatus = useCallback(handleProcessingStatus, [
    handleProcessingStatus,
  ]);

  // Improved IPC listener setup with proper cleanup (now only runs once, uses refs for handlers)
  // --- Types for IPC status ---
  type AppProcessingStatusType = 'idle' | 'processing' | 'complete' | 'error';
  const VALID_APP_STATUSES: AppProcessingStatusType[] = ['idle', 'processing', 'complete', 'error'];
  type IPCFileProcessingStatus = AppProcessingStatusType | 'cancelled' | 'busy';
  type FileProcessingStatusIPCPayload = { status: IPCFileProcessingStatus; message: string };

  // Refs to always point to latest handler logic
  const stableHandleFolderSelectedRef = useRef(stableHandleFolderSelected);
  const stableHandleFileListDataRef = useRef(stableHandleFileListData);
  const stableHandleProcessingStatusRef = useRef(stableHandleProcessingStatus);

  useEffect(() => {
    stableHandleFolderSelectedRef.current = stableHandleFolderSelected;
  }, [stableHandleFolderSelected]);
  useEffect(() => {
    stableHandleFileListDataRef.current = stableHandleFileListData;
  }, [stableHandleFileListData]);
  useEffect(() => {
    stableHandleProcessingStatusRef.current = stableHandleProcessingStatus;
  }, [stableHandleProcessingStatus]);

  useEffect(() => {
    if (!isElectron) return;

    const handleFolderSelectedIPC = (folderPath: string) => {
      console.log('[IPC] Received folder-selected:', folderPath);
      stableHandleFolderSelectedRef.current(folderPath);
    };

    const handleFileListDataIPC = (files: FileData[]) => {
      console.log('[IPC] Received file-list-data:', files.length, 'files');
      stableHandleFileListDataRef.current(files);
    };

    type ProcessingStatusIPCHandler = (payload: FileProcessingStatusIPCPayload) => void;
    const handleProcessingStatusIPC: ProcessingStatusIPCHandler = (payload) => {
      console.log('[IPC] Received file-processing-status:', payload);

      if (VALID_APP_STATUSES.includes(payload.status as AppProcessingStatusType)) {
        stableHandleProcessingStatusRef.current(
          payload as { status: AppProcessingStatusType; message: string }
        );
      } else if (payload.status === 'cancelled') {
        stableHandleProcessingStatusRef.current({
          status: 'idle',
          message: payload.message || 'Operation cancelled',
        });
      } else if (payload.status === 'busy') {
        stableHandleProcessingStatusRef.current({
          status: 'idle',
          message: payload.message || 'System is busy',
        });
      } else {
        console.warn('Received unhandled processing status from IPC:', payload);
        stableHandleProcessingStatusRef.current({
          status: 'error',
          message: 'Unknown status from main process',
        });
      }
    };

    const handleBackendModeUpdateIPC = (newMode: IgnoreMode) => {
      console.info('[App] Backend signaled ignore mode update:', newMode);
    };

    window.electron.ipcRenderer.on('folder-selected', handleFolderSelectedIPC);
    window.electron.ipcRenderer.on('file-list-data', handleFileListDataIPC);
    window.electron.ipcRenderer.on('file-processing-status', handleProcessingStatusIPC);
    window.electron.ipcRenderer.on('ignore-mode-updated', handleBackendModeUpdateIPC);

    return () => {
      window.electron.ipcRenderer.removeListener('folder-selected', handleFolderSelectedIPC);
      window.electron.ipcRenderer.removeListener('file-list-data', handleFileListDataIPC);
      window.electron.ipcRenderer.removeListener(
        'file-processing-status',
        handleProcessingStatusIPC
      );
      window.electron.ipcRenderer.removeListener('ignore-mode-updated', handleBackendModeUpdateIPC);
    };
  }, [isElectron]);

  /* ============================== HANDLERS & UTILITIES (MODIFIED/NEW) ============================== */

  /**
   * Handles closing the ignore patterns viewer and conditionally reloading the app
   * @param changesMade - Whether ignore patterns were modified, requiring a reload
   * @remarks The setTimeout wrapping window.location.reload() allows the UI to update
   * with the "Applying ignore mode..." status message before the reload occurs
   */
  const handleIgnoreViewerClose = useCallback(
    (changesMade?: boolean) => {
      closeIgnoreViewer();
      if (!changesMade) return;

      setProcessingStatus({
        status: 'processing',
        message: 'Applying ignore mode…',
      });

      if (isElectron) {
        console.info('Applying ignore mode:');
        window.electron.ipcRenderer.send('set-ignore-mode', ignoreMode);
        window.electron.ipcRenderer.send('clear-ignore-cache');

        if (changesMade) {
          // Use setTimeout to allow UI to update with "Applying ignore mode..." status before reload
          // Increased timeout to 800ms to ensure UI updates are visible
          setTimeout(() => window.location.reload(), 800);
        }
      }
    },
    [isElectron, closeIgnoreViewer, ignoreMode]
  );

  const cancelDirectoryLoading = useCallback(() => {
    if (isElectron) {
      window.electron.ipcRenderer.send('cancel-directory-loading');
      setProcessingStatus({
        status: 'idle',
        message: 'Directory loading cancelled',
      });
    }
  }, [isElectron]);

  const openFolder = () => {
    if (isElectron) {
      console.log('Opening folder dialog');
      setProcessingStatus({ status: 'idle', message: 'Select a folder...' });
      // Send the last selected folder to the main process for smarter defaultPath logic
      window.electron.ipcRenderer.send('open-folder', {
        lastSelectedFolder: selectedFolder,
      });
    } else {
      console.warn('Folder selection not available in browser');
    }
  };

  // Apply filters and sorting to files
  const applyFiltersAndSort = useCallback(
    (files: FileData[], sort: string, filter: string) => {
      let filtered = files;

      // Apply filter
      if (filter) {
        const lowerFilter = filter.toLowerCase();
        filtered = files.filter(
          (file) =>
            file.name.toLowerCase().includes(lowerFilter) ||
            file.path.toLowerCase().includes(lowerFilter)
        );
      }

      // Apply sort
      const [sortKey, sortDir] = sort.split('-');
      const sorted = [...filtered].sort((a, b) => {
        let comparison = 0;

        if (sortKey === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortKey === 'tokens') {
          comparison = a.tokenCount - b.tokenCount;
        } else if (sortKey === 'size') {
          comparison = a.size - b.size;
        }

        return sortDir === 'asc' ? comparison : -comparison;
      });

      setDisplayedFiles(sorted);
    },
    [setDisplayedFiles]
  );

  // Apply filters and sort whenever relevant state changes
  useEffect(() => {
    applyFiltersAndSort(allFiles, sortOrder, searchTerm);
  }, [applyFiltersAndSort, allFiles, sortOrder, searchTerm]); // Added all dependencies

  // File event handlers with proper typing
  const handleFileAdded = useCallback((newFile: FileData) => {
    console.log('<<< IPC Event Received: file-added >>> Data:', JSON.stringify(newFile));
    setAllFiles((prevFiles: FileData[]) =>
      prevFiles.some((f) => arePathsEqual(f.path, newFile.path))
        ? prevFiles
        : [...prevFiles, newFile]
    );
  }, []);

  const handleFileUpdated = useCallback((updatedFile: FileData) => {
    console.log('<<< IPC Event Received: file-updated >>> Data:', JSON.stringify(updatedFile));
    setAllFiles((prevFiles: FileData[]) =>
      prevFiles.map((file) => (arePathsEqual(file.path, updatedFile.path) ? updatedFile : file))
    );
  }, []);

  const handleFileRemoved = useCallback(
    (filePathData: { path: string; relativePath: string } | string) => {
      const path = typeof filePathData === 'object' ? filePathData.path : filePathData;
      const normalizedPath = normalizePath(path);
      setAllFiles((prevFiles: FileData[]) =>
        prevFiles.filter((file) => !arePathsEqual(file.path, normalizedPath))
      );
      setSelectedFiles((prevSelected: string[]) =>
        prevSelected.filter((p) => !arePathsEqual(p, normalizedPath))
      );
    },
    []
  );

  // Stable IPC listeners
  useEffect(() => {
    if (!isElectron) return;

    const listeners = [
      { event: 'file-added', handler: handleFileAdded },
      { event: 'file-updated', handler: handleFileUpdated },
      { event: 'file-removed', handler: handleFileRemoved },
    ];

    listeners.forEach(({ event, handler }) => window.electron.ipcRenderer.on(event, handler));

    return () => {
      listeners.forEach(({ event, handler }) =>
        window.electron.ipcRenderer.removeListener(event, handler)
      );
    };
  }, [isElectron, handleFileAdded, handleFileUpdated, handleFileRemoved]);

  // Toggle file selection
  const toggleFileSelection = (filePath: string) => {
    // Normalize the incoming file path
    const normalizedPath = normalizePath(filePath);

    const f = allFiles.find((f: FileData) => arePathsEqual(f.path, normalizedPath));
    if (f?.isBinary && !includeBinaryPaths) {
      return;
    }

    setSelectedFiles((prev: string[]) => {
      // Check if the file is already selected using case-sensitive/insensitive comparison as appropriate
      const isSelected = prev.some((path) => arePathsEqual(path, normalizedPath));

      if (isSelected) {
        // Remove the file from selected files
        return prev.filter((path: string) => !arePathsEqual(path, normalizedPath));
      } else {
        // Add the file to selected files
        return [...prev, normalizedPath];
      }
    });
  };

  // Toggle folder selection (select/deselect all files in folder)
  const toggleFolderSelection = (folderPath: string, isSelected: boolean) => {
    // Normalize the folder path for cross-platform compatibility
    const normalizedFolderPath = normalizePath(folderPath);

    // Function to check if a file is in the given folder or its subfolders
    const isFileInFolder = (filePath: string, folderPath: string): boolean => {
      // Ensure paths are normalized with consistent slashes
      let normalizedFilePath = normalizePath(filePath);
      let normalizedFolderPath = normalizePath(folderPath);

      // Add leading slash to absolute paths if missing (common on macOS)
      if (!normalizedFilePath.startsWith('/') && !normalizedFilePath.match(/^[a-z]:/i)) {
        normalizedFilePath = '/' + normalizedFilePath;
      }

      if (!normalizedFolderPath.startsWith('/') && !normalizedFolderPath.match(/^[a-z]:/i)) {
        normalizedFolderPath = '/' + normalizedFolderPath;
      }

      // A file is in the folder if:
      // 1. The paths are equal (exact match)
      // 2. The file path is a subpath of the folder
      const isMatch =
        arePathsEqual(normalizedFilePath, normalizedFolderPath) ||
        isSubPath(normalizedFolderPath, normalizedFilePath);

      if (isMatch) {
        // File is in folder
      }

      return isMatch;
    };

    // Filter all files to get only those in this folder (and subfolders) that are selectable
    const filesInFolder = allFiles.filter((file: FileData) => {
      const inFolder = isFileInFolder(file.path, normalizedFolderPath);
      const selectable =
        !file.isSkipped && !file.excludedByDefault && (includeBinaryPaths || !file.isBinary);
      return selectable && inFolder;
    });

    console.log('Found', filesInFolder.length, 'selectable files in folder');

    // If no selectable files were found, do nothing
    if (filesInFolder.length === 0) {
      console.warn('No selectable files found in folder, nothing to do');
      return;
    }

    // Extract just the paths from the files and normalize them
    const folderFilePaths = filesInFolder.map((file: FileData) => normalizePath(file.path));

    if (isSelected) {
      // Adding files - create a new Set with all existing + new files
      setSelectedFiles((prev: string[]) => {
        const existingSelection = new Set(prev.map(normalizePath));
        folderFilePaths.forEach((pathToAdd: string) => existingSelection.add(pathToAdd));
        const newSelection = Array.from(existingSelection);
        console.log(
          `Added ${folderFilePaths.length} files to selection, total now: ${newSelection.length}`
        );
        return newSelection;
      });
    } else {
      // Removing files - filter out any file that's in our folder
      setSelectedFiles((prev: string[]) => {
        const newSelection = prev.filter(
          (path: string) => !isFileInFolder(path, normalizedFolderPath)
        );
        return newSelection;
      });
    }
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    setSortOrder(newSort);
    // applyFiltersAndSort(allFiles, newSort, searchTerm); // Let the useEffect handle this
    setSortDropdownOpen(false); // Close dropdown after selection
  };

  // Handle search change
  const handleSearchChange = (newSearch: string) => {
    setSearchTerm(newSearch);
    // applyFiltersAndSort(allFiles, sortOrder, newSearch); // Let the useEffect handle this
  };

  // Toggle sort dropdown
  const toggleSortDropdown = () => {
    setSortDropdownOpen(!sortDropdownOpen);
  };

  /**
   * State for storing user instructions
   * This text will be appended at the end of all copied content
   * to provide context or special notes to recipients
   */

  /**
   * Assembles the final content for copying using cached base content
   * @returns {string} The concatenated content ready for copying
   */
  const getSelectedFilesContent = () => {
    return (
      cachedBaseContentString +
      (cachedBaseContentString && userInstructions.trim() ? '\n\n' : '') +
      formatUserInstructionsBlock(userInstructions)
    );
  };

  // Handle select all files
  const selectAllFiles = () => {
    console.time('selectAllFiles');
    try {
      const selectablePaths = displayedFiles
        .filter((file: FileData) => !file.isSkipped && (includeBinaryPaths || !file.isBinary))
        .map((file: FileData) => normalizePath(file.path)); // Normalize paths here

      setSelectedFiles((prev: string[]) => {
        const normalizedPrev = prev.map(normalizePath); // Normalize existing selection
        const newSelection = [...normalizedPrev];
        selectablePaths.forEach((pathToAdd: string) => {
          // Use arePathsEqual for checking existence
          if (!newSelection.some((existingPath) => arePathsEqual(existingPath, pathToAdd))) {
            newSelection.push(pathToAdd);
          }
        });
        return newSelection;
      });
    } finally {
      console.timeEnd('selectAllFiles');
    }
  };

  // Handle deselect all files
  const deselectAllFiles = () => {
    const displayedPathsToDeselect = displayedFiles.map((file: FileData) =>
      normalizePath(file.path)
    ); // Normalize paths to deselect
    setSelectedFiles((prev: string[]) => {
      const normalizedPrev = prev.map(normalizePath); // Normalize existing selection
      // Use arePathsEqual for filtering
      return normalizedPrev.filter(
        (selectedPath: string) =>
          !displayedPathsToDeselect.some(
            (deselectPath: string) => arePathsEqual(selectedPath, deselectPath) // Add type annotation
          )
      );
    });
  };

  // Sort options for the dropdown
  const sortOptions = [
    { value: 'tokens-desc', label: 'Tokens: High to Low' },
    { value: 'tokens-asc', label: 'Tokens: Low to High' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
  ];

  // Handle expand/collapse state changes
  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev: Record<string, boolean>) => {
      const newState = {
        ...prev,
        [nodeId]: prev[nodeId] === undefined ? false : !prev[nodeId],
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.EXPANDED_NODES, JSON.stringify(newState));

      return newState;
    });
  };

  // Cache base content when file selections or formatting options change
  useEffect(() => {
    const updateBaseContent = async () => {
      const baseContent = formatBaseFileContent({
        files: allFiles,
        selectedFiles,
        sortOrder,
        includeFileTree,
        includeBinaryPaths,
        selectedFolder,
      });

      setCachedBaseContentString(baseContent);

      if (isElectron && baseContent) {
        try {
          const result = await window.electron.ipcRenderer.invoke('get-token-count', baseContent);
          if (result?.tokenCount !== undefined) {
            setCachedBaseContentTokens(result.tokenCount);
          }
        } catch (error) {
          console.error('Error getting base content token count:', error);
          setCachedBaseContentTokens(0);
        }
      } else {
        setCachedBaseContentTokens(0);
      }
    };

    const debounceTimer = setTimeout(updateBaseContent, 300);
    return () => clearTimeout(debounceTimer);
  }, [
    allFiles,
    selectedFiles,
    sortOrder,
    includeFileTree,
    includeBinaryPaths,
    selectedFolder,
    isElectron,
  ]);

  // Calculate total tokens when user instructions change
  useEffect(() => {
    const calculateAndSetTokenCount = async () => {
      const instructionsBlock = formatUserInstructionsBlock(userInstructions);

      if (isElectron) {
        try {
          let totalTokens = cachedBaseContentTokens;

          // Only calculate instruction tokens if there are instructions
          if (instructionsBlock) {
            const instructionResult = await window.electron.ipcRenderer.invoke(
              'get-token-count',
              instructionsBlock
            );
            totalTokens += instructionResult?.tokenCount || 0;
          }

          setTotalFormattedContentTokens(totalTokens);
        } catch (error) {
          console.error('Error getting token count:', error);
          setTotalFormattedContentTokens(0);
        }
      } else {
        setTotalFormattedContentTokens(0);
      }
    };

    const debounceTimer = setTimeout(calculateAndSetTokenCount, 150);
    return () => clearTimeout(debounceTimer);
  }, [userInstructions, cachedBaseContentTokens, isElectron]);

  // ============================== Update Modal State ==============================
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null as UpdateDisplayState | null);
  const initialUpdateCheckAttemptedRef = useRef(false);

  // Store the result of the initial auto update check from main process
  const [initialAutoUpdateResult, setInitialAutoUpdateResult] = useState(
    null as UpdateDisplayState | null
  );

  // Listen for initial-update-status from main process
  useEffect(() => {
    if (!isElectron) return;
    const handler = (result: any) => {
      setInitialAutoUpdateResult(result as UpdateDisplayState);
    };
    window.electron.ipcRenderer.on('initial-update-status', handler);
    return () => {
      window.electron.ipcRenderer.removeListener('initial-update-status', handler);
    };
  }, [isElectron]);

  // Handler for checking updates
  const handleCheckForUpdates = useCallback(async () => {
    setIsUpdateModalOpen(true);

    // Only fetch if not already checked this session or if updateStatus is null/loading
    if (updateStatus && !updateStatus.isLoading && initialUpdateCheckAttemptedRef.current) {
      console.log('Renderer: Modal opened, update status already exists. Not re-invoking IPC.');
      return;
    }

    setUpdateStatus((prevStatus: UpdateDisplayState | null) => ({
      ...(prevStatus || { currentVersion: '', isUpdateAvailable: false }),
      isLoading: true,
    }));

    try {
      const result = await window.electron.ipcRenderer.invoke('check-for-updates');
      setUpdateStatus({
        ...result,
        isLoading: false,
      });
      initialUpdateCheckAttemptedRef.current = true;
    } catch (error: any) {
      setUpdateStatus({
        isLoading: false,
        isUpdateAvailable: false,
        currentVersion: '',
        error: error?.message || 'Unknown error during IPC invoke',
        // debugLogs removed: not part of UpdateDisplayState
      });
      initialUpdateCheckAttemptedRef.current = true;
    }
  }, [updateStatus]);

  // Handle task type change
  const handleTaskTypeChange = (taskTypeId: string) => {
    setSelectedTaskType(taskTypeId);
  };

  // Workspace functions
  const handleOpenWorkspaceManager = () => {
    // Force reload workspaces from localStorage before opening
    const storedWorkspaces = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    if (storedWorkspaces) {
      try {
        const parsed = JSON.parse(storedWorkspaces);
        if (Array.isArray(parsed)) {
          // Update state with a fresh copy from localStorage
          setWorkspaces(parsed);
          console.log('Workspaces refreshed from localStorage before opening manager');
        }
      } catch (error) {
        console.error('Failed to parse workspaces from localStorage:', error);
      }
    }

    // Open the workspace manager
    setIsWorkspaceManagerOpen(true);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    // Find the workspace
    const workspace = workspaces.find((w: Workspace) => w.id === workspaceId);
    if (!workspace) return;

    // Save current workspace id
    localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, workspaceId);
    setCurrentWorkspaceId(workspaceId);

    // Update last used timestamp using functional state update
    setWorkspaces((currentWorkspaces: Workspace[]) => {
      const updatedWorkspaces = currentWorkspaces.map((w: Workspace) =>
        w.id === workspaceId ? { ...w, lastUsed: Date.now() } : w
      );

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(updatedWorkspaces));

      return updatedWorkspaces;
    });

    // If the workspace has a folder associated with it
    if (workspace.folderPath) {
      // Only reload if it's different from the current folder
      if (!arePathsEqual(workspace.folderPath, selectedFolder)) {
        console.log(`Switching to workspace folder: ${workspace.folderPath}`);

        // First set the selected folder
        setSelectedFolder(workspace.folderPath);
        localStorage.setItem(STORAGE_KEYS.SELECTED_FOLDER, workspace.folderPath);

        // Request file data from the main process (if in Electron)
        if (isElectron && !isSafeMode) {
          setProcessingStatus({
            status: 'processing',
            message: 'Loading files...',
          });

          // Ensure we're sending the updated folder path to the main process
          window.electron.ipcRenderer.send('request-file-list', {
            folderPath: workspace.folderPath,
            ignoreMode,
            customIgnores,
          });
        }
      }
    } else {
      // Clear current selection if workspace has no folder
      setSelectedFolder(null);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER);
      setSelectedFiles([]);
      setAllFiles([]);
      setProcessingStatus({
        status: 'idle',
        message: '',
      });
    }

    setIsWorkspaceManagerOpen(false);
  };

  const handleCreateWorkspace = (name: string) => {
    console.log('App: Creating new workspace with name:', name);

    // Create a new workspace with a unique id
    const newWorkspace = {
      id: `workspace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      folderPath: null,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // Add to workspaces list
    setWorkspaces((currentWorkspaces: Workspace[]) => {
      console.log('Updating workspaces state, current count:', currentWorkspaces.length);
      const updatedWorkspaces = [...currentWorkspaces, newWorkspace];
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(updatedWorkspaces));
      console.log('Saved updated workspaces to localStorage, new count:', updatedWorkspaces.length);
      return updatedWorkspaces;
    });

    // Set as current workspace
    localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, newWorkspace.id);
    setCurrentWorkspaceId(newWorkspace.id);
    console.log('Set current workspace ID to:', newWorkspace.id);

    if (selectedFolder) {
      // Show confirmation modal to use current folder
      setConfirmFolderModalDetails({
        workspaceId: newWorkspace.id,
        workspaceName: name,
        folderPath: selectedFolder,
      });
      setIsConfirmUseFolderModalOpen(true);
    } else {
      // No folder selected - proceed with folder selection
      setSelectedFolder(null);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_FILES);
      setSelectedFiles([]);
      setAllFiles([]);
      setProcessingStatus({
        status: 'idle',
        message: '',
      });
      openFolder();
    }

    // Close the workspace manager
    setIsWorkspaceManagerOpen(false);
    console.log('Workspace creation complete, manager closed');
  };

  const handleConfirmUseCurrentFolder = () => {
    if (!confirmFolderModalDetails.workspaceId) return;

    // Update workspace with current folder path
    handleUpdateWorkspaceFolder(
      confirmFolderModalDetails.workspaceId,
      confirmFolderModalDetails.folderPath
    );
    setIsConfirmUseFolderModalOpen(false);
  };

  const handleDeclineUseCurrentFolder = () => {
    setIsConfirmUseFolderModalOpen(false);
    // Clear state and open folder selector
    setSelectedFolder(null);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_FILES);
    setSelectedFiles([]);
    setAllFiles([]);
    setProcessingStatus({
      status: 'idle',
      message: '',
    });
    openFolder();
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    console.log('App: Deleting workspace with ID:', workspaceId);
    // Ensure any open modal is closed first
    setIsConfirmUseFolderModalOpen(false);

    const workspaceBeingDeleted = workspaces.find((w: Workspace) => w.id === workspaceId);
    console.log('Deleting workspace:', workspaceBeingDeleted?.name);

    // Filter out the deleted workspace, using functional update to prevent stale state
    setWorkspaces((currentWorkspaces: Workspace[]) => {
      const filteredWorkspaces = currentWorkspaces.filter((w: Workspace) => w.id !== workspaceId);
      console.log(
        `Filtered workspaces: ${currentWorkspaces.length} -> ${filteredWorkspaces.length}`
      );

      // Save the updated workspaces list to localStorage
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(filteredWorkspaces));
      console.log('Saved filtered workspaces to localStorage');

      // Ensure empty array is properly saved when deleting the last workspace
      if (filteredWorkspaces.length === 0) {
        console.log('No workspaces left, ensuring empty array is saved');
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify([]));
      }

      return filteredWorkspaces;
    });

    // (Removed workspaceManagerVersion increment)

    // If deleting current workspace, clear current selection
    if (currentWorkspaceId === workspaceId) {
      console.log('Deleted the current workspace, clearing workspace state');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
      setCurrentWorkspaceId(null);

      // Also clear folder selection when current workspace is deleted
      setSelectedFolder(null);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER);
      setSelectedFiles([]);
      setAllFiles([]);
      setProcessingStatus({
        status: 'idle',
        message: '',
      });
    }

    console.log('Workspace deletion complete');

    // Important: Keep the workspace manager open so user can create a new workspace immediately
    // The visual update with the deleted workspace removed will happen thanks to our useEffect in WorkspaceManager
  };

  // Handler to update a workspace's folder path
  const handleUpdateWorkspaceFolder = (workspaceId: string, folderPath: string | null) => {
    setWorkspaces((prevWorkspaces: Workspace[]) => {
      const updatedWorkspaces = prevWorkspaces.map((workspace: Workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, folderPath, lastUsed: Date.now() }
          : workspace
      );
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(updatedWorkspaces));
      return updatedWorkspaces;
    });

    // If updating the current workspace, also update the selected folder
    if (currentWorkspaceId === workspaceId) {
      if (folderPath) {
        // Update local storage and request file list
        localStorage.setItem(STORAGE_KEYS.SELECTED_FOLDER, folderPath);
        handleFolderSelected(folderPath);
      } else {
        // Clear folder selection in localStorage and state
        localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER);
        setSelectedFolder(null);
        setSelectedFiles([]);
        setAllFiles([]);
        setProcessingStatus({
          status: 'idle',
          message: '',
        });
      }
    }
  };

  // Get current workspace name for display
  const currentWorkspaceName = currentWorkspaceId
    ? workspaces.find((w: Workspace) => w.id === currentWorkspaceId)?.name || 'Untitled'
    : null;

  // Handle copying content to clipboard
  const handleCopy = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const content = getSelectedFilesContent();
      await navigator.clipboard.writeText(content);
      setProcessingStatus({ status: 'complete', message: 'Copied to clipboard!' });

      // Add to copy history
      const newHistoryItem: CopyHistoryItem = {
        content,
        timestamp: Date.now(),
        label: `${selectedFiles.length} files`,
      };

      const updatedHistory = [newHistoryItem, ...copyHistory].slice(0, 20); // Keep last 20 items
      setCopyHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEYS.COPY_HISTORY, JSON.stringify(updatedHistory));

      // Reset the status after 2 seconds
      setTimeout(() => {
        setProcessingStatus({ status: 'idle', message: '' });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setProcessingStatus({ status: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  // Handle copy from history
  const handleCopyFromHistory = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setProcessingStatus({ status: 'complete', message: 'Copied to clipboard!' });

      // Reset the status after 2 seconds
      setTimeout(() => {
        setProcessingStatus({ status: 'idle', message: '' });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setProcessingStatus({ status: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  // Clear copy history
  const handleClearCopyHistory = () => {
    setCopyHistory([]);
    localStorage.removeItem(STORAGE_KEYS.COPY_HISTORY);
  };

  const handleManageCustomTaskTypes = () => {
    setIsCustomTaskTypeModalOpen(true);
  };

  const handleCustomTaskTypesUpdated = () => {
    // Force reload task types by triggering a re-render with a temporary state update
    // This creates a state change that will cause the TaskTypeSelector to reload custom types
    const currentTaskType = selectedTaskType;
    // Temporarily set to the first default type and then back to selected
    setSelectedTaskType('none');
    setTimeout(() => {
      setSelectedTaskType(currentTaskType);
    }, 50);
  };

  // Handle model selection
  const handleModelSelect = (newModelId: string) => {
    setSelectedModelId(newModelId);
    localStorage.setItem('pastemax-selected-model', newModelId);
    setLlmError(null); // Clear previous errors on new model selection
    console.log('Model selected in App.tsx:', newModelId);
  };

  // Persist workspaces when they change
  useEffect(() => {
    if (workspaces) {
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));

      // Log information for debugging purposes
      console.log(`Workspaces updated: ${workspaces.length} workspaces saved to localStorage`);

      // If we have a current workspace, ensure it still exists in the workspaces array
      if (currentWorkspaceId && !workspaces.some((w: Workspace) => w.id === currentWorkspaceId)) {
        console.log('Current workspace no longer exists, clearing currentWorkspaceId');
        localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
        setCurrentWorkspaceId(null);
      }
    }
  }, [workspaces, currentWorkspaceId]);

  /* ============================== LLM/CHAT HANDLERS (MODIFIED/NEW) ============================== */

  /**
   * Opens the LLM settings modal
   */
  const handleOpenLlmSettings = () => {
    setIsLlmSettingsModalOpen(true);
  };

  const handleSaveAllLlmConfigs = async (configs: AllLlmConfigs) => {
    // NEW
    try {
      localStorage.setItem(STORAGE_KEYS.ALL_LLM_CONFIGS, JSON.stringify(configs));
      setAllLlmConfigs(configs);
      console.log('All LLM configurations saved.');
    } catch (error) {
      console.error('Error saving LLM configurations:', error);
    }
  };

  // OLD handleSaveLlmConfig - to be deprecated or refactored if IPC still uses it.
  // For now, the modal will use handleSaveAllLlmConfigs.
  const handleSaveLlmConfig = async (config: LlmConfig) => {
    console.warn("Old 'handleSaveLlmConfig' called. Adapting to new structure.", config);
    if (config.provider && allLlmConfigs) {
      const providerKey = config.provider as LlmProvider; // Cast to LlmProvider
      const newProviderConfig: ProviderSpecificConfig = {
        apiKey: config.apiKey,
        defaultModel: config.modelName,
        baseUrl: config.baseUrl,
      };
      const updatedConfigs = {
        ...allLlmConfigs,
        [providerKey]: newProviderConfig,
      };
      await handleSaveAllLlmConfigs(updatedConfigs);
    } else {
      console.error('Cannot adapt old LLM config save: provider or allLlmConfigs missing.');
    }
  };

  /**
   * Opens the chat view for a specified target (file, selection, or general)
   */
  const handleOpenChatView = (target?: ChatTarget) => {
    // If already have a session in progress, use it
    // Otherwise create a new one
    let sessionId = currentChatSessionId;

    if (!sessionId || !isChatViewOpen) {
      sessionId = createNewChatSession(target);
    }

    // Reset messages for the new session
    setChatMessages([]);
    setChatTarget(target);
    setLlmError(null);

    // If a target is provided, create an initial system message
    if (target) {
      const systemMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'system',
        content: getSystemPromptForTarget(target),
        timestamp: Date.now(),
      };
      setChatMessages([systemMessage]);

      // Update the session with the system message
      setTimeout(() => {
        updateCurrentSession([systemMessage]);
      }, 0);
    }

    setIsChatViewOpen(true);
  };

  /**
   * Generates an appropriate system prompt based on the chat target
   */
  const getSystemPromptForTarget = (target: ChatTarget): string => {
    let contextInfo = '';

    switch (target.type) {
      case 'file':
        contextInfo = `\n\n## Context\nYou are discussing the following file: ${
          target.fileName || 'Unnamed file'
        }. Here is its content:\n\n\`\`\`\n${target.content}\n\`\`\``;
        break;
      case 'selection':
        contextInfo = `\n\n## Context\nYou are discussing the following code/text selection:\n\n\`\`\`\n${target.content}\n\`\`\``;
        break;
      case 'general':
      default:
        contextInfo = '\n\n## Context\nThe user is working with the PasteMax application.';
        break;
    }

    // Return the custom system prompt with context appended
    return systemPrompt + contextInfo;
  };

  /**
   * Sends a user message to the LLM and processes the response
   */
  const handleSendMessage = async (messageContent: string) => {
    console.log('[App.tsx] handleSendMessage triggered.'); // New Log
    console.log('[App.tsx] Current selectedModelId state:', selectedModelId); // New Log

    if (!selectedModelId) {
      setLlmError('No model selected. Please select a model from the dropdown.');
      setIsLlmLoading(false);
      return;
    }
    const currentProvider = getProviderFromModelId(selectedModelId);
    const actualModelName = getActualModelName(selectedModelId);

    console.log('[App.tsx] Derived provider:', currentProvider); // New Log
    console.log('[App.tsx] Derived actualModelName:', actualModelName); // New Log

    if (!currentProvider) {
      setLlmError(
        `Could not determine provider for model: "${selectedModelId}". Ensure it's selected correctly or configured.`
      );
      setIsLlmLoading(false);
      return;
    }
    if (
      !allLlmConfigs ||
      !allLlmConfigs[currentProvider] ||
      !allLlmConfigs[currentProvider]?.apiKey
    ) {
      console.error(
        '[App.tsx] API key or config missing for provider:',
        currentProvider,
        'All Configs:',
        allLlmConfigs
      ); // New Log
      setLlmError(
        `API key for ${currentProvider} is not configured. Please go to LLM Settings for ${currentProvider} to add it.`
      );
      setIsLlmLoading(false);
      return;
    }
    const providerConfig = allLlmConfigs[currentProvider];
    console.log('[App.tsx] Using providerConfig:', providerConfig); // New Log

    if (!providerConfig?.apiKey) {
      setLlmError(
        `Configuration or API key for ${currentProvider} is missing. Please configure it in LLM Settings.`
      );
      setIsLlmLoading(false);
      return;
    }

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };
    const currentChatMessagesState = [...chatMessages, userMessage];
    setChatMessages(currentChatMessagesState);
    updateCurrentSession(currentChatMessagesState);
    setIsLlmLoading(true);
    setLlmError(null);

    try {
      const plainMessagesForLlm = currentChatMessagesState.map((m) => ({
        role: m.role as MessageRole,
        content: m.content,
      }));

      let messagesToSend: { role: MessageRole; content: string }[];

      // Check if the *current* message list already starts with a system message.
      // This would be the one added by handleOpenChatView (getSystemPromptForTarget).
      if (plainMessagesForLlm.length > 0 && plainMessagesForLlm[0].role === 'system') {
        messagesToSend = plainMessagesForLlm;
      } else if (systemPrompt) {
        // If not, and we have a global systemPrompt, prepend that.
        messagesToSend = [
          { role: 'system' as MessageRole, content: systemPrompt },
          ...plainMessagesForLlm,
        ];
      } else {
        messagesToSend = plainMessagesForLlm;
      }

      if (!window.llmApi) {
        throw new Error('LLM API bridge (window.llmApi) is not available. Check preload script.');
      }

      const response = await window.llmApi.sendPrompt({
        messages: messagesToSend.slice(-20), // Send up to the last 20 messages
        provider: currentProvider,
        model: actualModelName,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
      });

      if (response.error) {
        throw new Error(response.error);
      }
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      updateCurrentSession([...currentChatMessagesState, assistantMessage]);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Failed to get response from LLM.';
      setLlmError(err);
      const errorMsgForChat: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Error: ${err}`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsgForChat]);
    } finally {
      setIsLlmLoading(false);
    }
  };

  /**
   * Copies a message's content to the clipboard
   */
  const handleCopyResponse = (messageId: string) => {
    const message = chatMessages.find((msg) => msg.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
      // Optionally add a toast or notification here
    }
  };

  /**
   * Accepts an AI response and saves it to the original file
   */
  const handleAcceptAndSave = async (messageId: string) => {
    if (!chatTarget?.filePath) {
      setLlmError('No file target specified for saving.');
      return;
    }

    const message = chatMessages.find((msg) => msg.id === messageId);
    if (!message) {
      setLlmError('Message not found.');
      return;
    }

    setIsLlmLoading(true);
    setLlmError(null);

    try {
      if (window.llmApi) {
        const result = await window.llmApi.saveFile({
          filePath: chatTarget.filePath,
          content: message.content,
        });

        if (result.success) {
          // Close the chat view after successful save
          setIsChatViewOpen(false);

          // Refresh the file list if needed
          setReloadTrigger((prev) => prev + 1);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setLlmError(error instanceof Error ? error.message : 'Failed to save file');
    } finally {
      setIsLlmLoading(false);
    }
  };

  /**
   * Opens chat for a selected file
   */
  const handleChatAboutFile = (filePath: string) => {
    // Find the file in allFiles
    const file = allFiles.find((f) => f.path === filePath);
    if (!file) return;

    // Create chat target
    const chatTarget: ChatTarget = {
      type: 'file',
      filePath: file.path,
      fileName: file.name,
      content: file.content || '',
    };

    handleOpenChatView(chatTarget);
  };

  /**
   * Opens a general chat (not specific to any file)
   */
  const handleOpenGeneralChat = () => {
    const sessionToOpen = currentChatSessionId
      ? chatSessions.find((s) => s.id === currentChatSessionId)
      : null;

    if (sessionToOpen) {
      // Open existing session
      selectChatSession(sessionToOpen.id); // This loads messages and target
      setLlmError(null);
      setIsChatViewOpen(true);
    } else {
      // No current session or session not found, create a new general chat
      const generalChatTarget: ChatTarget = { type: 'general', content: '' };

      // createNewChatSession sets currentChatSessionId and adds session to chatSessions
      // It also correctly sets the targetType for the new session.
      createNewChatSession(generalChatTarget);

      const systemMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'system',
        content: getSystemPromptForTarget(generalChatTarget), // Use the specific general target
        timestamp: Date.now(),
      };

      setChatMessages([systemMessage]); // Set messages for the UI for the new chat
      setChatTarget(generalChatTarget); // Set target for the UI for the new chat
      setLlmError(null);
      setIsChatViewOpen(true);

      // After UI state is set, update the session in chatSessions with the initial message
      // createNewChatSession already set currentChatSessionId to the new session's ID.
      // updateCurrentSession uses this currentChatSessionId.
      setTimeout(() => {
        updateCurrentSession(chatMessages);
      }, 0);
    }
  };

  /* ============================== RENDER FUNCTIONS ============================== */

  // Add after other useEffects
  /**
   * Loads the system prompt from localStorage
   */
  useEffect(() => {
    const savedSystemPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
  }, []);

  // Add handler functions
  /**
   * Opens the system prompt editor modal
   */
  const handleOpenSystemPromptEditor = () => {
    setIsSystemPromptEditorOpen(true);
  };

  /**
   * Saves the system prompt and updates localStorage
   */
  const handleSaveSystemPrompt = (newSystemPrompt: string) => {
    setSystemPrompt(newSystemPrompt);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, newSystemPrompt);
  };

  /**
   * Resets the system prompt to the default value
   */
  const handleResetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT);
  };

  // Save chat sessions to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  // Save current chat session ID to localStorage when it changes
  useEffect(() => {
    if (currentChatSessionId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT_SESSION, currentChatSessionId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAT_SESSION);
    }
  }, [currentChatSessionId]);

  // Update current session with new messages when chatMessages changes
  useEffect(() => {
    if (currentChatSessionId && chatMessages.length > 0) {
      updateCurrentSession(chatMessages);
    }
  }, [chatMessages]);

  /**
   * Creates a unique ID for various entities
   */
  const generateId = (prefix = '') => {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  /**
   * Creates a unique ID for chat messages
   */
  const generateMessageId = () => {
    return generateId('msg_');
  };

  /**
   * Updates the current session with the new messages
   */
  const updateCurrentSession = (messages: ChatMessage[]) => {
    if (!currentChatSessionId) return;

    // Find the first user message to create a preview
    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    let userPreview: string | undefined;
    if (firstUserMessage?.content) {
      userPreview = firstUserMessage.content.substring(0, 40);
      if (firstUserMessage.content.length > 40) {
        userPreview += '...';
      }
    }

    setChatSessions((prevSessions) => {
      const updatedSessions = prevSessions.map((session) => {
        if (session.id === currentChatSessionId) {
          // Determine the title based on target type and user preview
          let title = session.title; // Keep existing title by default
          if (userPreview) {
            title = userPreview; // Prefer user preview if available
          } else if (session.targetType === 'file') {
            title = session.targetName ? `File: ${session.targetName}` : 'File Chat';
          } else if (session.targetType === 'selection') {
            title = 'Selection Chat';
          } else if (!session.messages.some((m) => m.role === 'user')) {
            // If no user messages yet, but it's not a targeted chat, it's a new general chat
            title = 'New Chat';
          }

          return {
            ...session,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            })),
            lastUpdated: Date.now(),
            userPreview: userPreview, // Update the preview
            title: title, // Update the title
          };
        }
        return session;
      });

      return updatedSessions;
    });
  };

  /**
   * Creates a new chat session and sets it as the current session
   */
  const createNewChatSession = (target?: ChatTarget) => {
    const sessionId = generateId('session_');
    let sessionTitle: string;
    const userPreview: string | undefined = undefined; // Always undefined for a brand new chat

    if (target?.type === 'file') {
      sessionTitle = target.fileName ? `File: ${target.fileName}` : 'File Chat';
    } else if (target?.type === 'selection') {
      sessionTitle = 'Selection Chat';
    } else {
      sessionTitle = 'New Chat'; // Default for general new chats
    }

    const newSession: ChatSession = {
      id: sessionId,
      title: sessionTitle,
      lastUpdated: Date.now(),
      messages: [], // New session starts with no messages
      targetType: target?.type,
      targetName: target?.fileName || undefined,
      userPreview: userPreview,
    };

    setChatSessions((prevSessions) => [newSession, ...prevSessions]);
    setCurrentChatSessionId(sessionId);

    return sessionId;
  };

  /**
   * Selects an existing chat session
   */
  const selectChatSession = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (!session) return;

    setCurrentChatSessionId(sessionId);

    // Reconstruct chatMessages from session messages
    const reconstructedMessages = session.messages.map((msg) => ({
      id: generateMessageId(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));

    setChatMessages(reconstructedMessages);

    // Recreate the chat target if it exists
    if (session.targetType) {
      const target: ChatTarget = {
        type: session.targetType,
        content: '',
        fileName: session.targetName,
      };

      // If it's a file chat, try to find file content
      if (session.targetType === 'file' && session.targetName) {
        const file = allFiles.find((f) => f.name === session.targetName);
        if (file) {
          target.filePath = file.path;
          target.content = file.content || '';
        }
      }

      setChatTarget(target);
    }
  };

  /**
   * Deletes a chat session
   */
  const deleteChatSession = (sessionId: string) => {
    setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== sessionId));

    // If deleting the current session, clear current session
    if (currentChatSessionId === sessionId) {
      setCurrentChatSessionId(null);
      setChatMessages([]);
      setChatTarget(undefined);
    }
  };

  /**
   * Handles creating a new chat
   */
  const handleCreateNewChat = () => {
    // Create a new chat session (general type if not specified)
    createNewChatSession();

    // Reset chat state
    setChatMessages([]);
    setChatTarget({ type: 'general', content: '' });
    setLlmError(null);
  };

  // Make sure the LlmSettingsModal props are updated in the JSX:

  // In the JSX:
  // <LlmSettingsModal
  //   isOpen={isLlmSettingsModalOpen}
  //   onClose={() => setIsLlmSettingsModalOpen(false)}
  //   initialConfigs={allLlmConfigs} // MODIFIED
  //   onSaveAllConfigs={handleSaveAllLlmConfigs} // MODIFIED
  //   onOpenSystemPromptEditor={handleOpenSystemPromptEditor}
  // />

  // Update any UI elements that check for LLM configuration
  const isAnyLlmConfigured = (): boolean => {
    if (!allLlmConfigs) return false;
    return Object.values(allLlmConfigs).some((providerConfig) => !!providerConfig.apiKey);
  };

  // ChatButton in header example:
  // <ChatButton
  //   disabled={!isAnyLlmConfigured()}
  //   title={isAnyLlmConfigured() ? "Open AI Chat" : "Configure LLM Settings to enable Chat"}
  // />

  // FileList isLlmConfigured prop example:
  // <FileList isLlmConfigured={isAnyLlmConfigured()} />

  // ChatView isLlmConfigured prop example:
  // <ChatView isLlmConfigured={isAnyLlmConfigured()} />

  // Placeholder for clearSavedState - Implement or remove button
  const clearSavedState = useCallback(() => {
    console.log('Clearing saved state for current context...');

    const keysToPreserve = [
      STORAGE_KEYS.WORKSPACES,
      STORAGE_KEYS.TASK_TYPE,
      STORAGE_KEYS.IGNORE_MODE,
      STORAGE_KEYS.IGNORE_SETTINGS_MODIFIED,
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.WINDOW_SIZES,
      STORAGE_KEYS.ALL_LLM_CONFIGS,
      STORAGE_KEYS.SYSTEM_PROMPT,
      STORAGE_KEYS.CHAT_HISTORY, // Preserves the list of all chat sessions
      STORAGE_KEYS.RECENT_FOLDERS,
      // 'pastemax-selected-model' is not in STORAGE_KEYS and will be preserved by not touching it.
    ];

    // Clear localStorage keys not in keysToPreserve
    for (const key in STORAGE_KEYS) {
      const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
      if (!keysToPreserve.includes(storageKey)) {
        localStorage.removeItem(storageKey);
      }
    }

    // Clear session storage if used
    sessionStorage.removeItem('hasLoadedInitialData');

    // Reset React states
    setSelectedFolder(null);
    setAllFiles([]);
    setSelectedFiles([]); // Clears all selected files
    setDisplayedFiles([]);
    setSearchTerm('');
    setSortOrder('tokens-desc'); // Default sort order
    setExpandedNodes({});
    setIncludeFileTree(false);
    setIncludeBinaryPaths(false); // Default value, as its localStorage key is cleared
    setUserInstructions('');
    setCachedBaseContentString('');
    setCachedBaseContentTokens(0);
    setTotalFormattedContentTokens(0);

    // Reset chat related states for current context
    setChatMessages([]);
    setChatTarget(undefined);
    setLlmError(null);
    setCurrentChatSessionId(null); // current session is cleared, but history preserved.

    // Reset current workspace context
    // localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE); // Already removed by the loop above
    setCurrentWorkspaceId(null);

    // Restore task type if it was saved (TASK_TYPE key is in keysToPreserve)
    const savedTaskType = localStorage.getItem(STORAGE_KEYS.TASK_TYPE);
    setSelectedTaskType(savedTaskType || '');

    if (isElectron) {
      window.electron.ipcRenderer.send('cancel-directory-loading');
      // Assuming 'clear-main-cache' is a valid IPC message handled by the main process
      window.electron.ipcRenderer.send('clear-main-cache');
    }

    setProcessingStatus({
      status: 'idle',
      message: 'Current folder data and selections cleared.',
    });

    console.log('Finished clearing saved state for current context.');
  }, [
    isElectron,
    setSelectedFolder,
    setAllFiles,
    setSelectedFiles,
    setDisplayedFiles,
    setSearchTerm,
    setSortOrder,
    setExpandedNodes,
    setIncludeFileTree,
    setIncludeBinaryPaths,
    setUserInstructions,
    setCachedBaseContentString,
    setCachedBaseContentTokens,
    setTotalFormattedContentTokens,
    setProcessingStatus,
    setCurrentWorkspaceId,
    setSelectedTaskType,
    setChatMessages,
    setChatTarget,
    setLlmError,
    setCurrentChatSessionId,
    // STORAGE_KEYS is a constant, not needed in deps
  ]);

  return (
    <ThemeProvider>
      <div className="app-container">
        <header className="header">
          <h1>PasteMax</h1>
          <div className="header-actions">
            <ThemeToggle />
            <button
              className="llm-settings-button"
              onClick={handleOpenLlmSettings}
              title="Configure LLM Settings"
            >
              <MessageSquare size={16} />
              <span>LLM Settings</span>
            </button>
            <ChatButton
              onClick={handleOpenGeneralChat}
              className="header-chat-button"
              text="Chat with AI"
              disabled={!isAnyLlmConfigured()}
              title={isAnyLlmConfigured() ? 'Open AI Chat' : 'Configure LLM to enable Chat'}
            />
            <div className="folder-info">
              {selectedFolder ? (
                <div className="selected-folder">{selectedFolder}</div>
              ) : (
                <span>No folder selected</span>
              )}
              <button
                className="select-folder-btn"
                onClick={openFolder}
                disabled={processingStatus.status === 'processing'}
                title="Select a Folder to import"
              >
                Select Folder
              </button>
              <button
                className="clear-data-btn"
                onClick={clearSavedState}
                title="Clear all saved data and start fresh"
              >
                Clear All
              </button>
              <button
                className="refresh-list-btn"
                onClick={() => {
                  if (selectedFolder) {
                    setReloadTrigger((prev: number) => prev + 1);
                  }
                }}
                disabled={processingStatus.status === 'processing' || !selectedFolder}
                title="Refresh the current file list"
              >
                Refresh
              </button>
              <button
                onClick={handleViewIgnorePatterns}
                title="View Applied Ignore Rules"
                className="view-ignores-btn"
              >
                Ignore Filters
              </button>
              <button
                className="workspace-button"
                title="Workspace Manager"
                onClick={handleOpenWorkspaceManager}
              >
                <FolderKanban size={16} />
                {currentWorkspaceName ? (
                  <span className="current-workspace-name">{currentWorkspaceName}</span>
                ) : (
                  'Workspaces'
                )}
              </button>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginLeft: 8,
                }}
              >
                <button
                  className={`header-action-btn check-updates-button${initialAutoUpdateResult?.isUpdateAvailable && !isUpdateModalOpen ? ' update-available' : ''}`}
                  title="Check for application updates"
                  onClick={handleCheckForUpdates}
                >
                  <DownloadCloud size={16} />
                </button>
                {/* Show update available indicator if auto check found an update and modal is not open */}
                {initialAutoUpdateResult?.isUpdateAvailable && !isUpdateModalOpen && (
                  <div
                    style={{
                      color: 'var(--color-accent, #2da6fc)',
                      fontWeight: 600,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                    data-testid="update-available-indicator"
                  >
                    Update Available!
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {processingStatus.status === 'processing' && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>{processingStatus.message}</span>
            {processingStatus.message !== 'Applying ignore mode…' && (
              <button className="cancel-btn" onClick={cancelDirectoryLoading}>
                Cancel
              </button>
            )}
          </div>
        )}

        {processingStatus.status === 'error' && (
          <div className="error-message">Error: {processingStatus.message}</div>
        )}

        {/* Main content area - always rendered regardless of whether a folder is selected */}
        <div className="main-content">
          {/* Render Sidebar if folder selected, otherwise show empty sidebar with task type selector */}
          {selectedFolder ? (
            <Sidebar
              selectedFolder={selectedFolder}
              allFiles={allFiles}
              selectedFiles={selectedFiles}
              toggleFileSelection={toggleFileSelection}
              toggleFolderSelection={toggleFolderSelection}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              selectAllFiles={selectAllFiles}
              deselectAllFiles={deselectAllFiles}
              expandedNodes={expandedNodes}
              toggleExpanded={toggleExpanded}
              includeBinaryPaths={includeBinaryPaths}
              selectedTaskType={selectedTaskType}
              onTaskTypeChange={handleTaskTypeChange}
              onManageCustomTypes={handleManageCustomTaskTypes}
              currentWorkspaceName={currentWorkspaceName}
            />
          ) : (
            <div className="sidebar" style={{ width: '300px' }}>
              {/* Task Type Selector - always visible */}
              <TaskTypeSelector
                selectedTaskType={selectedTaskType}
                onTaskTypeChange={handleTaskTypeChange}
                onManageCustomTypes={handleManageCustomTaskTypes}
              />

              <div className="sidebar-header">
                <div className="sidebar-title">Files</div>
              </div>

              <div className="tree-empty">
                No folder selected. Use the "Select Folder" button to choose a project folder.
              </div>

              <div className="sidebar-resize-handle"></div>
            </div>
          )}

          {/* Content area - always visible with appropriate empty states */}
          <div className="content-area">
            <div className="content-header">
              <div className="content-title">Selected Files</div>
              <div className="content-header-actions-group">
                <div className="stats-info">
                  {selectedFolder
                    ? `${displayedFiles.length} files | ~${totalFormattedContentTokens.toLocaleString()} tokens`
                    : '0 files | ~0 tokens'}
                </div>
                {selectedFolder && (
                  <div className="sort-options">
                    <div className="sort-selector-wrapper">
                      <button
                        type="button"
                        className="sort-selector-button"
                        onClick={toggleSortDropdown}
                        aria-haspopup="listbox"
                        aria-expanded={sortDropdownOpen}
                        aria-label="Change sort order"
                      >
                        <span
                          className="sort-icon"
                          aria-hidden="true"
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <ArrowDownUp size={16} />
                        </span>
                        <span id="current-sort-value" className="current-sort">
                          {sortOptions.find((opt) => opt.value === sortOrder)?.label || sortOrder}
                        </span>
                        <span className="dropdown-arrow" aria-hidden="true">
                          {sortDropdownOpen ? '▲' : '▼'}
                        </span>
                      </button>
                      {sortDropdownOpen && (
                        <ul
                          className="sort-dropdown"
                          role="listbox"
                          aria-label="Sort order options"
                        >
                          {sortOptions.map((option) => (
                            <li
                              key={option.value}
                              role="option"
                              aria-selected={option.value === sortOrder}
                              className={`sort-option-item ${option.value === sortOrder ? 'selected' : ''}`}
                            >
                              <button
                                type="button"
                                className="sort-option-button"
                                onClick={() => handleSortChange(option.value)}
                              >
                                {option.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File List - show appropriate message when no folder is selected */}
            <div className="file-list-container">
              {selectedFolder ? (
                <FileList
                  files={displayedFiles}
                  selectedFiles={selectedFiles}
                  toggleFileSelection={toggleFileSelection}
                  onChatAbout={handleChatAboutFile}
                  isLlmConfigured={isAnyLlmConfigured()}
                />
              ) : (
                <div className="file-list-empty">
                  No folder selected. Use the "Select Folder" button to choose a project folder.
                </div>
              )}
            </div>

            {/* User instructions section - always visible */}
            <UserInstructions
              instructions={userInstructions}
              setInstructions={setUserInstructions}
              selectedTaskType={selectedTaskType}
            />

            {/* Model selection dropdown */}
            <div className="model-selection">
              <ModelDropdown
                externalSelectedModelId={selectedModelId}
                onModelSelect={handleModelSelect}
                currentTokenCount={totalFormattedContentTokens}
              />
            </div>

            {/* Copy bar: options left, buttons right */}
            <div className="copy-settings-container">
              <div className="copy-settings-options">
                <div
                  className="toggle-option-item"
                  title="Include File Tree in the Copyable Content"
                >
                  <ToggleSwitch
                    id="includeFileTree"
                    checked={includeFileTree}
                    onChange={(e) => setIncludeFileTree(e.target.checked)}
                  />
                  <label htmlFor="includeFileTree">Include File Tree</label>
                </div>
                <div
                  className="toggle-option-item"
                  title="Include Binary As Paths in the Copyable Content"
                >
                  <ToggleSwitch
                    id="includeBinaryPaths"
                    checked={includeBinaryPaths}
                    onChange={(e) => setIncludeBinaryPaths(e.target.checked)}
                  />
                  <label htmlFor="includeBinaryPaths">Include Binary As Paths</label>
                </div>
              </div>
              <div className="copy-buttons-group">
                <CopyHistoryButton
                  onClick={() => setIsCopyHistoryModalOpen(true)}
                  className="copy-history-button-position"
                />
                <button
                  className="primary copy-button-main"
                  onClick={handleCopy}
                  disabled={selectedFiles.length === 0}
                >
                  <span className="copy-button-text">
                    COPY ALL SELECTED ({selectedFiles.length} files)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ignore Patterns Viewer Modal */}
        <IgnoreListModal
          isOpen={isIgnoreViewerOpen}
          onClose={handleIgnoreViewerClose}
          patterns={ignorePatterns ?? undefined}
          error={ignorePatternsError ?? undefined}
          selectedFolder={selectedFolder}
          isElectron={isElectron}
          ignoreSettingsModified={ignoreSettingsModified}
        />
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updateStatus={updateStatus}
        />
        {isCustomTaskTypeModalOpen && (
          <CustomTaskTypeModal
            isOpen={isCustomTaskTypeModalOpen}
            onClose={() => setIsCustomTaskTypeModalOpen(false)}
            onTaskTypesUpdated={handleCustomTaskTypesUpdated}
          />
        )}
        <WorkspaceManager
          isOpen={isWorkspaceManagerOpen}
          onClose={() => setIsWorkspaceManagerOpen(false)}
          workspaces={workspaces}
          currentWorkspace={currentWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onUpdateWorkspaceFolder={handleUpdateWorkspaceFolder}
          selectedFolder={selectedFolder}
        />
        <CopyHistoryModal
          isOpen={isCopyHistoryModalOpen}
          onClose={() => setIsCopyHistoryModalOpen(false)}
          copyHistory={copyHistory}
          onCopyItem={handleCopyFromHistory}
          onClearHistory={handleClearCopyHistory}
        />
        <ConfirmUseFolderModal
          isOpen={isConfirmUseFolderModalOpen}
          onClose={() => setIsConfirmUseFolderModalOpen(false)}
          onConfirm={handleConfirmUseCurrentFolder}
          onDecline={handleDeclineUseCurrentFolder}
          workspaceName={confirmFolderModalDetails.workspaceName}
          folderPath={confirmFolderModalDetails.folderPath}
        />

        {/* LLM Settings Modal */}
        {isLlmSettingsModalOpen && (
          <LlmSettingsModal
            isOpen={isLlmSettingsModalOpen}
            onClose={() => setIsLlmSettingsModalOpen(false)}
            initialConfigs={allLlmConfigs}
            onSaveAllConfigs={handleSaveAllLlmConfigs}
            onOpenSystemPromptEditor={handleOpenSystemPromptEditor}
          />
        )}
        {isChatViewOpen && ( // Ensure conditions for rendering ChatView are correct
          <ChatView
            isOpen={isChatViewOpen}
            onClose={() => setIsChatViewOpen(false)}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLlmLoading}
            error={llmError}
            chatTarget={chatTarget}
            isLlmConfigured={isAnyLlmConfigured()}
            selectedModelId={selectedModelId}
            onModelSelect={handleModelSelect}
            onCopyResponse={handleCopyResponse} // ENSURE THIS IS PASSED
            onAcceptAndSave={handleAcceptAndSave} // Ensure handleAcceptAndSave is defined if used
            chatSessions={chatSessions}
            currentSessionId={currentChatSessionId}
            onSelectSession={selectChatSession}
            onDeleteSession={deleteChatSession}
            onCreateNewSession={handleCreateNewChat}
          />
        )}
        {isSystemPromptEditorOpen && (
          <SystemPromptEditor
            isOpen={isSystemPromptEditorOpen}
            onClose={() => setIsSystemPromptEditorOpen(false)}
            initialPrompt={systemPrompt}
            onSave={handleSaveSystemPrompt}
            onResetToDefault={handleResetSystemPrompt}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
