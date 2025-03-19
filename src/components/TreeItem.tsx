import React, { useRef, useEffect } from "react";
import type { MouseEvent, ChangeEvent } from "react";
import { TreeItemProps, TreeNode } from "../types/FileTypes";
import { ChevronRight, File, Folder } from "lucide-react";
import { arePathsEqual } from "../utils/pathUtils";

const TreeItem = ({
  node,
  selectedFiles,
  toggleFileSelection,
  toggleFolderSelection,
  toggleExpanded,
}: TreeItemProps) => {
  const { id, name, path, type, level, isExpanded, fileData } = node;
  const checkboxRef = useRef(null);

  const isSelected =
    type === "file" &&
    selectedFiles.some((selectedPath) => arePathsEqual(selectedPath, path));

  // Recursive function to check if all files in a directory are selected
  const areAllFilesInDirectorySelected = (node: TreeNode): boolean => {
    if (node.type === "file") {
      // Skip binary, skipped or excluded files
      if (node.fileData && (node.fileData.isBinary || node.fileData.isSkipped || node.fileData.excludedByDefault)) {
        return true; // Consider these as "selected" for the "all files selected" check
      }
      return selectedFiles.some((selectedPath) =>
        arePathsEqual(selectedPath, node.path)
      );
    }

    if (
      node.type === "directory" &&
      node.children &&
      node.children.length > 0
    ) {
      // Get all selectable children (non-binary, non-skipped files)
      const selectableChildren = node.children.filter(
        child => 
          !(child.type === "file" && 
            child.fileData && 
            (child.fileData.isBinary || child.fileData.isSkipped || child.fileData.excludedByDefault))
      );
      
      // If there are no selectable children, consider it "all selected"
      if (selectableChildren.length === 0) {
        return true;
      }
      
      // Check if all selectable children are selected
      return selectableChildren.every((child) =>
        areAllFilesInDirectorySelected(child)
      );
    }

    return false;
  };

  // Recursive function to check if any file in a directory is selected
  const isAnyFileInDirectorySelected = (node: TreeNode): boolean => {
    if (node.type === "file") {
      // Skip binary, skipped or excluded files
      if (node.fileData && (node.fileData.isBinary || node.fileData.isSkipped || node.fileData.excludedByDefault)) {
        return false; // These files don't count for the "any files selected" check
      }
      return selectedFiles.some((selectedPath) =>
        arePathsEqual(selectedPath, node.path)
      );
    }

    if (
      node.type === "directory" &&
      node.children &&
      node.children.length > 0
    ) {
      // Get all selectable children (non-binary, non-skipped files)
      const selectableChildren = node.children.filter(
        child => 
          !(child.type === "file" && 
            child.fileData && 
            (child.fileData.isBinary || child.fileData.isSkipped || child.fileData.excludedByDefault))
      );
      
      // If there are no selectable children, consider it "none selected"
      if (selectableChildren.length === 0) {
        return false;
      }
      
      // Check if any selectable child is selected
      return selectableChildren.some((child) => 
        isAnyFileInDirectorySelected(child)
      );
    }

    return false;
  };

  // For directories, check if all children are selected
  const isDirectorySelected =
    type === "directory" && node.children && node.children.length > 0
      ? areAllFilesInDirectorySelected(node)
      : false;

  // Check if some but not all files in this directory are selected
  const isDirectoryPartiallySelected =
    type === "directory" && node.children && node.children.length > 0
      ? isAnyFileInDirectorySelected(node) && !isDirectorySelected
      : false;

  // Update the indeterminate state manually whenever it changes
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isDirectoryPartiallySelected;
    }
  }, [isDirectoryPartiallySelected]);

  const handleToggle = (e: any) => {
    e.stopPropagation();
    toggleExpanded(id);
  };

  const handleItemClick = (e: any) => {
    if (type === "directory") {
      toggleExpanded(id);
    } else if (type === "file" && !isDisabled) {
      toggleFileSelection(path);
    }
  };

  const handleCheckboxChange = (e: any) => {
    e.stopPropagation();
    if (type === "file") {
      toggleFileSelection(path);
    } else if (type === "directory") {
      toggleFolderSelection(path, e.target.checked);
    }
  };

  // Check if file is binary or otherwise unselectable
  const isDisabled = fileData ? fileData.isBinary || fileData.isSkipped : false;

  // Check if the file is excluded by default (but still selectable)
  const isExcludedByDefault = fileData?.excludedByDefault || false;

  return (
    <div
      className={`tree-item ${isSelected ? "selected" : ""} ${
        isExcludedByDefault ? "excluded-by-default" : ""
      }`}
      style={{ marginLeft: `${level * 16}px` }}
      onClick={handleItemClick}
    >
      {type === "directory" && (
        <div
          className={`tree-item-toggle ${isExpanded ? "expanded" : ""}`}
          onClick={handleToggle}
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
        >
          <ChevronRight size={16} />
        </div>
      )}

      {type === "file" && <div className="tree-item-indent"></div>}

      <input
        type="checkbox"
        className="tree-item-checkbox"
        checked={type === "file" ? isSelected : isDirectorySelected}
        ref={checkboxRef}
        onChange={handleCheckboxChange}
        disabled={isDisabled}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="tree-item-content">
        <div className="tree-item-icon">
          {type === "directory" ? <Folder size={16} /> : <File size={16} />}
        </div>

        <div className="tree-item-name">{name}</div>

        {fileData && fileData.tokenCount > 0 && (
          <span className="tree-item-tokens">
            (~{fileData.tokenCount.toLocaleString()})
          </span>
        )}

        {isDisabled && fileData && (
          <span className="tree-item-badge">
            {fileData.isBinary ? "Binary" : "Skipped"}
          </span>
        )}

        {!isDisabled && isExcludedByDefault && (
          <span className="tree-item-badge excluded">Excluded</span>
        )}
      </div>
    </div>
  );
};

export default TreeItem;
