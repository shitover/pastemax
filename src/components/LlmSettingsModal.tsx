import React, { useState, useEffect, useRef } from 'react';
import { LlmProvider, ProviderSpecificConfig, AllLlmConfigs } from '../types/llmTypes';
import { Edit, X } from 'lucide-react';

interface LlmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfigs: AllLlmConfigs | null;
  onSaveAllConfigs: (configs: AllLlmConfigs) => Promise<void>;
  onOpenSystemPromptEditor?: () => void;
}

const LlmSettingsModal: React.FC<LlmSettingsModalProps> = ({
  isOpen,
  onClose,
  initialConfigs,
  onSaveAllConfigs,
  onOpenSystemPromptEditor,
}) => {
  const [allConfigs, setAllConfigs] = useState<AllLlmConfigs>(initialConfigs || {});
  const [currentProvider, setCurrentProvider] = useState<LlmProvider | ''>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [defaultModelName, setDefaultModelName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [recentModels, setRecentModels] = useState<{ [key: string]: string[] }>({});

  const lastActiveProviderRef = useRef<LlmProvider | ''>('');

  useEffect(() => {
    if (isOpen) {
      setAllConfigs(initialConfigs || {});
      let providerToSet: LlmProvider | '' = '';

      if (
        lastActiveProviderRef.current &&
        initialConfigs &&
        initialConfigs[lastActiveProviderRef.current]
      ) {
        providerToSet = lastActiveProviderRef.current;
      } else if (initialConfigs && Object.keys(initialConfigs).length > 0) {
        const providerWithApiKey = Object.entries(initialConfigs).find(
          ([, config]) => !!config.apiKey
        ) as [LlmProvider, ProviderSpecificConfig] | undefined;
        if (providerWithApiKey) {
          providerToSet = providerWithApiKey[0];
        } else {
          providerToSet = Object.keys(initialConfigs)[0] as LlmProvider;
        }
      }
      setCurrentProvider(providerToSet);
      if (providerToSet) {
        lastActiveProviderRef.current = providerToSet;
      }
    } else {
      // Optional: Reset specific states when modal closes if desired, e.g., error messages
      // setErrorMessage(null); // Already handled by another useEffect
    }
  }, [initialConfigs, isOpen]);

  useEffect(() => {
    if (currentProvider && allConfigs[currentProvider]) {
      const config = allConfigs[currentProvider];
      setApiKey(config.apiKey || '');
      setDefaultModelName(config.defaultModel || '');
      setBaseUrl(config.baseUrl || '');
    } else if (currentProvider) {
      setApiKey('');
      setDefaultModelName('');
      setBaseUrl('');
    } else {
      setApiKey('');
      setDefaultModelName('');
      setBaseUrl('');
    }
  }, [currentProvider, allConfigs]);

  useEffect(() => {
    try {
      const savedModels = localStorage.getItem('pastemax-recent-models');
      if (savedModels) {
        setRecentModels(JSON.parse(savedModels));
      }
    } catch (error) {
      console.error('Error loading recent models:', error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  const getProviderPlaceholder = () => {
    switch (currentProvider) {
      case 'openai':
        return 'Enter OpenAI API Key (sk-...)';
      case 'anthropic':
        return 'Enter Anthropic API Key';
      case 'gemini':
        return 'Enter Google AI API Key';
      case 'groq':
        return 'Enter Groq API Key';
      case 'qwen':
        return 'Enter Qwen API Key';
      case 'grok':
        return 'Enter Grok API Key';
      case 'openrouter':
        return 'Enter OpenRouter API Key';
      case 'mistral':
        return 'Enter Mistral API Key';
      default:
        return 'API Key';
    }
  };

  const getRecentModelsForProvider = () => {
    return recentModels[currentProvider] || [];
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as LlmProvider | '';
    setCurrentProvider(newProvider);
    lastActiveProviderRef.current = newProvider;
  };

  const handleSave = async () => {
    if (!currentProvider) {
      setErrorMessage('Please select a provider to configure.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedProviderConfig: ProviderSpecificConfig = {
        apiKey: apiKey.trim() || null,
        defaultModel: defaultModelName.trim() || null,
        baseUrl: baseUrl.trim() || null,
      };

      const newAllConfigs = {
        ...allConfigs,
        [currentProvider]: updatedProviderConfig,
      };

      setAllConfigs(newAllConfigs);
      await onSaveAllConfigs(newAllConfigs);
      lastActiveProviderRef.current = currentProvider;

      if (defaultModelName.trim()) {
        const trimmedModelName = defaultModelName.trim();
        const updatedRecentModels = { ...recentModels };
        const providerModels = updatedRecentModels[currentProvider] || [];
        if (!providerModels.includes(trimmedModelName)) {
          updatedRecentModels[currentProvider] = [trimmedModelName, ...providerModels].slice(0, 5);
          setRecentModels(updatedRecentModels);
          localStorage.setItem('pastemax-recent-models', JSON.stringify(updatedRecentModels));
        }
      }
      setErrorMessage('Settings saved successfully for ' + currentProvider + '!');
      setTimeout(() => setErrorMessage(null), 3000);
    } catch (error) {
      console.error('Error saving LLM config:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectRecentModel = (model: string) => {
    setDefaultModelName(model);
  };

  const handleDeleteRecentModel = (modelToDelete: string) => {
    if (!currentProvider) return;
    const updatedRecentModels = { ...recentModels };
    const providerModels = updatedRecentModels[currentProvider] || [];
    updatedRecentModels[currentProvider] = providerModels.filter(
      (model) => model !== modelToDelete
    );
    setRecentModels(updatedRecentModels);
    localStorage.setItem('pastemax-recent-models', JSON.stringify(updatedRecentModels));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>LLM Settings</h3>
          <button className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="llm-provider">LLM Provider</label>
            <select
              id="llm-provider"
              value={currentProvider}
              onChange={handleProviderChange}
              className="provider-select"
              disabled={isSaving}
            >
              <option value="">Select a provider</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="qwen">Qwen</option>
              <option value="grok">Grok</option>
              <option value="openrouter">OpenRouter</option>
              <option value="mistral">Mistral</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={getProviderPlaceholder()}
              className="api-key-input"
              disabled={isSaving || !currentProvider}
            />
          </div>

          <div className="form-group">
            <label htmlFor="model-name">Default Model Name (Optional)</label>
            <input
              id="model-name"
              type="text"
              value={defaultModelName}
              onChange={(e) => setDefaultModelName(e.target.value)}
              placeholder="e.g., gpt-4o, gemini-1.5-pro-latest"
              className="model-name-input"
              disabled={isSaving || !currentProvider}
            />

            {currentProvider && getRecentModelsForProvider().length > 0 && (
              <div className="recent-models">
                <small className="help-text">Recently used models for {currentProvider}:</small>
                <div className="recent-models-list">
                  {getRecentModelsForProvider().map((model, index) => (
                    <button
                      key={index}
                      type="button"
                      className="recent-model-button"
                      onClick={() => handleSelectRecentModel(model)}
                    >
                      {model}
                      <X
                        size={14}
                        className="delete-recent-model-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecentModel(model);
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="form-group"
            style={{ marginBottom: showAdvanced ? 'var(--space-sm)' : 'var(--space-lg)' }}
          >
            <button
              type="button"
              className="advanced-toggle"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
          </div>

          {showAdvanced && (
            <div className="form-group">
              <label htmlFor="base-url">Base URL (Optional)</label>
              <input
                id="base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Custom API endpoint URL (if needed)"
                className="base-url-input"
                disabled={isSaving || !currentProvider}
              />
              <small className="help-text">
                Only set this if you're using a proxy or non-standard API endpoint.
              </small>
            </div>
          )}

          {onOpenSystemPromptEditor && (
            <div className="form-group system-prompt-section">
              <div className="system-prompt-header">
                <label>System Prompt</label>
                <button
                  type="button"
                  className="edit-system-prompt-button"
                  onClick={onOpenSystemPromptEditor}
                  title="Edit System Prompt"
                >
                  <Edit size={16} />
                  <span>Edit System Prompt</span>
                </button>
              </div>
              <small className="help-text">
                Customize how the AI behaves by editing the system prompt.
              </small>
            </div>
          )}

          {errorMessage && (
            <div
              className={`message ${errorMessage.startsWith('Settings saved') ? 'message-success' : 'error-message'}`}
            >
              {errorMessage}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !currentProvider}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LlmSettingsModal;
