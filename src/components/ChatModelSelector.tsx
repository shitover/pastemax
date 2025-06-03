import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModelInfo } from '../types/ModelTypes';
import '../styles/modals/ChatModelSelector.css';

interface ChatModelSelectorProps {
  onModelSelect?: (modelId: string) => void;
  currentModelId?: string;
}

const ChatModelSelector: React.FC<ChatModelSelectorProps> = ({ onModelSelect, currentModelId }) => {
  const [recentModels, setRecentModels] = useState<{ [provider: string]: string[] }>({});
  const [flattenedRecentModels, setFlattenedRecentModels] = useState<ModelInfo[]>([]);
  const [fetchedModels, setFetchedModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isLoadingRecents, setIsLoadingRecents] = useState(true);
  const [loadRecentsError, setLoadRecentsError] = useState<string | null>(null);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [fetchRemoteError, setFetchRemoteError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentProvider = (modelId: string | undefined): string | null => {
    if (!modelId || !modelId.includes('/')) return null;
    return modelId.split('/')[0];
  };

  const currentProviderName = useMemo(() => getCurrentProvider(selectedModelId), [selectedModelId]);

  // Load recently used models from localStorage
  useEffect(() => {
    setIsLoadingRecents(true);
    try {
      const savedModels = localStorage.getItem('pastemax-recent-models');
      if (savedModels) {
        const parsedModels = JSON.parse(savedModels) as { [provider: string]: string[] | string };
        setRecentModels(parsedModels as { [provider: string]: string[] });

        const recents: ModelInfo[] = [];
        Object.entries(parsedModels).forEach(([provider, modelNamesValue]) => {
          let modelNameArray: string[] = [];
          if (Array.isArray(modelNamesValue)) modelNameArray = modelNamesValue;
          else if (typeof modelNamesValue === 'string') modelNameArray = [modelNamesValue];
          else return;

          modelNameArray.forEach((modelName: string) => {
            if (provider && modelName && typeof modelName === 'string') {
              recents.push({
                id: `${provider}/${modelName}`,
                name: modelName,
                provider, // Keep provider info consistent
                context_length: 0, // Default
              });
            }
          });
        });
        setFlattenedRecentModels(recents);

        if (currentModelId && recents.some((model) => model.id === currentModelId)) {
          setSelectedModelId(currentModelId);
        } else if (recents.length > 0 && !selectedModelId) {
           // Only set if selectedModelId isn't already set (e.g. by currentModelId prop)
          setSelectedModelId(recents[0].id);
        }
      }
      setIsLoadingRecents(false);
    } catch (err) {
      console.error('Error loading recent models:', err);
      const loadError = err instanceof Error ? err.message : String(err);
      setLoadRecentsError(`Failed to load recent models: ${loadError}`);
      setIsLoadingRecents(false);
    }
  }, []); // Load recents only once on mount

useEffect(() => {
    // This effect ensures that if currentModelId is provided and valid,
    // it becomes the selectedModelId.
    // It also handles the case where currentModelId might not be in flattenedRecentModels initially.
    if (currentModelId) {
        const existsInRecents = flattenedRecentModels.some(m => m.id === currentModelId);
        const existsInFetched = fetchedModels.some(m => m.id === currentModelId);
        if (existsInRecents || existsInFetched) {
            setSelectedModelId(currentModelId);
        } else if (!selectedModelId && flattenedRecentModels.length > 0) {
            // If currentModelId is not in any list yet, and nothing is selected,
            // and we have recents, select the first recent.
            // This handles initial load where currentModelId might be from a previous session
            // but not yet in the combined list that will soon include fetchedModels.
            setSelectedModelId(flattenedRecentModels[0].id);
        } else if (!selectedModelId && fetchedModels.length > 0) {
            setSelectedModelId(fetchedModels[0].id);
        }
        // If no models at all, selectedModelId remains empty or whatever it was.
    } else if (!selectedModelId && flattenedRecentModels.length > 0) {
        // If no currentModelId prop, and nothing selected, pick first recent
        setSelectedModelId(flattenedRecentModels[0].id);
    }
}, [currentModelId, flattenedRecentModels, fetchedModels]);


  // Sync with external model ID if provided, but give preference to already set selectedModelId
  // if currentModelId becomes null or undefined later.
  useEffect(() => {
    if (currentModelId && currentModelId !== selectedModelId) {
      setSelectedModelId(currentModelId);
    }
    // If currentModelId is not provided (e.g. undefined) and we have some models,
    // ensure something is selected.
    // This handles the case where an external currentModelId is removed.
    else if (!currentModelId && !selectedModelId && combinedModels.length > 0) {
        setSelectedModelId(combinedModels[0].id);
    }
  }, [currentModelId, selectedModelId, combinedModels]); // combinedModels added

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    if (onModelSelect) {
      onModelSelect(modelId);
    }
    setFetchRemoteError(null); // Clear fetch error on new selection
    setFetchedModels([]); // Clear fetched models when user manually selects one from recents primarily
    setIsOpen(false);
  };

  const handleFetchRemoteModels = async () => {
    if (!currentProviderName) {
      setFetchRemoteError("Cannot determine provider from selected model.");
      return;
    }
    setIsFetchingRemote(true);
    setFetchRemoteError(null);
    try {
      console.log(`[ChatModelSelector] Fetching models for provider: ${currentProviderName}`);
      const result = await window.electron.ipcRenderer.invoke('llm:fetch-provider-models', currentProviderName);
      console.log('[ChatModelSelector] Fetched models result:', result);

      if (result.error) {
        setFetchRemoteError(result.error);
        setFetchedModels([]);
      } else if (result.message && result.models.length === 0) {
        setFetchRemoteError(result.message); // Informative message like "manual entry needed"
        setFetchedModels([]);
      } else {
        setFetchedModels(result.models || []);
         // If a model was already selected, and it's NOT in the newly fetched list,
         // AND the fetched list is not empty, select the first fetched model.
        const currentSelectedStillValid = result.models?.some(m => m.id === selectedModelId);
        if(!currentSelectedStillValid && result.models && result.models.length > 0 && selectedModelId.startsWith(currentProviderName +"/")) {
            handleModelSelect(result.models[0].id)
        } else if (!selectedModelId && result.models && result.models.length > 0) {
            // If nothing was selected at all, select the first fetched model
            handleModelSelect(result.models[0].id);
        }

      }
    } catch (err) {
      console.error('Error invoking llm:fetch-provider-models:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFetchRemoteError(`Failed to fetch models: ${errorMsg}`);
      setFetchedModels([]);
    }
    setIsFetchingRemote(false);
  };

  const combinedModels = useMemo(() => {
    const modelMap = new Map<string, ModelInfo>();
    // Add recent models first
    flattenedRecentModels.forEach(model => modelMap.set(model.id, model));
    // Add fetched models, potentially overwriting recents if IDs match (fetched are newer)
    // However, for this version, let's ensure fetched models that are also recent use the recent entry's name
    // if fetched name is just the ID.
     fetchedModels.forEach(model => {
        if (modelMap.has(model.id)) {
            // If fetched model is also in recents, ensure we use a good display name
            const recentModel = modelMap.get(model.id);
            if (recentModel && model.name === model.id.substring(model.provider.length + 1) && recentModel.name !== model.name) {
                 // If fetched name is just the model ID part, and recent name is different (potentially better), use recent name
                modelMap.set(model.id, { ...model, name: recentModel.name });
            } else {
                modelMap.set(model.id, model);
            }
        } else {
            modelMap.set(model.id, model);
        }
    });
    return Array.from(modelMap.values());
  }, [flattenedRecentModels, fetchedModels]);

  const selectedModel = combinedModels.find((model) => model.id === selectedModelId);

  const sortedModels = useMemo(() => {
    return [...combinedModels].sort((a, b) => {
      if (a.id === selectedModelId) return -1;
      if (b.id === selectedModelId) return 1;
      // Optional: Alphabetical sort for the rest
      return a.name.localeCompare(b.name);
    });
  }, [combinedModels, selectedModelId]);

  return (
    <div className="chat-model-selector" ref={dropdownRef}>
      <button
        className="chat-model-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title={selectedModel ? `Selected model: ${selectedModel.name}` : "Select AI model"}
      >
        {isLoadingRecents && !selectedModelId ? (
          <span>Loading...</span>
        ) : selectedModel ? (
          <span className="selected-model-name-display">{selectedModel.name}</span>
        ) : (
          <span>Select model</span>
        )}
        <span className="chat-model-dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="chat-model-dropdown">
          <div className="chat-model-list">
            {isLoadingRecents ? (
              <div className="chat-model-loading">Loading recent models...</div>
            ) : sortedModels.length > 0 ? (
              sortedModels.map((model) => (
                <div
                  key={model.id}
                  className={`chat-model-option ${model.id === selectedModelId ? 'selected' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                  title={model.id}
                >
                  <div className="chat-model-name">{model.name}</div>
                  {/* Optionally, show provider if not obvious from name or context */}
                  {/* <div className="chat-model-provider-tag">{model.id.split('/')[0]}</div> */}
                </div>
              ))
            ) : (
              <div className="chat-model-error">
                {loadRecentsError || 'No models available. Try fetching or check settings.'}
              </div>
            )}
             {isFetchingRemote && <div className="chat-model-loading">Fetching models...</div>}
             {fetchRemoteError && <div className="chat-model-error fetch-error">{fetchRemoteError}</div>}
          </div>
          <button
            className="refresh-models-button"
            onClick={handleFetchRemoteModels}
            disabled={isFetchingRemote || !currentProviderName}
            title={currentProviderName ? `Refresh models for ${currentProviderName}`: "Select a model to determine provider"}
          >
            {isFetchingRemote ? 'Fetching...' : `Refresh models for ${currentProviderName || 'selected provider'}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatModelSelector;
