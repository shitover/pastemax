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

## Next Steps

*   Implement the refactoring in `main.js`.
*   Thoroughly test with repositories having nested `.gitignore` files and potentially conflicting rules.
