import React from 'react';
import { X } from 'lucide-react';
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
    <div className="use-folder-option-modal-overlay">
      <div className="use-folder-option-modal">
        <div className="modal-header">
          <h3>Use Current Folder?</h3>
          <button className="icon-button close-button" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-content">
          <p>
            Do you want to use the current folder: (<code>{folderPath}</code>)
          </p>
        </div>
        <div className="modal-actions">
          <button className="primary confirm-button" onClick={onConfirm}>
            Yes, use this folder
          </button>
          <button className="primary decline-button" onClick={onDecline}>
            No, choose another folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUseFolderModal;
