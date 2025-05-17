import React, { useState } from 'react';
import { Copy, Clock, X, Maximize2 } from 'lucide-react';

export interface CopyHistoryItem {
  content: string;
  timestamp: number;
  label?: string;
}

interface CopyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  copyHistory: CopyHistoryItem[];
  onCopyItem: (content: string) => void;
  onClearHistory: () => void;
}

const CopyHistoryModal = ({
  isOpen,
  onClose,
  copyHistory,
  onCopyItem,
  onClearHistory,
}: CopyHistoryModalProps) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);

  if (!isOpen) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get preview of content (first 100 characters)
  const getContentPreview = (content: string) => {
    if (content.length <= 100) return content;
    return content.substring(0, 97) + '...';
  };

  const handleItemClick = (index: number) => {
    setSelectedItem(index);
  };

  const handleShowDetailView = () => {
    if (selectedItem !== null) {
      setShowDetailView(true);
    }
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
  };

  return (
    <>
      <div className="copy-history-modal-overlay" onClick={onClose}>
        <div className="copy-history-modal" onClick={(e) => e.stopPropagation()}>
          <div className="copy-history-modal-header">
            <h3>Copy History</h3>
            <button
              className="copy-history-modal-close-button"
              onClick={onClose}
              aria-label="Close copy history modal"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="copy-history-modal-content">
            {copyHistory.length === 0 ? (
              <div className="copy-history-empty">
                <Clock size={24} />
                <p>No copy history available</p>
              </div>
            ) : (
              <>
                <div className="copy-history-list">
                  {copyHistory.map((item, index) => (
                    <div
                      key={index}
                      className={`copy-history-item ${selectedItem === index ? 'selected' : ''}`}
                      onClick={() => handleItemClick(index)}
                    >
                      <div className="copy-history-item-header">
                        <span className="copy-history-item-date">{formatDate(item.timestamp)}</span>
                        <div className="copy-history-item-actions">
                          {selectedItem === index && (
                            <button
                              className="copy-history-item-expand-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowDetailView();
                              }}
                              title="View full content"
                            >
                              <Maximize2 size={14} />
                            </button>
                          )}
                          <button
                            className="copy-history-item-copy-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyItem(item.content);
                            }}
                            title="Copy to clipboard"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="copy-history-item-preview">
                        {getContentPreview(item.content)}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedItem !== null && (
                  <div className="copy-history-detail">
                    <h4>Content</h4>
                    <pre className="copy-history-detail-content">
                      {copyHistory[selectedItem].content}
                    </pre>
                    <div className="copy-history-detail-actions">
                      <button
                        className="copy-history-copy-button"
                        onClick={() => onCopyItem(copyHistory[selectedItem].content)}
                      >
                        <Copy size={14} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="copy-history-footer">
                  <button className="copy-history-clear-button" onClick={onClearHistory}>
                    Clear History
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail View Modal */}
      {showDetailView && selectedItem !== null && (
        <div className="copy-detail-modal-overlay" onClick={handleCloseDetailView}>
          <div className="copy-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="copy-detail-modal-header">
              <h3>Copied Content Detail</h3>
              <button
                className="copy-detail-modal-close-button"
                onClick={handleCloseDetailView}
                aria-label="Close detail view"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="copy-detail-modal-content">
              <div className="copy-detail-date">
                Copied on {formatDate(copyHistory[selectedItem].timestamp)}
              </div>
              <pre className="copy-detail-content">{copyHistory[selectedItem].content}</pre>
              <div className="copy-detail-footer">
                <button
                  className="copy-detail-copy-button"
                  onClick={() => onCopyItem(copyHistory[selectedItem].content)}
                >
                  <Copy size={16} />
                  <span>Copy to Clipboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CopyHistoryModal;
