/**
 * Type for LLM provider
 */
export type LlmProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'deepseek'
  | 'qwen'
  | 'grok'
  | 'openrouter';

/**
 * Interface for LLM configuration
 */
export interface LlmConfig {
  provider: LlmProvider | null;
  apiKey: string | null;
  modelName?: string | null;
  baseUrl?: string | null; // For custom endpoints
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
    getConfig: () => Promise<LlmConfig>;
    setConfig: (config: LlmConfig) => Promise<{ success: boolean; error?: string }>;
    sendPrompt: (params: {
      messages: { role: MessageRole; content: string }[];
    }) => Promise<{ content: string; provider?: string; error?: string }>;
    saveFile: (params: {
      filePath: string;
      content: string;
    }) => Promise<{ success: boolean; message: string }>;
    fetchModels: (
      provider: LlmProvider,
      apiKey: string
    ) => Promise<{
      models: ModelInfo[];
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
  provider: LlmProvider;
  context_length: number;
  description?: string;
  pricing?: string;
  available?: boolean;
}
