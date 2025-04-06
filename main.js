const { app, BrowserWindow, ipcMain, dialog, globalShortcut, session } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Configuration constants
const MAX_DIRECTORY_LOAD_TIME = 300000; // 5 minutes timeout for large repositories
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size
const CONCURRENT_DIRS = 4;  // Number of directories to process in parallel
const CHUNK_SIZE = 20;      // Number of files to process in one chunk

// Global state
let isLoadingDirectory = false;
let loadingTimeoutId = null;

/**
 * @typedef {Object} DirectoryLoadingProgress
 * @property {number} directories - Number of directories processed
 * @property {number} files - Number of files processed
 */

/**
 * @type {DirectoryLoadingProgress}
 */
let currentProgress = { directories: 0, files: 0 };

// Global caches
const ignoreCache = new Map();  // Cache for ignore filters keyed by normalized root directory
const fileCache = new Map();    // Cache for file metadata keyed by normalized file path
const fileTypeCache = new Map(); // Cache for binary file type detection results

// Add handling for the 'ignore' module
let ignore;
try {
  ignore = require("ignore");
  console.log("Successfully loaded ignore module");
} catch (err) {
  console.error("Failed to load ignore module:", err);
  // Simple fallback implementation for when the ignore module fails to load
  ignore = {
    // Simple implementation that just matches exact paths
    createFilter: () => {
      return (path) => !excludedFiles.includes(path);
    },
  };
  console.log("Using fallback for ignore module");
}

// Initialize tokenizer with better error handling
let tiktoken;
try {
  tiktoken = require("tiktoken");
  console.log("Successfully loaded tiktoken module");
} catch (err) {
  console.error("Failed to load tiktoken module:", err);
  tiktoken = null;
}

// Import the excluded files list
const { excludedFiles, binaryExtensions } = require("./excluded-files");

// Initialize the encoder once at startup with better error handling
let encoder;
try {
  if (tiktoken) {
    encoder = tiktoken.get_encoding("o200k_base"); // gpt-4o encoding
    console.log("Tiktoken encoder initialized successfully");
  } else {
    throw new Error("Tiktoken module not available");
  }
} catch (err) {
  console.error("Failed to initialize tiktoken encoder:", err);
  // Fallback to a simpler method if tiktoken fails
  console.log("Using fallback token counter");
  encoder = null;
}

// Handler for clearing main process caches
ipcMain.on("clear-main-cache", () => {
  console.log("Clearing main process caches");
  ignoreCache.clear();
  fileCache.clear();
  fileTypeCache.clear(); // Clear binary file type cache as well
  console.log("Main process caches cleared");
});

/**
 * Enhanced path handling functions for cross-platform compatibility
 */

/**
 * Normalize file paths to use forward slashes regardless of OS
 * This ensures consistent path formatting between main and renderer processes
 * Also handles UNC paths on Windows
 */
function normalizePath(filePath) {
  if (!filePath) return filePath;

  // Handle Windows UNC paths
  if (process.platform === 'win32' && filePath.startsWith('\\\\')) {
    // Preserve the UNC path format but normalize separators
    return '\\\\' + filePath.slice(2).replace(/\\/g, '/');
  }

  return filePath.replace(/\\/g, '/');
}

/**
 * Get the platform-specific path separator
 */
function getPathSeparator() {
  return path.sep;
}

/**
 * Ensures a path is absolute and normalized for the current platform
 * @param {string} inputPath - The path to normalize
 * @returns {string} - Normalized absolute path
 */
function ensureAbsolutePath(inputPath) {
  if (!path.isAbsolute(inputPath)) {
    inputPath = path.resolve(inputPath);
  }
  return normalizePath(inputPath);
}

/**
 * Safely joins paths across different platforms
 * @param {...string} paths - Path segments to join
 * @returns {string} - Normalized joined path
 */
function safePathJoin(...paths) {
  const joined = path.join(...paths);
  return normalizePath(joined);
}

/**
 * Safely calculates relative path between two paths
 * Handles different OS path formats and edge cases
 * @param {string} from - Base path
 * @param {string} to - Target path
 * @returns {string} - Normalized relative path
 */
function safeRelativePath(from, to) {
  // Normalize both paths to use the same separator format
  from = normalizePath(from);
  to = normalizePath(to);
  
  // Handle Windows drive letter case-insensitivity
  if (process.platform === 'win32') {
    from = from.toLowerCase();
    to = to.toLowerCase();
  }
  
  let relativePath = path.relative(from, to);
  return normalizePath(relativePath);
}

