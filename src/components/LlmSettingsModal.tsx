import React, { useState, useEffect } from 'react';
import { LlmConfig, LlmProvider } from '../types/llmTypes';

interface LlmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: LlmConfig | null;
  onSaveConfig: (config: LlmConfig) => Promise<void>;
}

const LlmSettingsModal: React.FC<LlmSettingsModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  onSaveConfig,
}) => {
  const [provider, setProvider] = useState<LlmProvider | ''>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [recentModels, setRecentModels] = useState<{ [key: string]: string[] }>({});

  // Load user's recent models from localStorage
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

  // Populate form from initialConfig
  useEffect(() => {
    if (initialConfig) {
      setProvider(initialConfig.provider || '');
      setApiKey(initialConfig.apiKey || '');
      setModelName(initialConfig.modelName || '');
      setBaseUrl(initialConfig.baseUrl || '');
    }
  }, [initialConfig, isOpen]);

  // Reset form state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  const getProviderPlaceholder = () => {
    switch (provider) {
      case 'openai':
        return 'Enter OpenAI API Key (sk-...)';
      case 'anthropic':
        return 'Enter Anthropic API Key';
      case 'gemini':
        return 'Enter Google AI API Key';
      case 'groq':
        return 'Enter Groq API Key';
      case 'deepseek':
        return 'Enter DeepSeek API Key';
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


  // Get recent models for the selected provider
  const getRecentModelsForProvider = () => {
    return recentModels[provider] || [];
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as LlmProvider | '';
    setProvider(value);

    // Clear model name when changing provider
    setModelName('');
  };

  const handleSave = async () => {
    if (!provider) {
      setErrorMessage('Please select a provider');
      return;
    }

    if (!apiKey) {
      setErrorMessage('Please enter an API key');
      return;
    }

    if (!modelName) {
      setErrorMessage('Please enter a model name');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const config: LlmConfig = {
        provider,
        apiKey,
        modelName: modelName.trim(),
        baseUrl: baseUrl.trim() || null,
      };

      await onSaveConfig(config);

      // Save this model to recent models for this provider
      const updatedRecentModels = { ...recentModels };
      const providerModels = updatedRecentModels[provider] || [];

      // Only add if it's not already in the list
      if (!providerModels.includes(modelName)) {
        // Add to the beginning of the array, limit to 5 recent models
        updatedRecentModels[provider] = [modelName, ...providerModels].slice(0, 5);
        setRecentModels(updatedRecentModels);
        localStorage.setItem('pastemax-recent-models', JSON.stringify(updatedRecentModels));
      }

      onClose();
    } catch (error) {
      console.error('Error saving LLM config:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle selecting a recent model
  const handleSelectRecentModel = (model: string) => {
    setModelName(model);
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
              value={provider}
              onChange={handleProviderChange}
              className="provider-select"
              disabled={isSaving}
            >
              <option value="">Select a provider</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="deepseek">DeepSeek</option>
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
              disabled={isSaving || !provider}
            />
          </div>

          {/* Minimal advanced options toggle */}
          <div className="form-group" style={{ marginBottom: showAdvanced ? 0 : 18 }}>
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
              <label htmlFor="base-url">
                Base URL <span className="optional">(Optional)</span>
              </label>
              <input
                id="base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Custom API endpoint URL"
                className="base-url-input"
                disabled={isSaving || !provider}
              />
              <small className="help-text">
                Only set this if you're using a custom API endpoint or proxy.
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="model-name">Model Name</label>
            <input
              id="model-name"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="model-name-input"
              disabled={isSaving || !provider}
            />

            {provider && getRecentModelsForProvider().length > 0 && (
              <div className="recent-models">
                <small className="help-text">Recently used models:</small>
                <div className="recent-models-list">
                  {getRecentModelsForProvider().map((model, index) => (
                    <button
                      key={index}
                      type="button"
                      className="recent-model-button"
                      onClick={() => handleSelectRecentModel(model)}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !provider || !apiKey || !modelName}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LlmSettingsModal;
