# Plan: Fix Hierarchical .gitignore Handling

## Problem

The current implementation aggregates all `.gitignore` patterns from a repository into a single global filter and applies them relative to the root directory. This breaks the contextual nature of `.gitignore` rules, where patterns should apply relative to the directory containing the `.gitignore` file. This leads to incorrect file exclusion, especially in large repositories with deep directory structures and multiple `.gitignore` files.

## Root Cause

1.  **Global Aggregation:** `collectCombinedGitignore` merges all patterns into one set.
2.  **Single Filter Instance:** `loadGitignore` creates one `ignore` instance for the entire repository based on the aggregated patterns.
3.  **Root-Relative Checks:** `readFilesRecursively` checks all file paths relative to the `rootDir` using the single global filter (`ignoreFilter.ignores(relativePath)`), losing the context of where the specific ignore rule originated.

## Proposed Solution: Hierarchical Ignore Rule Processing

Refactor the ignore rule handling in `main.js` to respect the directory structure and context of `.gitignore` files.

1.  **Modify `loadGitignore` (or create helpers):**
    *   **Identify `.gitignore` Files:** During directory traversal, identify the location of each `.gitignore` file.
    *   **Contextual `ignore` Instances:** Create separate `ignore` instances specifically for the rules found in each `.gitignore` file, potentially storing them keyed by the directory path containing the `.gitignore`.
    *   **Rule Inheritance:** Implement logic to handle inheritance. When checking a file in a subdirectory, rules from its parent directories' `.gitignore` files should also apply, with more specific (deeper) rules taking precedence.
    *   **Data Structure:** Return or cache a structure (e.g., a Map keyed by directory path) that allows efficient lookup of the applicable `ignore` instance(s) for any given directory. The global `ignoreCache` might need restructuring.

2.  **Refactor `readFilesRecursively` / `processDirectory`:**
    *   **Determine Applicable Rules:** When processing a file or directory at `fullPath`, determine the complete set of applicable ignore rules by looking up the `ignore` instance for the current directory and inheriting rules from parent directories up to `rootDir`.
    *   **Contextual Path Checking:** When calling `ig.ignores(pathToCheck)`, ensure `pathToCheck` is relative to the directory where the specific `ignore` rule originated, *not* always relative to the `rootDir`. This might involve iterating through the applicable `ignore` instances and checking the path relative to each instance's base directory.

3.  **Update Caching (`ignoreCache`):**
    *   Adapt the `ignoreCache` to store the new hierarchical structure of ignore rules or multiple `ignore` instances, keyed appropriately (likely by directory paths).

## Benefits

*   **Correctness:** Accurately mimics Git's `.gitignore` behavior, respecting rule context.
*   **Reliability:** Resolves incorrect file exclusions in complex repositories.
*   **Maintainability:** Although more complex initially, the logic will be more aligned with standard Git practices.

## Detailed Implementation Plan

**Phase 1: Data Structure & Loading**

1.  **Modify `ignoreCache`:**
    *   Change `ignoreCache` from `Map<rootDir, { ig: Ignore, patterns: CategorizedPatterns }>` to `Map<rootDir, HierarchicalIgnoreData>`.
    *   Define `HierarchicalIgnoreData`:
        ```typescript
        interface IgnoreInstanceData {
          ig: Ignore; // The 'ignore' instance
          directoryPath: string; // Absolute, normalized path of the directory containing the .gitignore
        }

        interface HierarchicalIgnoreData {
          globalIg: Ignore; // Instance for default/excluded-files patterns
          directoryIgnores: Map<string, IgnoreInstanceData>; // Map<directoryPath, IgnoreInstanceData>
        }
        ```

2.  **Create `loadHierarchicalIgnoreData(rootDir)` function:**
    *   This function will replace the core logic of the current `loadGitignore`.
    *   It takes `rootDir` (absolute, normalized).
    *   Checks `ignoreCache` for `rootDir`. If found, return the cached `HierarchicalIgnoreData`.
    *   **Initialize:**
        *   Create a `globalIg` instance using `ignore()`. Add default patterns (`.git`, `node_modules`, etc.) and patterns from `excluded-files.js`.
        *   Initialize an empty `directoryIgnores = new Map<string, IgnoreInstanceData>()`.
    *   **Traversal:**
        *   Recursively traverse the `rootDir` similar to `collectCombinedGitignore`.
        *   For *each* `.gitignore` file found at `gitignorePath`:
            *   Read its content.
            *   Create a *new* `ignore()` instance (`dirIg`).
            *   Add the patterns from this specific `.gitignore` file to `dirIg`.
            *   Get the absolute, normalized path of the directory containing this `.gitignore`: `directoryPath = normalizePath(path.dirname(gitignorePath))`.
            *   Store it: `directoryIgnores.set(directoryPath, { ig: dirIg, directoryPath })`.
    *   **Cache:** Store the resulting `{ globalIg, directoryIgnores }` object in `ignoreCache` keyed by `rootDir`.
    *   Return the `HierarchicalIgnoreData` object.

