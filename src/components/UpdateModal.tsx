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
  const [isChecking, setIsChecking] = useState(false);
  const [isRetryOnCooldown, setIsRetryOnCooldown] = useState(false);

  // Sync with external updateStatus prop
  React.useEffect(() => {
    setUpdateStatus(externalUpdateStatus);
  }, [externalUpdateStatus]);

  const handleDownloadUpdate = useCallback(() => {
    if (updateStatus?.releaseUrl) {
      window.open(updateStatus.releaseUrl, '_blank');
    }
  }, [updateStatus]);

  const handleRecheck = useCallback(async () => {
    if (isRetryOnCooldown) return;

    setIsChecking(true);
    setIsRetryOnCooldown(true);

    setUpdateStatus((prevStatus: UpdateDisplayState | null) => ({
      ...(prevStatus || { currentVersion: '', isUpdateAvailable: false }),
      isLoading: true,
      isUpdateAvailable: false,
      error: undefined,
      latestVersion: undefined,
      releaseUrl: undefined,
      debugLogs: undefined,
    }));

    const result = await checkForUpdates();
    setUpdateStatus(result);
    setIsChecking(false);

    const cooldownDuration = result.error?.includes('403') ? 60000 : 10000;
    setTimeout(() => {
      setIsRetryOnCooldown(false);
    }, cooldownDuration);
  }, [isRetryOnCooldown]);

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
          ) : updateStatus.isLoading || isChecking ? (
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
              <button
                className="check-updates-button"
                type="button"
                tabIndex={0}
                onClick={handleRecheck}
                disabled={isChecking || isRetryOnCooldown || updateStatus?.isLoading}
              >
                Retry
              </button>
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
              <button
                className="check-updates-button"
                type="button"
                tabIndex={0}
                onClick={handleRecheck}
                disabled={isChecking || isRetryOnCooldown || updateStatus?.isLoading}
              >
                Re-check
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
