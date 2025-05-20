const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const Store = require('electron-store');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const fetch = require('node-fetch');

/**
 * Store instance for persisting LLM configuration
 */
let store;

/**
 * Provider-specific API endpoints for fetching models
 */
const PROVIDER_MODEL_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/models',
  anthropic: 'https://api.anthropic.com/v1/models',
  gemini: 'https://generativelanguage.googleapis.com/v1/models',
  groq: 'https://api.groq.com/v1/models',
  deepseek: 'https://api.deepseek.com/v1/models',
  qwen: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
};

/**
 * Provider-specific headers for API requests
 */
function getProviderHeaders(provider, apiKey) {
  switch (provider) {
    case 'openai':
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    case 'anthropic':
      return {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      };
    case 'gemini':
      return {
        'Content-Type': 'application/json',
      };
    case 'groq':
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    case 'deepseek':
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    case 'qwen':
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    case 'openrouter':
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    default:
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
  }
}

/**
 * Generates a secure encryption key based on a combination of environment variables
 * and machine-specific information
 * @returns {string} A secure encryption key
 */
function generateSecureKey() {
  // Try to use environment variable if available
  const envKey = process.env.PASTEMAX_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 16) {
    return envKey;
  }

  // Otherwise generate a key based on machine-specific information
  // This ensures the key is unique per device but consistent across app restarts
  const machineId = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    os.userInfo().username,
    // Add app-specific salt
    'pastemax-llm-config-salt',
  ].join('-');

  // Create a SHA-256 hash of the machine ID
  return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32);
}

/**
 * Initializes the electron-store for LLM configuration
 */
function initializeStore() {
  if (!store) {
    try {
      const encryptionKey = generateSecureKey();

      // Create a new store instance with error handling
      store = new Store({
        name: 'pastemax-llm-config',
        encryptionKey,
        // Optional: add schema validation
        schema: {
          llmConfig: {
            type: 'object',
            properties: {
              provider: { type: ['string', 'null'] },
              apiKey: { type: ['string', 'null'] },
              modelName: { type: ['string', 'null'] },
              baseUrl: { type: ['string', 'null'] },
            },
          },
        },
        // Add clearInvalidConfig option to handle corrupted data
        clearInvalidConfig: true,
      });

      console.log('LLM configuration store initialized with secure encryption');
    } catch (error) {
      console.error('Error initializing LLM configuration store:', error);

      // If there's an error, attempt to recover by creating a store with no encryption
      // and no pre-existing data (will reset user settings but allow the app to work)
      try {
        // Attempt to delete potentially corrupted file - this is a fallback safety measure
        const fs = require('fs');
        const path = require('path');
        const electron = require('electron');

        // Try to locate and remove the config file
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        const storePath = path.join(userDataPath, 'pastemax-llm-config.json');

        if (fs.existsSync(storePath)) {
          console.log('Removing corrupted config file:', storePath);
          fs.unlinkSync(storePath);
        }

        // Create a new store with default values and no encryption
        store = new Store({
          name: 'pastemax-llm-config-new',
          defaults: {
            llmConfig: {
              provider: null,
              apiKey: null,
              modelName: null,
              baseUrl: null,
            },
          },
        });

        console.log('Created fallback LLM configuration store without encryption');
      } catch (fallbackError) {
        console.error('Failed to create fallback store:', fallbackError);
        // Last resort - in-memory store that won't persist
        store = {
          get: () => ({ provider: null, apiKey: null, modelName: null, baseUrl: null }),
          set: () => {},
        };
        console.log('Using in-memory (non-persistent) store as last resort');
      }
    }
  }
}

/**
 * Retrieves the stored LLM configuration
 * @returns {Promise<{provider: string|null, apiKey: string|null, modelName: string|null, baseUrl: string|null}>}
 */
async function getLlmConfig() {
  initializeStore();
  return store.get('llmConfig', { provider: null, apiKey: null, modelName: null, baseUrl: null });
}

