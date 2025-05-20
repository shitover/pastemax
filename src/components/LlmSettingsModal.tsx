import React, { useState, useEffect, useCallback } from 'react';
import { LlmConfig, LlmProvider, ModelInfo } from '../types/llmTypes';

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
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Populate form from initialConfig
  useEffect(() => {
    if (initialConfig) {
      setProvider(initialConfig.provider || '');
      setApiKey(initialConfig.apiKey || '');
      setModelName(initialConfig.modelName || '');
      setBaseUrl(initialConfig.baseUrl || '');

      // If we have a provider and API key, fetch models
      if (initialConfig.provider && initialConfig.apiKey) {
        fetchModels(
          initialConfig.provider,
          initialConfig.apiKey,
          initialConfig.baseUrl || undefined
        );
      }
    }
  }, [initialConfig, isOpen]);

  // Reset form state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setModels([]);
      setIsLoadingModels(false);
    }
  }, [isOpen]);

  // Fetch models for the selected provider
  const fetchModels = useCallback(
    async (providerValue: LlmProvider, apiKeyValue: string, baseUrlValue?: string) => {
      if (!providerValue || !apiKeyValue) return;

      setIsLoadingModels(true);
      setErrorMessage(null);

      try {
        const result = await window.llmApi.fetchModels(
          providerValue,
          apiKeyValue,
          baseUrlValue || undefined
        );

        if (result.error) {
          setErrorMessage(`Error fetching models: ${result.error}`);
          setModels([]);
        } else {
          setModels(result.models || []);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setErrorMessage(
          `Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    },
    []
  );

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as LlmProvider | '';
    setProvider(value);
    setModelName(''); // Reset model selection
    setModels([]); // Clear models list

    // If API key is already set, fetch models for the new provider
    if (apiKey && value) {
      fetchModels(value, apiKey, baseUrl || undefined);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);

    // If provider is set and API key is not empty, fetch models
    if (provider && newApiKey.length > 5) {
      fetchModels(provider, newApiKey, baseUrl || undefined);
    }
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBaseUrl = e.target.value;
    setBaseUrl(newBaseUrl);

    // If provider and API key are set, fetch models with the new base URL
    if (provider && apiKey) {
      fetchModels(provider, apiKey, newBaseUrl || undefined);
    }
  };

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
      default:
        return 'API Key';
    }
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

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSaveConfig({
        provider,
        apiKey,
        modelName: modelName.trim() || null,
        baseUrl: baseUrl.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error('Error saving LLM config:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Format context length for display
  const formatContextLength = (tokens: number): string => {
    if (!tokens) return 'unknown';

    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }

    if (tokens >= 1000) {
      return `${Math.round(tokens / 1000)}K`;
    }

    return tokens.toString();
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
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
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
                onChange={handleBaseUrlChange}
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
            <label htmlFor="model-name">Model</label>

            {isLoadingModels ? (
              <div className="models-loading">Loading models...</div>
            ) : models.length > 0 ? (
              <select
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="model-select"
                disabled={isSaving || !provider || isLoadingModels}
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatContextLength(model.context_length)} context)
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="model-name"
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Enter model name"
                className="model-name-input"
                disabled={isSaving || !provider}
              />
            )}

            <small className="help-text">
              {models.length > 0
                ? `${models.length} models available. Select one from the list.`
                : 'Enter the model name manually or provide a valid API key to see available models.'}
            </small>
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
            disabled={isSaving || !provider || !apiKey}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LlmSettingsModal;
