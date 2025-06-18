/**
 * Type for LLM provider
 */
export type LlmProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'mistral'
  | 'ollama';

/**
 * OLD Interface for LLM configuration - Used by existing IPC, to be phased out.
 * The new LlmSettingsModal uses ProviderSpecificConfig and AllLlmConfigs.
 */

/**
 * Configuration for a specific LLM provider (NEW)
 */
export interface ProviderSpecificConfig {
  apiKey: string | null;
  defaultModel?: string | null;
  baseUrl?: string | null;
  // Ollama-specific configurations
  ollamaUrl?: string | null; // For custom Ollama installations
  isLocal?: boolean; // Flag to indicate if this is a local provider
}

/**
 * Object to store configurations for all LLM providers (NEW)
 * The key is the LlmProvider type (string, but maps to LlmProvider)
 */
export interface AllLlmConfigs {
  [provider: string]: ProviderSpecificConfig;
}

/**
 * Role types for chat messages
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Interface for a chat message
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  originalUserQuestion?: string;
  fileContext?: {
    name: string;
    content: string;
    previewContent?: string;
    isVeryLong?: boolean;
    language?: string;
  };
  previewDisplayContent?: string;
  isContentTruncated?: boolean;
  isLoading?: boolean; // For streaming responses
}

/**
 * Interface for chat target (what the chat is about)
 */
export interface ChatTarget {
  type: 'file' | 'selection' | 'general';
  content: string;
  filePath?: string;
  fileName?: string;
}

/**
 * Provider-specific endpoints for fetching models
 */
export interface ProviderEndpoints {
  [key: string]: string;
}

/**
 * Interface for LLM API Window extensions
 */
export interface LlmApiWindow {
  llmApi: {
    getAllConfigs: () => Promise<AllLlmConfigs>;
    setAllConfigs: (configs: AllLlmConfigs) => Promise<{ success: boolean; error?: string }>;
    sendPrompt: (params: {
      messages: { role: MessageRole; content: string }[];
      provider: LlmProvider;
      model: string;
      apiKey?: string;
      baseUrl?: string | null;
      requestId: string;
    }) => Promise<{ content: string; provider?: string; error?: string; cancelled?: boolean }>;
    saveFile: (params: {
      filePath: string;
      content: string;
    }) => Promise<{ success: boolean; message: string }>;
    cancelLlmRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    // Streaming methods
    sendStreamPrompt: (params: {
      messages: { role: MessageRole; content: string }[];
      provider: LlmProvider;
      model: string;
      apiKey?: string;
      baseUrl?: string | null;
      requestId: string;
    }) => void;
    onStreamEvent: (
      event: 'stream-start' | 'stream-chunk' | 'stream-end' | 'stream-error',
      callback: (data: any) => void
    ) => (...args: any[]) => void;
    removeStreamListener: (
      event: 'stream-start' | 'stream-chunk' | 'stream-end' | 'stream-error',
      wrapper: (...args: any[]) => void
    ) => void;
    // Ollama-specific functions
    checkOllamaStatus: (customUrl?: string) => Promise<{
      isInstalled: boolean;
      isRunning: boolean;
      url: string;
      error?: string;
    }>;
    fetchOllamaModels: (ollamaUrl: string) => Promise<any[]>;
    startOllamaService: () => Promise<{
      success: boolean;
      error?: string;
    }>;
  };
}

/**
 * Interface for model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: LlmProvider; // This was present in your original llmTypes.ts
  context_length: number;
  description?: string;
  pricing?: string;
  available?: boolean;
  // Ollama-specific fields
  isLocal?: boolean;
  size?: string; // For Ollama models (e.g., "3.8GB")
  family?: string; // For Ollama models (e.g., "llama", "mistral")
  modified_at?: string; // For Ollama models
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean; // Optional: to identify if it's a non-deletable/non-editable-name default prompt
}
