// src/components/FilePreviewModal.tsx
import React from "react";
import { FileData } from "../types/FileTypes";

interface FilePreviewModalProps {
  files: FileData[];
  isOpen: boolean;
  onClose: () => void;
  initialActiveFile?: string; // Add this prop
}

const FilePreviewModal = ({
  files,
  isOpen,
  onClose,
  initialActiveFile,
}: FilePreviewModalProps) => {
  const [activeFile, setActiveFile] = React.useState(() => initialActiveFile as string | undefined);

    // Set the initial active file when the modal opens or files change
  React.useEffect(() => {
    if (isOpen && files.length > 0) {
      setActiveFile(initialActiveFile || files[0].path);
    }
  }, [isOpen, files, initialActiveFile]);

  if (!isOpen) {
    return null;
  }

  const activeFileData = files.find((file) => file.path === activeFile);

  return (
    <div className="file-preview-modal-overlay" onClick={onClose}>
      <div
        className="file-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="file-preview-modal-header">
          <div className="file-preview-tabs">
            {files.map((file) => (
              <button
                key={file.path}
                className={`file-preview-tab ${
                  activeFile === file.path ? "active" : ""
                }`}
                onClick={() => setActiveFile(file.path)}
              >
                {file.name}
              </button>
            ))}
          </div>
          <button className="file-preview-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="file-preview-modal-content">
          {activeFileData ? (
            <pre className="monospace">{activeFileData.content}</pre>
          ) : (
            <div>No file selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;