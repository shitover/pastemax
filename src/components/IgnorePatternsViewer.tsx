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

/**
 * Format and sort patterns for display
 * @param patterns Array of pattern strings
 * @returns Sorted and formatted array of patterns
 */
const formatPatterns = (patterns: string[]): string[] => {
  return patterns
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map(pattern => pattern.trim())
    .filter(pattern => pattern.length > 0);
};

export const IgnorePatternsViewer = ({
  isOpen,
  onClose,
  patterns,
  error
}: IgnorePatternsViewerProps): JSX.Element | null => {
  if (!isOpen) return null;

  const formatPatternCount = (count: number, type: string): string => {
    return `${count} ${type}${count === 1 ? '' : 's'}`;
  };

  return (
    <div className="ignore-patterns-modal-overlay">
      <div className="ignore-patterns-modal">
        <div className="ignore-patterns-header">
          <h2>Applied Ignore Patterns</h2>
          <button onClick={onClose} className="close-button" aria-label="Close">×</button>
        </div>
        <div className="ignore-patterns-content">
          {error ? (
            <div className="ignore-patterns-error">{error}</div>
          ) : patterns ? (
            <div className="ignore-patterns-sections">
              <section className="ignore-patterns-section">
                <div className="section-header">
                  <h3>Default Patterns</h3>
                  <span className="pattern-count">
                    {formatPatternCount(patterns.default.length, 'pattern')}
                  </span>
                </div>
                <pre className="pattern-list">
                  {formatPatterns(patterns.default).join('\n')}
                </pre>
              </section>

              <section className="ignore-patterns-section">
                <div className="section-header">
                  <h3>Global Exclusions</h3>
                  <span className="pattern-count">
                    {formatPatternCount(patterns.excludedFiles.length, 'pattern')}
                  </span>
                </div>
                <div className="section-subtitle">From excluded-files.js</div>
                <pre className="pattern-list">
                  {formatPatterns(patterns.excludedFiles).join('\n')}
                </pre>
              </section>

              <section className="ignore-patterns-section">
                <div className="section-header">
                  <h3>Repository Rules</h3>
                  <span className="pattern-count">
                    {formatPatternCount(patterns.gitignore.length, 'pattern')}
                  </span>
                </div>
                <div className="section-subtitle">From .gitignore files</div>
                {patterns.gitignore.length > 0 ? (
                  <pre className="pattern-list">
                    {formatPatterns(patterns.gitignore).join('\n')}
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
