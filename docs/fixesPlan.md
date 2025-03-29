# Implementation Plan: Performance & .gitignore Improvements

This plan addresses performance issues and .gitignore handling based on the KnownIssue.md report. The goal is to optimize file scanning through caching, reordering processing checks, and enhancing file tree metadata while keeping all existing features intact.

---

## Objectives

1. **Performance Improvements**
   - **Reduce Load Times:** Optimize chunk processing and introduce caching for file metadata.
   - **Enhance UI Responsiveness:** Prevent UI slowdowns with large repositories.

2. **.gitignore Handling**
   - **Unified Ignore Filter:** Merge multiple `.gitignore` files from deep repositories into one unified filter.
   - **Persistent Cache:** Cache the ignore filter for the entire session.
   - **Reorder Checks:** Apply ignore filtering before expensive file I/O operations.
   - **Binary Exception Post-Ignores:** Only perform binary checks after the ignore filter has been applied.
   - **Binary Flag:** Propagate a `hasBinaries` flag in directory nodes to indicate the presence of binary files.

3. **Documentation & Code Comments**
   - Update inline comments and developer documentation to explain new caches, processing logic, and metadata enhancements.

Refer to this flow diagram for visual detail of change
![Flow Diagram](newCache.png)

---

## Task Checklist & Progress Tracking

### 1. Unified & Cached .gitignore Handling

- [ ] **Task 1.1: Create Global Ignore Cache**
  - **File:** `main.js`
  - **Action:** Declare an in‑memory cache (using a `Map`) keyed by the normalized root directory.
  - **Example:**
    ```js
    // Global cache for ignore filters
    const ignoreCache = new Map();
    ```
  - **Outcome:** Reuse the ignore filter for subsequent loads to reduce disk I/O.

- [ ] **Task 1.2: Implement `collectCombinedGitignore(rootDir)`**
  - **File:** `main.js`
  - **Action:** Create an async function to traverse `rootDir`, find all `.gitignore` files, parse and merge unique patterns into a `Set`.
  - **Example:**
    ```js
    async function collectCombinedGitignore(rootDir) {
      const ignorePatterns = new Set();
      async function traverse(dir) {
        const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents) {
          const fullPath = safePathJoin(dir, dirent.name);
          if (dirent.isDirectory()) {
            await traverse(fullPath);
          } else if (dirent.isFile() && dirent.name === '.gitignore') {
            try {
              const content = await fs.promises.readFile(fullPath, "utf8");
              content.split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .forEach(pattern => ignorePatterns.add(normalizePath(pattern)));
            } catch (err) {
              console.error(`Error reading ${fullPath}:`, err);
            }
          }
        }
      }
      await traverse(rootDir);
      return ignorePatterns;
    }
    ```
  - **Outcome:** All .gitignore patterns are collected and merged for the session.

- [ ] **Task 1.3: Modify `loadGitignore(rootDir)` to Use the Cache**
  - **File:** `main.js`
  - **Action:** Update `loadGitignore` to first check the cache. If not cached, add default patterns, merge excluded files, then asynchronously add the combined .gitignore patterns and cache the result.
  - **Example:**
    ```js
    function loadGitignore(rootDir) {
      rootDir = ensureAbsolutePath(rootDir);
      if (ignoreCache.has(rootDir)) {
        return ignoreCache.get(rootDir);
      }
      
      const ig = ignore();
      // Add default ignores
      ig.add([".git", "node_modules", ".DS_Store", "Thumbs.db", "desktop.ini", ".idea", ".vscode", "dist", "build", "out"]);
      ig.add(excludedFiles.map(pattern => normalizePath(pattern)));
      
      collectCombinedGitignore(rootDir)
        .then(patterns => {
          ig.add(Array.from(patterns));
          ignoreCache.set(rootDir, ig);
        })
        .catch(err => console.error("Error merging .gitignore files:", err));
      
      return ig;
    }
    ```
  - **Outcome:** Efficient, unified ignore processing for the duration of the session.

---

### 2. File Metadata Caching

- [ ] **Task 2.1: Introduce Global File Cache**
  - **File:** `main.js`
  - **Action:** Declare a global cache using a `Map` to store file metadata (size, content, token count) keyed by full file path.
  - **Example:**
    ```js
    const fileCache = new Map();
    ```
  - **Outcome:** Minimizes redundant file reads during scanning.

