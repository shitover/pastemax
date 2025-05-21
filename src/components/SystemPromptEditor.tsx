import React, { useState, useEffect } from 'react';
import '../styles/modals/SystemPromptEditor.css';

interface SystemPromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  onSave: (prompt: string) => void;
  onResetToDefault: () => void;
}

const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  onSave,
  onResetToDefault,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(initialPrompt);
    setCharCount(initialPrompt.length);
  }, [initialPrompt, isOpen]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    setCharCount(newPrompt.length);

    // Clear previous error if any
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSave = async () => {
    if (!prompt.trim()) {
      setErrorMessage('System prompt cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      onSave(prompt);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save system prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Are you sure you want to reset to the default system prompt? This action cannot be undone.'
      )
    ) {
      onResetToDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="system-prompt-modal-overlay" onClick={onClose}>
      <div className="system-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="system-prompt-modal-header">
          <h3>Edit System Prompt</h3>
          <button className="system-prompt-modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="system-prompt-modal-content">
          <p className="system-prompt-description">
            Customize the system prompt to define how the AI code agent behaves. This prompt will be
            used for all chat interactions.
          </p>

          <textarea
            className="system-prompt-textarea"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Enter your system prompt here..."
            rows={15}
          />

          <div className="system-prompt-info">
            <span className="char-count">{charCount} characters</span>
          </div>

          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>

        <div className="system-prompt-modal-footer">
          <button className="system-prompt-reset-button" onClick={handleResetToDefault}>
            Reset to Default
          </button>
          <div className="system-prompt-actions">
            <button className="system-prompt-cancel-button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              className="system-prompt-save-button"
              onClick={handleSave}
              disabled={isSaving || !prompt.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptEditor;
