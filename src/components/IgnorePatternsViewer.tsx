import React, { useState, useMemo, useEffect } from 'react';
import { useIgnorePatterns } from '../hooks/useIgnorePatterns';
import ToggleSwitch from './ToggleSwitch';

interface IgnorePatternsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  patterns?: {
    default?: string[];
    excludedFiles?: string[];
    // Expect the Map structure (serialized as object) now
    gitignoreMap?: { [key: string]: string[] };
  };
  error?: string;
  selectedFolder: string | null;
  isElectron: boolean;
}

interface PatternSectionProps {
  title: string;
  subtitle?: string;
  patterns: string[];
  searchTerm: string;
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

/**
 * Format the pattern count with proper pluralization
 */
const formatPatternCount = (count: number, type: string): string => {
  return `${count} ${type}${count === 1 ? '' : 's'}`;
};

/**
 * Renders a section of patterns with filtering
 */
const PatternSection = ({
  title,
  subtitle,
  patterns,
  searchTerm
}: PatternSectionProps): JSX.Element | null => {
  const filteredPatterns = useMemo(() => {
    // Ensure patterns is always an array, even if undefined initially
    const normalized = formatPatterns(patterns || []);
 
    if (!searchTerm) return normalized;
    
    const searchLower = searchTerm.toLowerCase();
    return normalized.filter(pattern => 
      pattern.toLowerCase().includes(searchLower)
    );
  }, [patterns, searchTerm]);

  // Don't render section if no patterns match search
  if (filteredPatterns.length === 0 && searchTerm) return null;

  return (
    <section className="ignore-patterns-section">
      <div className="section-header">
        <h3>{title}</h3>
        <span className="pattern-count">
          {formatPatternCount(filteredPatterns.length, 'pattern')}
        </span>
      </div>
      {subtitle && <div className="section-subtitle">{subtitle}</div>}
      {filteredPatterns.length > 0 ? (
        <pre className="pattern-list">
          {filteredPatterns.join('\n')}
        </pre>
      ) : (
        <p className="no-patterns">No patterns found</p>
      )}
    </section>
  );
};

export const IgnorePatternsViewer = ({
  isOpen,
  onClose,
  patterns,
  error,
  selectedFolder,
  isElectron
}: IgnorePatternsViewerProps): JSX.Element | null => {
  const [searchTerm, setSearchTerm] = useState('');
  const { ignoreMode, setIgnoreMode, customIgnores, setCustomIgnores } = useIgnorePatterns(
    selectedFolder,
    isElectron
  );
  const [customIgnoreInput, setCustomIgnoreInput] = useState('');

  // Log the received patterns prop for debugging
  useEffect(() => {
    if (isOpen) {
      console.log("DEBUG: IgnorePatternsViewer received patterns:", JSON.stringify(patterns, null, 2));
      console.log("DEBUG: gitignoreMap entries:", patterns?.gitignoreMap ? Object.keys(patterns.gitignoreMap).length : 0);
    }
  }, [isOpen, patterns]);

  // Reset search when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ignore-patterns-container">
      {/* Overlay div that closes the modal when clicked */}
      <div className="ignore-patterns-modal-overlay" onClick={onClose}></div>
      
      {/* Modal dialog - stopPropagation prevents clicks inside from closing */}
      <div className="ignore-patterns-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ignore-patterns-header">
          <h2>Applied Ignore Patterns</h2>
          <button onClick={onClose} className="close-button" aria-label="Close">×</button>
        </div>
        <div className="ignore-patterns-content">
          {/* Mode Toggle Switch - Always visible */}
          <div className="ignore-patterns-mode-toggle">
            <ToggleSwitch
              isOn={ignoreMode === 'global'}
              onToggle={() => setIgnoreMode(ignoreMode === 'automatic' ? 'global' : 'automatic')}
            />
          </div>

          {/* Conditional content based on folder selection */}
          {!selectedFolder ? (
            <div className="ignore-patterns-empty-state">
              <p>No folder selected. Select a folder to view active ignore patterns.</p>
              <p>You can still configure global ignore settings above.</p>
            </div>
          ) : error ? (
            <div className="ignore-patterns-error">{error}</div>
          ) : patterns ? (
            <React.Fragment>
              <div className="ignore-patterns-search">
                <input
                  type="text"
                  placeholder="Search patterns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  style={{
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  autoFocus
                />
              </div>

              <div className="ignore-patterns-sections">
                  {ignoreMode === 'global' && (
                    <PatternSection
                      title="Global Exclusions"
                      subtitle="From excluded-files.js"
                      patterns={patterns.excludedFiles || []}
                      searchTerm={searchTerm}
                    />
                  )}
                )
                
                {/* Custom ignores section - Only visible in global mode */}
                {ignoreMode === 'global' && (
                  <div className="custom-global-ignores">
                    <h4 
                      tabIndex={0} 
                      role="button"
                      aria-label="Custom Global Ignores section" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          // Add interaction functionality here if needed
                        }
                      }}
                    >
                      Custom Global Ignores
                    </h4>
                    
                    <div className="custom-ignore-input">
                      <input
                        type="text"
                        placeholder="Enter additional ignore pattern"
                        value={customIgnoreInput}
                        onChange={(e) => setCustomIgnoreInput(e.target.value)}
                        className="search-input"
                        style={{
                          border: '2px solid var(--color-primary)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <button
                        className="add-pattern-button"
                        onClick={() => {
                          const trimmed = customIgnoreInput.trim();
                          if (trimmed) {
                            setCustomIgnores([...customIgnores, trimmed]);
                            setCustomIgnoreInput('');
                          }
                        }}
                      >
                        Add Pattern
                      </button>
                    </div>
                    
                    {customIgnores.length > 0 && (
                      <div className="custom-ignore-list">
                        <ul>
                          {customIgnores.map((pattern: string, index: number) => (
                            <li key={index}>
                              {pattern}
                              <button
                                className="remove-pattern-button"
                                onClick={() => {
                                  setCustomIgnores(customIgnores.filter((_: string, i: number) => i !== index));
                                }}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Render gitignore patterns from the Map */}
                {ignoreMode === 'automatic' && (
                  patterns.gitignoreMap ? (
                    Object.entries(patterns.gitignoreMap)
                      .sort(([a], [b]) => {
                        if (a === '.') return -1;
                        if (b === '.') return 1;
                        return a.localeCompare(b);
                      })
                      .map(([dirPath, dirPatterns]) => (
                        <PatternSection
                          key={dirPath}
                          title={`Repository Rules (${dirPath === '.' ? './' : dirPath})`}
                          subtitle={`From ${dirPath === '.' ? './' : dirPath}/.gitignore`}
                          patterns={dirPatterns}
                          searchTerm={searchTerm}
                        />
                      ))
                  ) : (
                    <PatternSection
                      title="Repository Rules (No Rules Found)"
                      subtitle="No .gitignore rules found in the repository"
                      patterns={[]}
                      searchTerm={searchTerm}
                    />
                  )
                )}
              </div>
            </React.Fragment>
          ) : (
            <div className="ignore-patterns-loading">Loading patterns...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IgnorePatternsViewer;
