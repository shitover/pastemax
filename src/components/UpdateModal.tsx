import React, { useCallback, useState } from 'react';

export interface UpdateCheckResultFromMain {
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  error?: string;
  isLoading?: boolean;
  debugLogs?: string;
}

export interface UpdateDisplayState extends UpdateCheckResultFromMain {
  isLoading: boolean;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateStatus: UpdateDisplayState | null;
}

const checkForUpdates = async (): Promise<UpdateDisplayState> => {
  if (!window.electron?.ipcRenderer?.invoke) {
    return {
      isLoading: false,
      isUpdateAvailable: false,
      currentVersion: '',
      error: 'Electron IPC not available',
    };
  }
  try {
    const result = await window.electron.ipcRenderer.invoke('check-for-updates');
    return {
      ...result,
      isLoading: false,
    };
  } catch (error: any) {
    return {
      isLoading: false,
      isUpdateAvailable: false,
      currentVersion: '',
      error: error?.message || 'Unknown error during IPC invoke',
      debugLogs: error?.stack || (typeof error === 'string' ? error : 'IPC invoke failed'),
    };
  }
};

const UpdateModal = ({ isOpen, onClose, updateStatus: externalUpdateStatus }: UpdateModalProps) => {
  const [updateStatus, setUpdateStatus] = useState(
    externalUpdateStatus as UpdateDisplayState | null
  );
  const [isRetryOnCooldown, setIsRetryOnCooldown] = useState(false);
  const [sessionRetryAttempts, setSessionRetryAttempts] = useState(0);
  const MAX_BUTTON_CLICKS_PER_MODAL_SESSION = 2;

  // Sync with external updateStatus prop
  React.useEffect(() => {
    setUpdateStatus(externalUpdateStatus);
    if (externalUpdateStatus && !externalUpdateStatus.isLoading) {
      if (
        !externalUpdateStatus.error ||
        externalUpdateStatus.error?.includes('Maximum update check attempts')
      ) {
        setSessionRetryAttempts(0);
      }
    }
  }, [externalUpdateStatus]);

  const handleDownloadUpdate = useCallback(() => {
    if (updateStatus?.releaseUrl) {
      window.open(updateStatus.releaseUrl, '_blank');
    }
  }, [updateStatus]);

  const handleRecheck = useCallback(async () => {
    if (isRetryOnCooldown || (updateStatus?.isLoading ?? false)) return;
    if (
      sessionRetryAttempts >= MAX_BUTTON_CLICKS_PER_MODAL_SESSION &&
      updateStatus?.error &&
      !updateStatus.error.includes('Maximum update check attempts')
    ) {
      return;
    }

    setIsRetryOnCooldown(true);
    setSessionRetryAttempts((prev: number) => prev + 1);

    setUpdateStatus(
      (prev: UpdateDisplayState | null): UpdateDisplayState => ({
        ...(prev || { currentVersion: '', isUpdateAvailable: false }),
        isLoading: true,
        error: undefined,
      })
    );

    const result = await checkForUpdates();
    setUpdateStatus(result);

    const cooldownDuration = result.error?.includes('403') ? 60000 : result.error ? 10000 : 1000;
    setTimeout(() => {
      setIsRetryOnCooldown(false);
    }, cooldownDuration);
  }, [isRetryOnCooldown, updateStatus, sessionRetryAttempts]);

  const retryButtonDisabled =
    (updateStatus?.isLoading ?? false) ||
    isRetryOnCooldown ||
    updateStatus?.error?.includes('Maximum update check attempts reached');

  const retryButtonText = updateStatus?.error?.includes('Maximum update check attempts reached')
    ? 'Restart to Check'
    : 'Retry';
  const recheckButtonText = updateStatus?.error?.includes('Maximum update check attempts reached')
    ? 'Restart to Check'
    : 'Re-check';

  if (!isOpen) {
    return null;
  }

  return (
    <div className="update-modal-overlay">
      <div className="update-modal-content" tabIndex={-1}>
        <div className="update-modal-header">
          <h3>Update Status</h3>
          <button
            className="update-modal-close-button"
            onClick={onClose}
            aria-label="Close update modal"
            title="Close"
          >
            Close
          </button>
        </div>
        <div className="update-modal-body">
          {!updateStatus ? (
            <p className="update-message">Loading update status...</p>
          ) : updateStatus.isLoading ? (
            <p className="update-message">Checking for updates...</p>
          ) : updateStatus.error ? (
            <>
              <p className="update-message update-message-error">Error: {updateStatus.error}</p>
              {updateStatus.debugLogs && (
                <details style={{ marginTop: 8 }}>
                  <summary
                    style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}
                  >
                    Show debug logs
                  </summary>
                  <pre
                    style={{
                      fontSize: 12,
                      background: 'var(--background-tertiary)',
                      color: 'var(--text-secondary)',
                      padding: 8,
                      borderRadius: 8,
                      marginTop: 6,
                      maxHeight: 180,
                      overflow: 'auto',
                    }}
                  >
                    {updateStatus.debugLogs}
                  </pre>
                </details>
              )}
              {/* Retry button removed */}
            </>
          ) : updateStatus.isUpdateAvailable ? (
            <div>
              <p className="update-message update-message-success">
                New version available:{' '}
                <span className="update-version">{updateStatus.latestVersion}</span>
              </p>
              <p className="update-message">
                Current version:{' '}
                <span className="update-version">{updateStatus.currentVersion}</span>
              </p>
              <button
                className="check-updates-button"
                type="button"
                tabIndex={0}
                onClick={handleDownloadUpdate}
              >
                Download Update
              </button>
            </div>
          ) : (
            <>
              <p className="update-message update-message-success">
                You're up to date with version {updateStatus.currentVersion}
              </p>
              {/* Re-check button removed */}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
