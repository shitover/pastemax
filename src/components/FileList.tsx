// src/components/FileList.tsx
import { useState, useMemo } from 'react'; // Add memoization
import { FileListProps, FileData } from '../types/FileTypes';
import FileCard from './FileCard';
import FilePreviewModal from './FilePreviewModal';
import { arePathsEqual } from '../utils/pathUtils';

// Add proper memoization to avoid unnecessary re-renders
const FileList = ({ files, selectedFiles, toggleFileSelection }: FileListProps) => {
  // Only show files that are in the selectedFiles array and not binary/skipped
  const displayableFiles = useMemo(
    () =>
      files.filter(
        (file: FileData) =>
          selectedFiles.some((selectedPath) => arePathsEqual(selectedPath, file.path)) &&
          !file.isBinary &&
          !file.isSkipped
      ),
    [files, selectedFiles]
  );

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([] as FileData[]);
  const [activePreviewFile, setActivePreviewFile] = useState("" as string); // Track active file

  const handlePreview = (filePath: string) => {
    const fileToPreview = files.find((f) => f.path === filePath);
    if (fileToPreview) {
      setPreviewFiles([fileToPreview]); // Set to a single file
      setActivePreviewFile(filePath);
      setPreviewModalOpen(true);
    }
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewFiles([]);
    setActivePreviewFile("");
  };

  return (
    <div className="file-list-container">
      {displayableFiles.length > 0 ? (
        <div className="file-list">
          {displayableFiles.map((file: FileData) => (
            <FileCard
              key={file.path}
              file={file}
              isSelected={true} // All displayed files are selected
              toggleSelection={toggleFileSelection}
              onPreview={handlePreview} // Pass the preview handler
            />
          ))}
        </div>
      ) : (
        <div className="file-list-empty">
          {files.length > 0
            ? 'No files selected. Select files from the sidebar.'
            : 'Select a folder to view files'}
        </div>
      )}
      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        files={previewFiles}
        initialActiveFile={activePreviewFile}
      />
    </div>
  );
};

export default FileList;
