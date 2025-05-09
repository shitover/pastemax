import React from 'react';
import type { UpdateDisplayState } from '../types/UpdateTypes';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateStatus: UpdateDisplayState | null;
}

const UpdateModal = ({ isOpen, onClose, updateStatus }: UpdateModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="update-modal-overlay">
      <div className="update-modal-content">
        <button className="update-modal-close-button" onClick={onClose}>
          &times;
        </button>
        <h4>Update Status</h4>
        {!updateStatus ? (
          <p>Loading update status...</p>
        ) : updateStatus.isLoading ? (
          <p>Checking for updates...</p>
        ) : updateStatus.error ? (
          <p className="update-error">Error: {updateStatus.error}</p>
        ) : updateStatus.isUpdateAvailable ? (
          <div>
            <p>New version available: {updateStatus.latestVersion}</p>
            <p>Current version: {updateStatus.currentVersion}</p>
            {updateStatus.releaseUrl && (
              <a href={updateStatus.releaseUrl} target="_blank" rel="noopener noreferrer">
                View release notes
              </a>
            )}
          </div>
        ) : (
          <p>You're up to date with version {updateStatus.currentVersion}</p>
        )}
      </div>
    </div>
  );
};

export default UpdateModal;
