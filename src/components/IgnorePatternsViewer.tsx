import React from 'react';

interface IgnorePatternsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  patterns?: {
    default: string[];
    excludedFiles: string[];
    gitignore: string[];
  };
  error?: string;
}

export const IgnorePatternsViewer = ({
  isOpen,
  onClose,
  patterns,
  error
}: IgnorePatternsViewerProps): JSX.Element | null => {
  if (!isOpen) return null;

  return (
    <div className="ignore-patterns-modal-overlay">
      <div className="ignore-patterns-modal">
        <div className="ignore-patterns-header">
          <h2>Applied Ignore Patterns</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="ignore-patterns-content">
          {error ? (
            <div className="ignore-patterns-error">{error}</div>
          ) : patterns ? (
            <div className="ignore-patterns-sections">
              <section>
                <h3>Default Patterns</h3>
                <pre className="pattern-list">
                  {patterns.default.join('\n')}
                </pre>
              </section>

              <section>
                <h3>Global Exclusions (excluded-files.js)</h3>
                <pre className="pattern-list">
                  {patterns.excludedFiles.join('\n')}
                </pre>
              </section>

              <section>
                <h3>Repository .gitignore Rules</h3>
                {patterns.gitignore.length > 0 ? (
                  <pre className="pattern-list">
                    {patterns.gitignore.join('\n')}
                  </pre>
                ) : (
                  <p className="no-patterns">No .gitignore patterns found</p>
                )}
              </section>
            </div>
          ) : (
            <div className="ignore-patterns-loading">Loading patterns...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IgnorePatternsViewer;