/**
 * Saves the LLM configuration
 * @param {Object} config - The LLM configuration
 * @param {string} config.provider - The LLM provider
 * @param {string} config.apiKey - The API key for the provider
 * @param {string} config.modelName - The model name to use
 * @param {string} config.baseUrl - Optional base URL for the API
 * @returns {Promise<void>}
 */
async function setLlmConfig({ provider, apiKey, modelName, baseUrl }) {
  initializeStore();
  store.set('llmConfig', { provider, apiKey, modelName, baseUrl });
}

/**
 * Fetches available models from the specified provider
 * @param {string} provider - The LLM provider
 * @param {string} apiKey - The API key
 * @param {string} baseUrl - Optional base URL override
 * @returns {Promise<{models: Array, error?: string}>}
 */
async function fetchModelsFromProvider(provider, apiKey, baseUrl = null) {
  try {
    console.log(`[LLM Service] Fetching models from ${provider}...`);

    if (!provider || !apiKey) {
      return {
        models: [],
        error: 'Provider and API key are required',
      };
    }

    let url = baseUrl || PROVIDER_MODEL_ENDPOINTS[provider] || PROVIDER_MODEL_ENDPOINTS.openrouter;
    let headers = getProviderHeaders(provider, apiKey);
    let models = [];

    // Add API key as query parameter for Gemini
    if (provider === 'gemini') {
      url = `${url}?key=${apiKey}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[LLM Service] Error fetching models from ${provider}: ${response.status} ${response.statusText}`
      );
      console.error(`[LLM Service] Error details: ${errorText}`);
      return {
        models: [],
        error: `Failed to fetch models: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Handle provider-specific response formats
    switch (provider) {
      case 'openai':
        if (data.data && Array.isArray(data.data)) {
          models = data.data
            .filter((model) => model.id.includes('gpt'))
            .map((model) => ({
              id: model.id,
              name: model.id,
              provider: 'openai',
              context_length: getContextLengthForModel(model.id, 'openai'),
              description: `OpenAI ${model.id}`,
              available: true,
            }));
        }
        break;

      case 'anthropic':
        if (data.models && Array.isArray(data.models)) {
          models = data.models.map((model) => ({
            id: model.id,
            name: model.id,
            provider: 'anthropic',
            context_length: model.context_window || getContextLengthForModel(model.id, 'anthropic'),
            description: `Anthropic ${model.id}`,
            available: true,
          }));
        }
        break;

      case 'gemini':
        if (data.models && Array.isArray(data.models)) {
          models = data.models
            .filter((model) => model.name.includes('gemini'))
            .map((model) => {
              const modelId = model.name.split('/').pop();
              return {
                id: modelId,
                name: modelId,
                provider: 'gemini',
                context_length: getContextLengthForModel(modelId, 'gemini'),
                description: model.description || `Google ${modelId}`,
                available: model.state === 'ACTIVE',
              };
            });
        }
        break;

      case 'groq':
        if (data.data && Array.isArray(data.data)) {
          models = data.data.map((model) => ({
            id: model.id,
            name: model.id,
            provider: 'groq',
            context_length: getContextLengthForModel(model.id, 'groq'),
            description: `Groq ${model.id}`,
            available: true,
          }));
        }
        break;

      case 'openrouter':
        if (data.data && Array.isArray(data.data)) {
          models = data.data.map((model) => ({
            id: model.id,
            name: model.name || model.id,
            provider: 'openrouter',
            context_length: model.context_length || 4096,
            description: model.description || '',
            pricing: model.pricing || '',
            available: model.available !== false,
          }));
        }
        break;

      default:
        // Generic handling for other providers
        if (data.data && Array.isArray(data.data)) {
          models = data.data.map((model) => ({
            id: model.id || model.name,
            name: model.name || model.id,
            provider,
            context_length: model.context_length || 4096,
            description: model.description || '',
            available: true,
          }));
        } else if (data.models && Array.isArray(data.models)) {
          models = data.models.map((model) => ({
            id: model.id || model.name,
            name: model.name || model.id,
            provider,
            context_length: model.context_length || 4096,
            description: model.description || '',
            available: true,
          }));
        }
    }

    console.log(`[LLM Service] Successfully fetched ${models.length} models from ${provider}`);
    return { models };
  } catch (error) {
    console.error(`[LLM Service] Error fetching models from ${provider}:`, error);
    return {
      models: [],
      error: `Error fetching models: ${error.message}`,
    };
  }
}

/**
 * Get estimated context length for known models when not provided by the API
 * @param {string} modelId - The model ID
 * @param {string} provider - The provider
 * @returns {number} - Estimated context length
 */
function getContextLengthForModel(modelId, provider) {
  const knownModels = {
    // OpenAI models
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,

    // Anthropic models
    'claude-3-opus': 200000,
    'claude-3-sonnet': 180000,
    'claude-3-haiku': 150000,
    'claude-2': 100000,
    'claude-instant': 100000,

    // Gemini models
    'gemini-pro': 32768,
    'gemini-pro-vision': 16384,
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,

    // Groq models
    'llama2-70b': 4096,
    'mixtral-8x7b': 32768,
    'gemma-7b': 8192,
  };

  // Check for exact matches
  if (knownModels[modelId]) {
    return knownModels[modelId];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(knownModels)) {
    if (modelId.includes(key)) {
      return value;
    }
  }

  // Default values by provider
  const defaultContextLengths = {
    openai: 4096,
    anthropic: 100000,
    gemini: 32768,
    groq: 32768,
    deepseek: 4096,
    qwen: 8192,
    grok: 4096,
    openrouter: 4096,
  };

  return defaultContextLengths[provider] || 4096;
}

/**
 * Creates and returns the appropriate Langchain chat model based on configuration
 * @returns {Promise<ChatOpenAI|ChatAnthropic|ChatGoogleGenerativeAI>}
 */
async function getChatModel() {
  initializeStore();
  const config = await getLlmConfig();

  if (!config.provider || !config.apiKey) {
    throw new Error('LLM provider or API key not configured.');
  }

  // Log provider without showing API key
  console.log(`[LLM Service] Creating chat model for provider: ${config.provider}`);

  try {
    switch (config.provider) {
      case 'openai': {
        console.log(`[LLM Service] Using OpenAI model: ${config.modelName || 'Default model'}`);
        const options = {
          apiKey: config.apiKey,
          temperature: 0.7,
        };

        if (config.modelName) {
          options.modelName = config.modelName;
        }

        if (config.baseUrl) {
          options.baseURL = config.baseUrl;
        }

        return new ChatOpenAI(options);
      }

      case 'anthropic': {
        console.log(`[LLM Service] Using Anthropic model: ${config.modelName || 'Default model'}`);
        const options = {
          apiKey: config.apiKey,
          temperature: 0.7,
        };

        if (config.modelName) {
          options.modelName = config.modelName;
        }

        if (config.baseUrl) {
          options.baseURL = config.baseUrl;
        }

        try {
          return new ChatAnthropic(options);
        } catch (error) {
          console.error(`[LLM Service] Error initializing Anthropic:`, error);
          throw new Error(`Failed to initialize Anthropic: ${error.message}`);
        }
      }

      case 'gemini': {
        console.log(
          `[LLM Service] Using Google Gemini model: ${config.modelName || 'Default model'}`
        );

        const options = {
          apiKey: config.apiKey,
          maxOutputTokens: 2048,
          temperature: 0.7,
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        };

        if (config.modelName) {
          options.modelName = config.modelName;
        }

        try {
          return new ChatGoogleGenerativeAI(options);
        } catch (error) {
          console.error(`[LLM Service] Error initializing Gemini:`, error);

          // Special handling for common Gemini errors
          const errorMsg = error.message || '';
          if (errorMsg.includes('PERMISSION_DENIED')) {
            throw new Error(
              'Gemini API access denied. Please check if your API key is valid and you have accepted the terms of service in Google AI Studio.'
            );
          } else if (errorMsg.includes('API_KEY_INVALID')) {
            throw new Error('Invalid Gemini API key. Please verify your API key.');
          }

          throw new Error(`Failed to initialize Gemini: ${error.message}`);
        }
      }

      case 'openrouter': {
        console.log(`[LLM Service] Using OpenRouter model: ${config.modelName || 'Default model'}`);

        // For OpenRouter, we'll implement a custom solution that doesn't rely on Langchain's validation
        return {
          _type: 'openrouter',
          _apiKey: config.apiKey,
          _modelName: config.modelName || 'openai/gpt-3.5-turbo',
          _baseUrl: 'https://openrouter.ai/api/v1',

          // Custom invoke method to bypass Langchain restrictions
          invoke: async function (messages) {
            try {
              const fetch = require('node-fetch');

              console.log(`[LLM Service] Using OpenRouter with model: ${this._modelName}`);

              // Convert Langchain messages to OpenRouter format
              const openRouterMessages = messages.map((msg) => ({
                role: msg._getType ? msg._getType() : msg.type,
                content: msg.content,
              }));

              // Prepare request body
              const requestBody = {
                model: this._modelName,
                messages: openRouterMessages,
                temperature: 0.7,
                max_tokens: 2048,
              };

              // Log request (without API key)
              console.log('[LLM Service] OpenRouter request:', {
                model: requestBody.model,
                messageCount: requestBody.messages.length,
                // Don't log full messages for privacy
              });

              // Send request to OpenRouter API
              const response = await fetch(`${this._baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this._apiKey}`,
                  'HTTP-Referer': 'https://github.com/kleneway/pastemax',
                  'X-Title': 'PasteMax',
                },
                body: JSON.stringify(requestBody),
              });

              // Check if request was successful
              if (!response.ok) {
                const errorText = await response.text();
                console.error(
                  `[LLM Service] OpenRouter API error (${response.status}):`,
                  errorText
                );
                throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
              }

              // Parse response
              const data = await response.json();

              // Log success (without revealing full content)
              console.log('[LLM Service] OpenRouter response received successfully');

              // Format response to match Langchain's expected format
              return { content: data.choices[0].message.content };
            } catch (error) {
              console.error('[LLM Service] Error in custom OpenRouter implementation:', error);
              throw new Error(`OpenRouter API error: ${error.message}`);
            }
          },
        };
      }

      // For other providers, we'll use OpenAI's client with a custom base URL if needed
      default: {
        console.log(
          `[LLM Service] Using ${config.provider} model with OpenAI client: ${config.modelName || 'Default model'}`
        );
        const options = {
          apiKey: config.apiKey,
          temperature: 0.7,
          defaultHeaders: {
            'HTTP-Referer': 'https://github.com/kleneway/pastemax',
            'X-Title': 'PasteMax',
          },
        };

        if (config.modelName) {
          options.modelName = config.modelName;
        }

        if (config.baseUrl) {
          options.baseURL = config.baseUrl;
        } else if (PROVIDER_MODEL_ENDPOINTS[config.provider]) {
          // Extract base URL from the endpoints object - strip the "/models" part
          const endpointUrl = PROVIDER_MODEL_ENDPOINTS[config.provider];
          const baseUrl = endpointUrl.substring(0, endpointUrl.lastIndexOf('/'));
          options.baseURL = baseUrl;
        }

        return new ChatOpenAI(options);
      }
    }
  } catch (error) {
    console.error(`[LLM Service] Error creating chat model for ${config.provider}:`, error);
    throw new Error(`Failed to initialize LLM provider: ${error.message}`);
  }
}

/**
 * Converts message objects to Langchain message instances
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of Langchain message instances
 */
function convertToLangchainMessages(messages) {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content);
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
      default:
        throw new Error(`Unsupported message role: ${msg.role}`);
    }
  });
}

/**
 * Sends a prompt to the configured LLM
 * @param {Object} params - Parameters for the prompt
 * @param {Array} params.messages - Array of message objects with role and content
 * @returns {Promise<{content: string}>}
 */
async function sendPromptToLlm({ messages }) {
  try {
    console.log('[LLM Service] Preparing to send prompt to LLM');
    const config = await getLlmConfig();

    // Enhanced validation
    if (!config.provider) {
      throw new Error('LLM provider not configured');
    }

    if (!config.apiKey) {
      throw new Error('API key not configured');
    }

    console.log(`[LLM Service] Using provider: ${config.provider}`);
    console.log(`[LLM Service] Using model: ${config.modelName || 'default'}`);

    // Get chat model
    const chatModel = await getChatModel();
    console.log('[LLM Service] Chat model initialized');

    // Check if this is our custom OpenRouter implementation
    if (chatModel._type === 'openrouter') {
      console.log('[LLM Service] Using custom OpenRouter implementation');
      const langchainMessages = convertToLangchainMessages(messages);
      return await chatModel.invoke(langchainMessages);
    }

    // Standard Langchain path for other providers
    // Convert messages to Langchain format
    const langchainMessages = convertToLangchainMessages(messages);
    console.log(`[LLM Service] Converted ${langchainMessages.length} messages to Langchain format`);

    // Log message structure (without actual content for privacy)
    console.log(
      '[LLM Service] Message structure:',
      langchainMessages.map((msg) => ({
        type: msg.constructor.name,
        _type: msg._getType && msg._getType(),
        contentLength: msg.content?.length || 0,
      }))
    );

    // Provider-specific handling
    let response;
    try {
      console.log('[LLM Service] Invoking chat model');
      response = await chatModel.invoke(langchainMessages);
      console.log('[LLM Service] Received response from LLM');
    } catch (invokeError) {
      console.error('[LLM Service] Error invoking chat model:', invokeError);

      // Add provider-specific error handling
      if (config.provider === 'gemini') {
        // Check for common Gemini API errors
        const errorMsg = invokeError.message || '';
        if (errorMsg.includes('PERMISSION_DENIED')) {
          throw new Error(
            'Gemini API access denied. Please check if your API key is valid and you have accepted the terms of service in Google AI Studio.'
          );
        } else if (errorMsg.includes('INVALID_ARGUMENT')) {
          throw new Error(
            'Invalid request to Gemini API. This could be due to prompt content restrictions or invalid format.'
          );
        } else if (errorMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('Gemini API quota exceeded. Please check your usage limits.');
        } else if (errorMsg.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API key. Please verify your API key.');
        }
      }

      // Re-throw with more context
      throw new Error(`Failed to get response: ${invokeError.message}`);
    }

    // Validate response
    if (!response || !response.content) {
      throw new Error('Received empty response from LLM');
    }

    console.log(`[LLM Service] Response received, length: ${response.content.length} characters`);

    return {
      content: response.content,
      provider: config.provider,
    };
  } catch (error) {
    console.error('[LLM Service] Error in sendPromptToLlm:', error);
    // Return a structured error that's more helpful for users
    return {
      error: `Failed to get response from LLM: ${error.message}`,
      errorDetails: error.stack,
      provider: (await getLlmConfig()).provider,
    };
  }
}

/**
 * Saves content to a file
 * @param {Object} params - Parameters for saving
 * @param {string} params.filePath - Path to the file
 * @param {string} params.content - Content to save
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function saveContentToFile({ filePath, content }) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return {
      success: true,
      message: `Content saved to ${filePath}`,
    };
  } catch (error) {
    console.error('Error saving file:', error);
    return {
      success: false,
      message: `Failed to save file: ${error.message}`,
    };
  }
}

module.exports = {
  initializeStore,
  getLlmConfig,
  setLlmConfig,
  sendPromptToLlm,
  saveContentToFile,
  fetchModelsFromProvider,
};
