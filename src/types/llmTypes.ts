/**
 * Type for LLM provider
 */
export type LlmProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'qwen'
  | 'grok'
  | 'openrouter'
  | 'mistral';

/**
 * OLD Interface for LLM configuration - Used by existing IPC, to be phased out.
 * The new LlmSettingsModal uses ProviderSpecificConfig and AllLlmConfigs.
 */
export interface LlmConfig {
  provider: LlmProvider | null;
  apiKey: string | null;
  modelName?: string | null;
  baseUrl?: string | null; // For custom endpoints
}

/**
 * Configuration for a specific LLM provider (NEW)
 */
export interface ProviderSpecificConfig {
  apiKey: string | null;
  defaultModel?: string | null;
  baseUrl?: string | null;
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
    getConfig: () => Promise<LlmConfig>; // Still uses old LlmConfig for now due to existing IPC
    setConfig: (config: LlmConfig) => Promise<{ success: boolean; error?: string }>; // Still uses old LlmConfig
    sendPrompt: (params: {
      messages: { role: MessageRole; content: string }[];
      // Backend will also need provider, model, apiKey, baseUrl for the new flow
      provider: LlmProvider;
      model: string;
      apiKey: string;
      baseUrl?: string | null;
    }) => Promise<{ content: string; provider?: string; error?: string }>;
    saveFile: (params: {
      filePath: string;
      content: string;
    }) => Promise<{ success: boolean; message: string }>;
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
}
