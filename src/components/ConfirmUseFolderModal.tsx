import React from 'react';
import '../styles/modals/ConfirmUseFolderModal.css';

interface ConfirmUseFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDecline: () => void;
  workspaceName: string;
  folderPath: string;
}

const ConfirmUseFolderModal: React.FC<ConfirmUseFolderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onDecline,
  workspaceName,
  folderPath,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-use-folder-modal-overlay">
      <div className="confirm-use-folder-modal">
        <div className="modal-header">
          <h3>Use Current Folder?</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <p>
            Do you want to use the current folder (<code>{folderPath}</code>) for the new workspace
            '{workspaceName}'?
          </p>
        </div>
        <div className="modal-actions">
          <button className="confirm-button" onClick={onConfirm}>
            Yes, use this folder
          </button>
          <button className="decline-button" onClick={onDecline}>
            No, choose another folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUseFolderModal;