**Phase 2: Refactor Checking Logic**

1.  **Create `isPathIgnoredHierarchically(fullPath, rootDir, ignoreData)` function:**
    *   Takes the absolute, normalized `fullPath` of the file/directory to check.
    *   Takes the absolute, normalized `rootDir`.
    *   Takes the `HierarchicalIgnoreData` obtained from `loadHierarchicalIgnoreData`.
    *   **Determine Applicable Ignores:**
        *   Start with `currentDir = normalizePath(path.dirname(fullPath))`.
        *   Initialize `isIgnored = false`, `negatedByChild = false`.
        *   Check against `ignoreData.globalIg`:
            *   `relativePath = safeRelativePath(rootDir, fullPath)`
            *   If `ignoreData.globalIg.ignores(relativePath)`, set `isIgnored = true`.
        *   **Walk Upwards:** Loop while `currentDir` is within or equal to `rootDir`:
            *   Check if `ignoreData.directoryIgnores.has(currentDir)`.
            *   If yes, get the `instanceData = ignoreData.directoryIgnores.get(currentDir)`.
            *   Calculate `pathRelativeToIgnoreDir = safeRelativePath(instanceData.directoryPath, fullPath)`.
            *   Check the patterns in `instanceData.ig`:
                *   Use `instanceData.ig.test(pathRelativeToIgnoreDir)` which returns `{ ignored: boolean, unignored: boolean }`.
                *   If `testResult.ignored`, set `isIgnored = true`.
                *   If `testResult.unignored`, set `negatedByChild = true` (this handles `!` patterns overriding parent ignores).
            *   Move to the parent directory: `currentDir = normalizePath(path.dirname(currentDir))`. If `currentDir` is the same as before (reached root), break the loop.
    *   **Final Decision:** Return `isIgnored && !negatedByChild`. (A path is ignored if any rule ignores it, unless a more specific rule negates it). *Simplification: This handles basic negation but might not cover all complex Git precedence edge cases perfectly, aligning with the "balance performance" goal.*

2.  **Update `readFilesRecursively` / `processDirectory`:**
    *   At the beginning of `readFilesRecursively`, call `const ignoreData = await loadHierarchicalIgnoreData(rootDir)` once.
    *   Pass `ignoreData` down through recursive calls instead of the single `ignoreFilter`.
    *   Replace the check `!ignoreFilter.ignores(relativePath)` with `!isPathIgnoredHierarchically(fullPath, rootDir, ignoreData)`.

**Phase 3: Cleanup & Testing**

1.  **Remove Old Functions:** Remove `collectCombinedGitignore` and the old `loadGitignore` logic.
2.  **Testing:**
    *   Create a test directory structure:
        ```
        test-repo/
        ├── .gitignore  (ignore *.log)
        ├── file.txt
        ├── file.log
        └── sub/
            ├── .gitignore (ignore *.data, !important.data)
            ├── data.txt
            ├── data.log
            ├── important.data
            └── nested/
                └── other.log
        ```
    *   Verify that:
        *   `file.log` is ignored.
        *   `sub/data.log` is ignored (by root `.gitignore`).
        *   `sub/data.txt` is *not* ignored.
        *   `sub/important.data` is *not* ignored (negated).
        *   `sub/nested/other.log` is ignored (by root `.gitignore`).
    *   Test performance on a larger structure.

## Mermaid Diagram (Refined Flow):

```mermaid
graph TD
    subgraph Loading [Phase 1: Load Ignore Data for /repo]
        L1[Start loadHierarchicalIgnoreData('/repo')] --> L2{Cache Hit?};
        L2 -- Yes --> L8[Return Cached Data];
        L2 -- No --> L3[Create Global Ig Instance];
        L3 --> L4[Traverse /repo];
        L4 -- Find .gitignore at ./ --> L5a[Create Ignore Instance for ./];
        L4 -- Find .gitignore at ./sub/ --> L5b[Create Ignore Instance for ./sub/];
        L5a & L5b --> L6[Store Instances in Map];
        L6 & L3 --> L7[Cache Result];
        L7 --> L8;
    end

    subgraph Checking [Phase 2: Check /repo/sub/data.log]
        C1[Start isPathIgnoredHierarchically] --> C2[Get Ignore Data for /repo];
        C2 --> C3{Check Global Rules};
        C3 -- Ignored --> C4[Set isIgnored = true];
        C3 -- Not Ignored --> C4;

        C4 --> C5{Start Walk Up from /repo/sub};
        C5 --> C6{Check /repo/sub .gitignore};
        C6 -- Match Ignore --> C7[Set isIgnored = true];
        C6 -- Match Negate --> C8[Set negatedByChild = true];
        C6 --> C9{Check /repo .gitignore};
        C9 -- Match Ignore --> C7;
        C9 -- Match Negate --> C8;

        C7 & C8 --> C10[Final Result: isIgnored AND !negatedByChild];
    end

    Loading --> Checking;
