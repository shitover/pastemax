# Revised Plan for Fixing .gitignore Hierarchy

This document outlines the revised plan for addressing issues with `.gitignore` handling, specifically focusing on improving pattern collection and hierarchical application of rules, as well as updating the `IgnorePatternsViewer.tsx` component to reflect these changes.

## 1. Problem Statement

The current implementation of `.gitignore` handling has several issues:
- The `collectGitignoreHierarchy` function incorrectly walks *up* the directory tree instead of recursively scanning *downwards*.
- Patterns from subdirectories' `.gitignore` files aren't being applied with the correct relative context.
- The `IgnorePatternsViewer.tsx` component shows "0 patterns" even when `.gitignore` files exist.

## 2. Implementation Plan

### 2.1. Implement `collectGitignoreMapRecursive`

Replace `collectGitignoreHierarchy` with a new recursive scanning function that:
- Takes `startDir` and `rootDir` parameters
- Recursively scans *downwards* from the starting directory
- Returns a `Map<string, string[]>` where:
  - Keys are directory paths (relative to root)
  - Values are arrays of patterns from that directory's `.gitignore`

### 2.2. Modify `loadGitignore`

Update the core ignore loading logic to:
1. Call `collectGitignoreMapRecursive(rootDir, rootDir)`
2. Process the returned `Map`:
   - For each `[relativeDirPath, patterns]` entry
   - Add patterns to the `ignore` instance with correct relative context
3. Update cache structure:
   - Store the collected map under `gitignoreMap` key
   - Remove old `gitignoreHierarchy` usage

### 2.3. Update IPC Handler

Modify the `get-ignore-patterns` handler to:
- Retrieve the cached `gitignoreMap` data
- Return it in the patterns object
- Remove temporary debugging/force-reload logic

### 2.4. Update Frontend Component

Update `IgnorePatternsViewer.tsx` to:
- Expect `gitignoreMap` in patterns prop
- Iterate over map entries to display sections
- Use relative paths for section titles/subtitles

## 3. Implementation Flow

```mermaid
graph TD
    A[Start: Load Directory] --> B(Call loadGitignore(rootDir));
    B --> C{Cache Hit?};
    C -- Yes --> D[Return Cached 'ig' Instance];
    C -- No --> E[Create New 'ig' Instance];
    E --> F[Add Default/Excluded Patterns];
    F --> G[Call collectGitignoreMapRecursive(rootDir, rootDir)];
    G --> H{Process Returned Map};
    subgraph Process Map Iteration
        direction LR
        H1[For each [relPath, patterns] in Map] --> H2[Prepend relPath to non-absolute patterns];
        H2 --> H3[ig.add(processedPatterns)];
    end
    H --> H3;
    H3 --> I[Cache { ig, patterns: {..., gitignoreMap: map} }];
    I --> D;
    D --> J[Use 'ig' Instance in readFilesRecursively];
    J --> K[End];

    L[UI Request: View Patterns] --> M(Call get-ignore-patterns Handler);
    M --> N[Ensure loadGitignore Ran (Cache Populated)];
    N --> O[Retrieve Cached Data { patterns: {..., gitignoreMap: map} }];
    O --> P[Return { patterns: {..., gitignoreMap: map} } to UI];
```

## 4. Testing Strategy

Test the implementation with various repository structures:
- No `.gitignore`
- Root `.gitignore` only
- `.gitignore` in subdirectories
- Nested subdirectories with `.gitignore` files
- Patterns with `/` prefix and `**` wildcards

Verify:
- Files are correctly included/excluded during scanning
- Viewer displays patterns from all levels correctly
- Performance with large repositories