- [ ] **Task 2.2: Integrate Cache in `readFilesRecursively`**
  - **File:** `main.js`
  - **Action:** In the chunk loop, check the cache before processing each file. If the file data exists in the cache, return it; otherwise, process and then cache the data.
  - **Example:**
    ```js
    const fullPath = safePathJoin(dir, dirent.name);
    if (fileCache.has(fullPath)) {
      return fileCache.get(fullPath);
    }
    // Process file (stats, content, etc.)
    // After processing:
    fileCache.set(fullPath, fileData);
    return fileData;
    ```
  - **Outcome:** Reduces repeated I/O and speeds up file processing.

---

### 3. Reordering File Processing Checks

- [ ] **Task 3.1: Update Order in `readFilesRecursively`**
  - **File:** `main.js`
  - **Action:** After calculating the `relativePath` of a file, immediately check if it should be ignored using the ignore filter. Only process the file further (e.g., size and binary checks) if it is not ignored.
  - **Example:**
    ```js
    // After calculating relativePath:
    if (ignoreFilter && ignoreFilter.ignores(relativePath)) {
      console.log(`Ignoring file: ${relativePath}`);
      return null;
    }
    // Continue with file size check and binary file detection...
    ```
  - **Outcome:** Prevents unnecessary file processing, improving performance.

- [ ] **Task 3.2: Validate Return Structure**
  - **Action:** Verify that the output from `readFilesRecursively` remains consistent with previous behavior.
  - **Outcome:** Ensures no downstream functionality (file sorting, UI updates, copying) is affected.

---

### 4. Propagating a `hasBinaries` Flag in the File Tree

- [ ] **Task 4.1: Update the Data Model**
  - **File:** `FileTypes.ts`
  - **Action:** Extend the `TreeNode` interface to include an optional `hasBinaries` property.
  - **Example:**
    ```ts
    export interface TreeNode {
      id: string;
      name: string;
      path: string;
      type: "file" | "directory";
      children?: TreeNode[];
      isExpanded?: boolean;
      level: number;
      fileData?: FileData;
      hasBinaries?: boolean;
    }
    ```
  - **Outcome:** The file tree can now store additional metadata for directories.

- [ ] **Task 4.2: Update Tree Building in `Sidebar.tsx`**
  - **File:** `Sidebar.tsx`
  - **Action:** When building the file tree, if a file is detected as binary, mark its parent directory node with `hasBinaries: true`. Optionally, propagate this flag upward to all parent nodes.
  - **Guidance:**  
    - During the file path splitting and tree node creation, check `if (file.isBinary)` and update the corresponding directory node.
  - **Outcome:** Folders with binary files are flagged for UI indicators without altering selection or navigation functionality.

- [ ] **Task 4.3: (Optional) Update UI in `TreeItem.tsx`**
  - **File:** `TreeItem.tsx`
  - **Action:** Modify the component to optionally display an indicator (icon, badge, etc.) if `hasBinaries` is true.
  - **Outcome:** Enhances user feedback without impacting core functionality.

---

### 5. Documentation & Code Comments

- [ ] **Task 5.1: Update Inline Comments in `main.js`**
  - **Action:** Document the purpose of `ignoreCache`, `fileCache`, and the logic behind `collectCombinedGitignore`.
  - **Outcome:** Improves code clarity and aids future maintenance.

- [ ] **Task 5.2: Revise Comments in `Sidebar.tsx` and `FileTypes.ts`**
  - **Action:** Clearly document the new `hasBinaries` property and modifications to the tree-building process.
  - **Outcome:** Provides clear guidance for future enhancements.

- [ ] **Task 5.3: Update Developer Documentation**
  - **Action:** Add a section to the project README or developer docs summarizing the performance improvements and caching strategies.
  - **Outcome:** Ensures that all team members understand the new architecture.

---

## Final Testing & Rollout

- **Manual Verification:**  
  - Confirm folder selection, file tree generation, file copying, and search functionalities behave as before.
  - Validate performance improvements on large repositories.
- **Regression Testing:**  
  - Ensure that caching and new ignore filters do not introduce inconsistencies.
- **Performance Monitoring:**  
  - Check load times and UI responsiveness to verify improvements meet the project’s objectives.

---

## Progress Reporting

- Update this checklist in your project management tool or through commit messages as tasks are completed.
- Schedule regular code reviews to ensure that new changes do not break existing functionality.
- Merge changes incrementally, running regression tests after each major task.

---

*This plan comprehensively addresses all issues and fixes proposed in KnownIssue.md while ensuring that the current program functionality remains intact.*