/**
 * Checks if a path is a valid path for the current OS
 * @param {string} pathToCheck - Path to validate
 * @returns {boolean} - True if path is valid
 */
function isValidPath(pathToCheck) {
  try {
    path.parse(pathToCheck);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Recursively collects .gitignore patterns from a directory tree, scanning downwards.
 * @param {string} startDir - The directory to start scanning from
 * @param {string} rootDir - The root directory (used for calculating relative paths)
 * @param {Map<string, string[]>} [currentMap] - Map accumulating results during recursion
 * @returns {Promise<Map<string, string[]>>} - Map where keys are directory paths (relative to root)
 *                                            and values are arrays of patterns from that directory
 */
async function collectGitignoreMapRecursive(startDir, rootDir, currentMap = new Map()) {
  const normalizedStartDir = normalizePath(startDir);
  const normalizedRootDir = normalizePath(rootDir);

  // Check if directory exists and is accessible
  try {
    await fs.promises.access(normalizedStartDir, fs.constants.R_OK);
  } catch (err) {
    console.warn(`Cannot access directory: ${normalizedStartDir}`, err);
    return currentMap;
  }

  // 1. Read .gitignore in the current directory
  const gitignorePath = safePathJoin(normalizedStartDir, '.gitignore');
  try {
    const content = await fs.promises.readFile(gitignorePath, 'utf8');
    const patterns = content.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (patterns.length > 0) {
      const relativeDirPath = safeRelativePath(normalizedRootDir, normalizedStartDir) || '.';
      currentMap.set(relativeDirPath, patterns);
      console.log(`Found .gitignore in ${relativeDirPath} with ${patterns.length} patterns`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading ${gitignorePath}:`, err);
    }
  }

  // 2. Recursively scan subdirectories
  try {
    const dirents = await fs.promises.readdir(normalizedStartDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        const subDir = safePathJoin(normalizedStartDir, dirent.name);
        const relativeSubDir = safeRelativePath(normalizedRootDir, subDir);
        
        // Skip obviously ignorable directories at the top level
        if (!['node_modules', '.git'].includes(dirent.name)) {
          await collectGitignoreMapRecursive(subDir, normalizedRootDir, currentMap);
        } else {
          console.log(`Skipping known ignored directory: ${relativeSubDir}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${normalizedStartDir} for recursion:`, err);
  }

  return currentMap;
}

/**
 * Load or create an ignore filter with cached patterns
 * Combines patterns from all .gitignore files in the directory tree
 *
 * @param {string} rootDir - The root directory containing .gitignore files
 * @param {'automatic' | 'global'} [mode='automatic'] - The ignore pattern mode:
 *   - 'automatic': Scans for .gitignore files and combines with default excludes
 *   - 'global': Uses only default excludes and custom ignores
 * @param {string[]} [customIgnores=[]] - Additional patterns to include in the filter
 * @returns {Promise<object>} - Promise resolving to configured ignore filter with cached patterns
 *
 * @description The function uses a composite cache key combining:
 *   - rootDir: Different directories have different .gitignore files
 *   - mode: 'automatic' vs 'global' produce different pattern sets
 *   - customIgnores: Additional patterns affect the final filter
 * The cache ensures consistent behavior when the same parameters are used repeatedly.
 */
async function loadGitignore(rootDir, mode = 'automatic', customIgnores = []) {
  // Ensure root directory path is absolute and normalized for consistent cache keys
  rootDir = ensureAbsolutePath(rootDir);
  
  // Generate composite cache key that includes all parameters that affect ignore patterns:
  // - rootDir: Different directories have different .gitignore files
  // - mode: 'automatic' vs 'global' produce different pattern sets
  // - customIgnores: Additional patterns affect the final filter
  const cacheKey = `${rootDir}:${mode}:${JSON.stringify(customIgnores)}`;
  
  // Check cache first
  if (ignoreCache.has(cacheKey)) {
    console.log(`Using cached ignore filter for mode=${mode} in:`, rootDir);
    const cached = ignoreCache.get(cacheKey);
    console.log('Cache entry details:', {
      mode: cached.patterns.global ? 'global' : 'automatic',
      patternCount: cached.patterns.global?.length ||
                   Object.keys(cached.patterns.gitignoreMap || {}).length
    });
    return cached.ig;
  }
  console.log(`Cache miss for key: ${cacheKey}`);

  // Create new ignore filter
  const ig = ignore();

  if (mode === 'global') {
    // Global mode behavior:
    // - Only uses the default excludedFiles list plus any customIgnores
    // - Doesn't scan for .gitignore files in the directory tree
    const globalPatterns = [...excludedFiles, ...customIgnores].map(pattern => normalizePath(pattern));
    ig.add(globalPatterns);
    
    console.log(`Created global ignore filter for ${rootDir} with ${globalPatterns.length} patterns`);
    
    // Cache the ignore filter with global patterns
    ignoreCache.set(cacheKey, {
      ig,
      patterns: { global: globalPatterns }
    });
    return ig;
  }

  // Automatic mode processing
  try {
    // Add predefined default patterns first
    const defaultPatterns = [
      // Version control
      ".git",
      ".svn",
      ".hg",
      
      // Package managers
      "node_modules",
      "bower_components",
      "vendor",
      
      // Build directories
      "dist",
      "build",
      "out",
      ".next",
      "target",
      "bin",
      "Debug",
      "Release",
      "x64",
      "x86",
      ".output",
      
      // Build files
      "*.min.js",
      "*.min.css",
      "*.bundle.js",
      "*.compiled.*",
      "*.generated.*",
      
      // Cache directories
      ".cache",
      ".parcel-cache",
      ".webpack",
      ".turbo",
      
      // Editor configs
      ".idea",
      ".vscode",
      ".vs",
      
      // System files
      ".DS_Store",
      "Thumbs.db",
      "desktop.ini"
    ];
    ig.add(defaultPatterns);
    console.log(`Added ${defaultPatterns.length} default ignore patterns`);

    // Then add user-defined excluded files
    const normalizedExcludedFiles = excludedFiles.map(pattern => normalizePath(pattern));
    ig.add(normalizedExcludedFiles);
    console.log(`Added ${normalizedExcludedFiles.length} excluded file patterns`);

    // Collect patterns by scanning downwards from rootDir
    console.log(`Collecting .gitignore patterns for: ${rootDir}`);
    const gitignoreMap = await collectGitignoreMapRecursive(rootDir, rootDir);
    let totalGitignorePatterns = 0;

    // Add patterns from the map, respecting their directory context
    for (const [relativeDirPath, patterns] of gitignoreMap) {
      const patternsToAdd = patterns.map(pattern => {
        if (!pattern.startsWith('/') && !pattern.includes('**')) {
          const joinedPath = normalizePath(path.join(relativeDirPath === '.' ? '' : relativeDirPath, pattern));
          return joinedPath.replace(/^\.\//, '');
        }
        return pattern;
      });
      
      if (patternsToAdd.length > 0) {
        ig.add(patternsToAdd);
        totalGitignorePatterns += patternsToAdd.length;
        console.log(`Added ${patternsToAdd.length} patterns from ${relativeDirPath}/.gitignore`);
      }
    }

    if (totalGitignorePatterns > 0) {
      console.log(`Added ${totalGitignorePatterns} total .gitignore patterns for:`, rootDir);
    }

    // Cache the ignore filter with gitignore map
    ignoreCache.set(cacheKey, {
      ig,
      patterns: {
        gitignoreMap: Object.fromEntries(gitignoreMap),
        excludedFiles: normalizedExcludedFiles
      }
    });
    return ig;
  } catch (err) {
    console.error(`Error in loadGitignore for ${rootDir}:`, err);
    return ig;
  }
}

/**
 * Check if file is binary based on extension, using cache for performance
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if the file is binary
 */
function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Check cache first
  if (fileTypeCache.has(ext)) {
    return fileTypeCache.get(ext);
  }

  // Calculate and cache the result
  const isBinary = binaryExtensions.includes(ext);
  fileTypeCache.set(ext, isBinary);
  return isBinary;
}

// Count tokens using tiktoken with o200k_base encoding
function countTokens(text) {
  // Simple fallback implementation if encoder fails
  if (!encoder) {
    return Math.ceil(text.length / 4);
  }

  try {
    // Remove any special tokens that might cause issues
    const cleanText = text.replace(/<\|endoftext\|>/g, '');
    const tokens = encoder.encode(cleanText);
    return tokens.length;
  } catch (err) {
    console.error("Error counting tokens:", err);
    // Fallback to character-based estimation on error
    return Math.ceil(text.length / 4);
  }
}

function createWindow() {
  // Check if we're starting in safe mode (Shift key pressed)
  const isSafeMode = process.argv.includes('--safe-mode');

  // Set up Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com"]
      }
    });
  });

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: {
        isDevToolsExtension: false,
        htmlFullscreen: false,
      },
    },
  });

  // Pass the safe mode flag to the renderer
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('startup-mode', { 
      safeMode: isSafeMode 
    });
  });

  // Register the escape key to cancel directory loading
  globalShortcut.register('Escape', () => {
    if (isLoadingDirectory) {
      cancelDirectoryLoading(mainWindow);
    }
  });

  // Clean up shortcuts when window is closed
  mainWindow.on('closed', () => {
    globalShortcut.unregisterAll();
  });

  // Load the index.html file
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle folder selection
ipcMain.on("open-folder", async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
    const rawPath = result.filePaths[0]; // Get the raw path
    const normalizedPath = normalizePath(rawPath); // Normalize it immediately
    try {
      // Ensure we're only sending a string, not an object
      // Use the normalized path for logging and sending
      console.log("Sending folder-selected event with normalized path:", normalizedPath);
      event.sender.send("folder-selected", normalizedPath);
    } catch (err) {
      console.error("Error sending folder-selected event:", err);
      // Try a more direct approach as a fallback, still using normalized path
      event.sender.send("folder-selected", normalizedPath);
    }
  }
});

/**
/**
 * Handler for getting ignore patterns with mode support
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event
 * @param {Object} params - Parameters object containing:
 *   @param {string} params.folderPath - (Required) Root directory path to scan
 *   @param {'automatic'|'global'} [params.mode='automatic'] - Pattern matching mode:
 *     - 'automatic': Combines .gitignore files with default excludes
 *     - 'global': Uses only default excludes and custom ignores
 *   @param {string[]} [params.customIgnores=[]] - Additional ignore patterns to include
 * @returns {Promise<{patterns?: Object, error?: string}>} Resolves with:
 *   - patterns: Object containing loaded patterns when successful
 *     - gitignoreMap: Map of directory paths to their patterns
 *     - excludedFiles: Default excluded patterns
 *     - global: Patterns when in global mode
 *   - error: String error message if operation failed
 */
if (!ipcMain.eventNames().includes('get-ignore-patterns')) {
  ipcMain.handle("get-ignore-patterns", async (event, { folderPath, mode = 'automatic', customIgnores = [] } = {}) => {
    if (!folderPath) {
      console.error("get-ignore-patterns called without folderPath");
      return { error: "folderPath is required" };
    }

  try {
    const normalizedPath = normalizePath(folderPath);
    console.log(`Getting ignore patterns for ${normalizedPath} (mode=${mode})`);
    
    // Generate the same cache key used in loadGitignore
    const cacheKey = `${normalizedPath}:${mode}:${JSON.stringify(customIgnores)}`;
    
    // Check cache first
    if (ignoreCache.has(cacheKey)) {
      const cached = ignoreCache.get(cacheKey);
      console.log(`Returning cached patterns for ${normalizedPath} (mode=${mode})`);
      return { patterns: cached.patterns };
    }

    // Load the ignore filter (will be cached by loadGitignore)
    await loadGitignore(normalizedPath, mode, customIgnores);
    
    // Return the cached patterns
    if (ignoreCache.has(cacheKey)) {
      return { patterns: ignoreCache.get(cacheKey).patterns };
    }
    
    return { error: "Failed to load ignore patterns" };
  } catch (err) {
    console.error(`Error getting ignore patterns for ${folderPath}:`, err);
    return { error: err.message };
  }
});
}

/**
 * Sets up a safety timeout for directory loading operations.
 * Prevents infinite loading by automatically cancelling after MAX_DIRECTORY_LOAD_TIME.
 * 
 * @param {BrowserWindow} window - The Electron window instance
 * @param {string} folderPath - The path being processed (for logging)
 */
function setupDirectoryLoadingTimeout(window, folderPath) {
  // Clear any existing timeout
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
  }
  
  // Set a new timeout
  loadingTimeoutId = setTimeout(() => {
    console.log(`Directory loading timed out after ${MAX_DIRECTORY_LOAD_TIME / 1000} seconds: ${folderPath}`);
    console.log(`Stats at timeout: Processed ${currentProgress.directories} directories and ${currentProgress.files} files`);
    // Call cancelDirectoryLoading with timeout reason
    cancelDirectoryLoading(window, "timeout");
  }, MAX_DIRECTORY_LOAD_TIME);

  // Reset progress when starting new directory load
  currentProgress = { directories: 0, files: 0 };
}

/**
 * Handles the cancellation of directory loading operations.
 * Ensures clean cancellation by:
 * - Clearing all timeouts
 * - Resetting loading flags and counters
 * - Notifying the UI immediately with context
 * 
 * @param {BrowserWindow} window - The Electron window instance to send updates to
 * @param {string} reason - The reason for cancellation ("user" or "timeout")
 */
function cancelDirectoryLoading(window, reason = "user") {
  if (!isLoadingDirectory) return;

  console.log(`Cancelling directory loading process (Reason: ${reason})`);
  console.log(`Stats at cancellation: Processed ${currentProgress.directories} directories and ${currentProgress.files} files`);

  // Ensure flag is reset here as well
  isLoadingDirectory = false;

  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }

  // Reset progress
  currentProgress = { directories: 0, files: 0 };

  // Send cancellation message immediately with appropriate context
  // Add checks for window validity
  if (window && window.webContents && !window.webContents.isDestroyed()) {
    const message = reason === "timeout"
      ? "Directory loading timed out after 5 minutes. Try clearing data and retrying."
      : "Directory loading cancelled";

    window.webContents.send("file-processing-status", {
      status: "cancelled",
      message: message,
    });
  } else {
    console.log("Window not available to send cancellation status.");
  }
}


// Add handler for cancel-directory-loading event
ipcMain.on("cancel-directory-loading", (event) => {
  cancelDirectoryLoading(BrowserWindow.fromWebContents(event.sender));
});

// Add a debug handler for file selection
ipcMain.on("debug-file-selection", (event, data) => {
  console.log("DEBUG - File Selection:", data);
});

/**
 * Processes a single directory entry recursively
 * @param {Object} params - Parameters for processing
 * @returns {Promise<{results: Array, progress: Object}>} Results and updated progress
 */
async function processDirectory({ dirent, dir, rootDir, ignoreFilter, window, progress }) {
  const fullPath = safePathJoin(dir, dirent.name);
  const relativePath = safeRelativePath(rootDir, fullPath);

  // Skip invalid paths and system directories
  if (fullPath.includes('.app') || fullPath === app.getAppPath() ||
      !isValidPath(relativePath) || relativePath.startsWith('..')) {
    console.log('Skipping directory:', fullPath);
    return { results: [], progress };
  }

  // Only process if not ignored
  if (!ignoreFilter.ignores(relativePath)) {
    progress.directories++; // Increment directory counter
    window.webContents.send("file-processing-status", {
      status: "processing",
      message: `Scanning directories (${progress.directories} processed)... (Press ESC to cancel)`,
    });
    return readFilesRecursively(fullPath, rootDir, ignoreFilter, window, progress);
  }
  return { results: [], progress };
}

async function readFilesRecursively(dir, rootDir, ignoreFilter, window, progress = { directories: 0, files: 0 }) {
  if (!isLoadingDirectory) return { results: [], progress };
  
  // Ensure absolute and normalized paths
  dir = ensureAbsolutePath(dir);
  rootDir = ensureAbsolutePath(rootDir || dir);
  ignoreFilter = ignoreFilter || await loadGitignore(rootDir);

  let results = [];

  try {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    if (!isLoadingDirectory) return { results: [], progress };

    const directories = dirents.filter(dirent => dirent.isDirectory());
    const files = dirents.filter(dirent => dirent.isFile());

    // Process directories in parallel batches
    for (let i = 0; i < directories.length; i += CONCURRENT_DIRS) {
      if (!isLoadingDirectory) return { results: [], progress };
      
      const batch = directories.slice(i, Math.min(i + CONCURRENT_DIRS, directories.length));
      
      // Process batch in parallel
      const batchPromises = batch.map(dirent =>
        processDirectory({ dirent, dir, rootDir, ignoreFilter, window, progress })
      );

      // Wait for all directories in batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Combine results from this batch
      const combinedResults = batchResults.reduce((acc, curr) => {
        acc.results = acc.results.concat(curr.results);
        return acc;
      }, { results: [], progress });
      
      results = results.concat(combinedResults.results);
      if (!isLoadingDirectory) return { results: [], progress };
    }

    // Process files in chunks
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      if (!isLoadingDirectory) return { results: [], progress };

      const chunk = files.slice(i, i + CHUNK_SIZE);
      
      const chunkPromises = chunk.map(async (dirent) => {
        if (!isLoadingDirectory) return null;

        const fullPath = safePathJoin(dir, dirent.name);
        const relativePath = safeRelativePath(rootDir, fullPath);
        const fullPathNormalized = normalizePath(fullPath);

        // Early validation checks
        if (!isValidPath(relativePath) || relativePath.startsWith('..')) {
          console.log('Invalid path, skipping:', fullPath);
          return null;
        }

        // System and app-specific path checks
        if (fullPath.includes('.app') || fullPath === app.getAppPath()) {
          console.log('System path, skipping:', fullPath);
          return null;
        }

        // Gitignore check before any file I/O
        if (ignoreFilter.ignores(relativePath)) {
          console.log('Ignored by filter, skipping:', relativePath);
          return null;
        }

        // Check cache first - this could be a complete hit from a previous scan
        if (fileCache.has(fullPathNormalized)) {
          console.log('Using cached file data for:', fullPathNormalized);
          return fileCache.get(fullPathNormalized);
        }

        // Early binary check using cached extension info
        if (isBinaryFile(fullPath)) {
          console.log('Binary file by extension, skipping content read:', fullPath);
          const fileData = {
            name: dirent.name,
            path: fullPathNormalized,
            relativePath: relativePath,
            tokenCount: 0,
            size: 0,
            content: "",
            isBinary: true,
            isSkipped: false,
            fileType: path.extname(fullPath).substring(1).toUpperCase()
          };

          // Try to get the size without full file read
          try {
            const stats = await fs.promises.stat(fullPath);
            if (!isLoadingDirectory) return null;
            fileData.size = stats.size;
          } catch (err) {
            console.log('Could not get size for binary file:', fullPath);
          }

          fileCache.set(fullPathNormalized, fileData);
          return fileData;
        }

        try {
          // Get stats first to check size before reading content
          const stats = await fs.promises.stat(fullPath);
          if (!isLoadingDirectory) return null;

          // Handle large files without reading content
          if (stats.size > MAX_FILE_SIZE) {
            const fileData = {
              name: dirent.name,
              path: fullPathNormalized,
              relativePath: relativePath,
              tokenCount: 0,
              size: stats.size,
              content: "",
              isBinary: false,
              isSkipped: true,
              error: "File too large to process"
            };
            fileCache.set(fullPathNormalized, fileData);
            return fileData;
          }

          // File is not binary and not too large, read its content
          const fileContent = await fs.promises.readFile(fullPath, "utf8");
          if (!isLoadingDirectory) return null;

          const fileData = {
            name: dirent.name,
            path: fullPathNormalized,
            relativePath: relativePath,
            content: fileContent,
            tokenCount: countTokens(fileContent),
            size: stats.size,
            isBinary: false,
            isSkipped: false
          };
          fileCache.set(fullPathNormalized, fileData);
          return fileData;
        } catch (err) {
          console.error(`Error reading file ${fullPath}:`, err);
          const errorData = {
            name: dirent.name,
            path: normalizePath(fullPath),
            relativePath: relativePath,
            tokenCount: 0,
            size: 0,
            isBinary: false,
            isSkipped: true,
            error: err.code === 'EPERM' ? "Permission denied" : 
                   err.code === 'ENOENT' ? "File not found" : 
                   "Could not read file"
          };
          fileCache.set(fullPathNormalized, errorData);
          return errorData;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      if (!isLoadingDirectory) return results;
      
      const validResults = chunkResults.filter(result => result !== null);
      results = results.concat(validResults);
      progress.files += validResults.length;
      
      window.webContents.send("file-processing-status", {
        status: "processing",
        message: `Processing files (${progress.directories} dirs, ${progress.files} files)... (Press ESC to cancel)`,
      });

      if (progress.files % 100 === 0) {
        console.log(`Progress update - Directories: ${progress.directories}, Files: ${progress.files}`);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      console.log(`Skipping inaccessible directory: ${dir}`);
      return { results: [], progress };
    }
  }

  return { results, progress };
}

// Modify the request-file-list handler to use async/await
ipcMain.on("request-file-list", async (event, folderPath) => {
  // Prevent processing if already loading - Simply return if busy
  if (isLoadingDirectory) {
    console.log("Already processing a directory, ignoring new request for:", folderPath);
    // Optionally send a status update to the renderer
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send("file-processing-status", {
        status: "busy",
        message: "Already processing another directory. Please wait.",
      });
    }
    return; // Exit the handler
  }

  try {
    // Set the loading flag first to prevent race conditions
    isLoadingDirectory = true;

    // Set up the timeout for directory loading
    setupDirectoryLoadingTimeout(BrowserWindow.fromWebContents(event.sender), folderPath);

    // Send initial progress update
    event.sender.send("file-processing-status", {
      status: "processing",
      message: "Scanning directory structure... (Press ESC to cancel)",
    });

    // Initialize progress tracking
    currentProgress = { directories: 0, files: 0 };

    // Process files with async/await
    const { results: files } = await readFilesRecursively(
      folderPath,
      folderPath,
      null,
      BrowserWindow.fromWebContents(event.sender),
      currentProgress
    );
    
    // If loading was cancelled, return early
    if (!isLoadingDirectory) {
      return;
    }

    // Clear the timeout and loading flag
    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
      loadingTimeoutId = null;
    }
    isLoadingDirectory = false;

    // Update with processing complete status
    event.sender.send("file-processing-status", {
      status: "complete",
      message: `Found ${files.length} files`,
    });

    // Process the files to ensure they're serializable
    const serializedFiles = files.map(file => { // Use a block body for clarity
      return { // Return an object literal
        path: file.path, // Keep the full path
        relativePath: file.relativePath, // Use the relative path for display
        name: file.name,
        size: file.size,
        isDirectory: file.isDirectory,
        extension: path.extname(file.name).toLowerCase(),
        excluded: shouldExcludeByDefault(file.path, folderPath),
        content: file.content,
        tokenCount: file.tokenCount,
        isBinary: file.isBinary,
        isSkipped: file.isSkipped,
        error: file.error,
      }; // Close the returned object
    }); // Close the map function call

    event.sender.send("file-list-data", serializedFiles);
  } catch (err) {
    console.error("Error processing file list:", err);
    isLoadingDirectory = false; // Reset flag on error

    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
      loadingTimeoutId = null;
    }

    event.sender.send("file-processing-status", {
      status: "error",
      message: `Error: ${err.message}`,
    });
  } finally {
    // Ensure the flag is always reset, even on error or cancellation
    isLoadingDirectory = false;
    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
      loadingTimeoutId = null;
    }
  }
});

/**
 * Determines if a file should be excluded based on gitignore patterns and default rules.
 * Handles cross-platform path issues including UNC paths and network shares.
 * 
 * @param {string} filePath - The full path of the file to check
 * @param {string} rootDir - The root directory for relative path calculation
 * @returns {boolean} True if the file should be excluded
 */
function shouldExcludeByDefault(filePath, rootDir) {
  // Ensure paths are absolute and normalized
  filePath = ensureAbsolutePath(filePath);
  rootDir = ensureAbsolutePath(rootDir);
  
  // Calculate relative path safely
  const relativePath = safeRelativePath(rootDir, filePath);
  
  // Don't process paths outside the root directory or invalid paths
  if (!isValidPath(relativePath) || relativePath.startsWith('..')) {
    return true;
  }

  // Handle Windows-specific paths
  if (process.platform === 'win32') {
    // Skip system files and folders
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(path.basename(filePath))) {
      return true;
    }
    
    // Skip Windows system directories
    if (filePath.toLowerCase().includes('\\windows\\') || 
        filePath.toLowerCase().includes('\\system32\\')) {
      return true;
    }
  }

  // Handle macOS-specific paths
  if (process.platform === 'darwin') {
    // Skip macOS system files
    if (filePath.includes('/.Spotlight-') || 
        filePath.includes('/.Trashes') || 
        filePath.includes('/.fseventsd')) {
      return true;
    }
  }

  // Handle Linux-specific paths
  if (process.platform === 'linux') {
    // Skip Linux system directories
    if (filePath.startsWith('/proc/') || 
        filePath.startsWith('/sys/') || 
        filePath.startsWith('/dev/')) {
      return true;
    }
  }

  const ig = ignore().add(excludedFiles);
  return ig.ignores(relativePath);
}
