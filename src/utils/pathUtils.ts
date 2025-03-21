/**
 * Browser-compatible path utilities to replace Node.js path module
 */

// Cache the OS detection result
let cachedOS: 'windows' | 'mac' | 'linux' | 'unknown' | null = null;

/**
 * Detects the operating system
 * 
 * @returns The detected operating system ('windows', 'mac', 'linux', or 'unknown')
 */
export function detectOS(): 'windows' | 'mac' | 'linux' | 'unknown' {
  if (cachedOS !== null) {
    return cachedOS;
  }

  if (typeof window !== 'undefined' && window.navigator) {
    const platform = window.navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      cachedOS = 'windows';
    } else if (platform.includes('mac')) {
      cachedOS = 'mac';
    } else if (platform.includes('linux')) {
      cachedOS = 'linux';
    } else {
      cachedOS = 'unknown';
    }
  } else {
    cachedOS = 'unknown';
  }
  
  return cachedOS;
}

/**
 * Checks if the current OS is Windows
 * @returns true if running on Windows
 */
export function isWindows(): boolean {
  return detectOS() === 'windows';
}

/**
 * Normalizes a file path to use forward slashes regardless of operating system
 * This helps with path comparison across different platforms
 * 
 * @param filePath The file path to normalize
 * @returns The normalized path with forward slashes
 */
export function normalizePath(filePath: string): string {
  if (!filePath) return filePath;
  
  // Replace backslashes with forward slashes
  return filePath.replace(/\\/g, '/');
}

/**
 * Compares two paths for equality, handling different OS path separators and case sensitivity
 * 
 * @param path1 First path to compare
 * @param path2 Second path to compare
 * @returns True if the paths are equivalent, false otherwise
 */
export function arePathsEqual(path1: string, path2: string): boolean {
  const normalized1 = normalizePath(path1);
  const normalized2 = normalizePath(path2);
  
  // On Windows, paths are case-insensitive
  if (isWindows()) {
    return normalized1.toLowerCase() === normalized2.toLowerCase();
  }
  
  return normalized1 === normalized2;
}

/**
 * Join path segments together, handling different OS path separators
 * @param segments The path segments to join
 * @returns The joined path
 */
export function join(...segments: (string | null | undefined)[]): string {
  const normalizedSegments = segments
    .filter(Boolean)
    .map((seg) => normalizePath(String(seg)))
    .map(seg => seg.replace(/^\/+|\/+$/g, '')); // Remove leading/trailing slashes
    
  return normalizedSegments.join('/');
}

/**
 * Checks if a path is absolute
 * @param path The path to check
 * @returns True if the path is absolute
 */
export function isAbsolute(path: string): boolean {
  const normalized = normalizePath(path);
  
  // Windows paths (e.g., C:/, D:/)
  if (/^[a-z]:/i.test(normalized)) {
    return true;
  }
  
  // Unix-like paths
  return normalized.startsWith('/');
}

/**
 * Checks if one path is a subpath of another
 * @param parent The potential parent path
 * @param child The potential child path
 * @returns True if child is a subpath of parent
 */
export function isSubPath(parent: string, child: string): boolean {
  const normalizedParent = normalizePath(parent);
  const normalizedChild = normalizePath(child);
  
  if (isWindows()) {
    return normalizedChild.toLowerCase().startsWith(normalizedParent.toLowerCase() + '/');
  }
  
  return normalizedChild.startsWith(normalizedParent + '/');
}

/**
 * Extract the basename from a path string
 * @param path The path to extract the basename from
 * @returns The basename (last part of the path)
 */
export function basename(path: string | null | undefined): string {
  if (!path) return "";

  const normalizedPath = normalizePath(String(path));
  const trimmedPath = normalizedPath.replace(/\/+$/, ''); // Remove trailing slashes
  const parts = trimmedPath.split('/');
  return parts[parts.length - 1] || "";
}

/**
 * Extract the directory name from a path string
 * @param path The path to extract the directory from
 * @returns The directory (everything except the last part)
 */
export function dirname(path: string | null | undefined): string {
  if (!path) return ".";

  const normalizedPath = normalizePath(String(path));
  const trimmedPath = normalizedPath.replace(/\/+$/, ''); // Remove trailing slashes
  const lastSlashIndex = trimmedPath.lastIndexOf("/");
  return lastSlashIndex === -1 ? "." : trimmedPath.slice(0, lastSlashIndex);
}

/**
 * Get the file extension
 * @param path The path to get the extension from
 * @returns The file extension including the dot
 */
export function extname(path: string | null | undefined): string {
  if (!path) return "";

  const basenameValue = basename(path);
  const dotIndex = basenameValue.lastIndexOf(".");
  return dotIndex === -1 || dotIndex === 0 ? "" : basenameValue.slice(dotIndex);
}

/**
 * Generate an ASCII representation of the file tree for the selected files
 * @param files Array of selected FileData objects
 * @param rootPath The root directory path
 * @returns ASCII string representing the file tree
 */
export function generateAsciiFileTree(files: { path: string }[], rootPath: string): string {
  if (!files.length) return "No files selected.";

  // Normalize the root path for consistent path handling
  const normalizedRoot = rootPath.replace(/\\/g, "/").replace(/\/$/, "");
  
  // Create a tree structure from the file paths
  interface TreeNode {
    name: string;
    isFile: boolean;
    children: Record<string, TreeNode>;
  }
  
  const root: TreeNode = { name: basename(normalizedRoot), isFile: false, children: {} };
  
  // Insert a file path into the tree
  const insertPath = (filePath: string, node: TreeNode) => {
    const normalizedPath = filePath.replace(/\\/g, "/");
    if (!normalizedPath.startsWith(normalizedRoot)) return;
    
    const relativePath = normalizedPath.substring(normalizedRoot.length).replace(/^\//, "");
    if (!relativePath) return;
    
    const pathParts = relativePath.split("/");
    let currentNode = node;
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isFile = i === pathParts.length - 1;
      
      if (!currentNode.children[part]) {
        currentNode.children[part] = {
          name: part,
          isFile,
          children: {}
        };
      }
      
      currentNode = currentNode.children[part];
    }
  };
  
  // Insert all files into the tree
  files.forEach(file => insertPath(file.path, root));
  
  // Generate ASCII representation
  const generateAscii = (node: TreeNode, prefix = "", isLast = true, isRoot = true): string => {
    if (!isRoot) {
      let result = prefix;
      result += isLast ? "└── " : "├── ";
      result += node.name;
      result += "\n";
      prefix += isLast ? "    " : "│   ";
      
      const children = Object.values(node.children).sort((a, b) => {
        // Sort by type (directories first) then by name
        if (a.isFile !== b.isFile) {
          return a.isFile ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      });
      
      return result + children
        .map((child, index) =>
          generateAscii(child, prefix, index === children.length - 1, false)
        )
        .join("");
    } else {
      // Root node special handling
      const children = Object.values(node.children).sort((a, b) => {
        // Sort by type (directories first) then by name
        if (a.isFile !== b.isFile) {
          return a.isFile ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      });
      
      return children
        .map((child, index) =>
          generateAscii(child, prefix, index === children.length - 1, false)
        )
        .join("");
    }
  };
  
  return generateAscii(root);
}