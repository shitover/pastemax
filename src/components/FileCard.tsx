import { useCallback, memo, useMemo } from 'react';
import { FileData } from '../types/FileTypes';
import { Plus, X, FileText, Eye, FileWarning, MessageSquare } from 'lucide-react';
import CopyButton from './CopyButton';
import ChatButton from './ChatButton';

interface FileCardComponentProps {
  file: FileData;
  isSelected: boolean;
  toggleSelection: (path: string) => void;
  onPreview: (filePath: string) => void;
  onChatAbout?: (filePath: string) => void;
  isLlmConfigured?: boolean;
}

const FileCard = ({
  file,
  isSelected,
  toggleSelection,
  onPreview,
  onChatAbout,
  isLlmConfigured = false,
}: FileCardComponentProps) => {
  const { name, path: filePath, tokenCount, isBinary, size } = file;

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedSize = useMemo(() => formatFileSize(size || 0), [size]);
  const formattedTokens = tokenCount.toLocaleString();

  // Memoize event handlers to prevent unnecessary re-renders
  const handleToggleSelection = useCallback(() => {
    toggleSelection(filePath);
  }, [toggleSelection, filePath]);

  const handlePreview = useCallback(() => {
    onPreview(filePath);
  }, [onPreview, filePath]);

  const handleChatAbout = useCallback(() => {
    if (onChatAbout) {
      onChatAbout(filePath);
    }
  }, [onChatAbout, filePath]);

  return (
    <div className={`file-card ${isSelected ? 'selected' : ''} ${isBinary ? 'binary-card' : ''}`}>
      <div className="file-card-header">
        <div className="file-card-icon">
          {isBinary ? <FileWarning size={16} /> : <FileText size={16} />}
        </div>
        <div className="file-card-name monospace">
          {name}
          {isBinary && <span className="file-card-binary-badge">Binary</span>}
        </div>
      </div>
      <div className="file-card-info">
        {isBinary ? (
          <div className="file-card-file-size">~{formattedSize}</div>
        ) : (
          <div className="file-card-tokens">~{formattedTokens} tokens</div>
        )}
      </div>

      <div className="file-card-actions">
        {isBinary ? (
          <button
            className="file-card-action"
            onClick={handleToggleSelection}
            title="Remove from selection"
          >
            <X size={16} />
          </button>
        ) : (
          <>
            <button
              className="file-card-action"
              onClick={handleToggleSelection}
              title={isSelected ? 'Remove from selection' : 'Add to selection'}
            >
              {isSelected ? <X size={16} /> : <Plus size={16} />}
            </button>
            <button className="file-card-action" onClick={handlePreview} title="Preview File">
              <Eye size={16} />
            </button>
            <CopyButton text={file.content} className="file-card-action">
              {''}
            </CopyButton>
            {onChatAbout && !isBinary && (
              <button
                className="file-card-action chat-action"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onChatAbout) onChatAbout(filePath);
                }}
                title="Chat about this file"
                disabled={!isLlmConfigured}
              >
                <MessageSquare size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Wrap component with React.memo to prevent unnecessary re-renders
export default memo(FileCard);
