const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatMistralAI } = require('@langchain/mistralai');
// implement later 
// const { ChatQwen } = require('@langchain/qwen'); // 
// const { ChatGroq } = require('@langchain/groq'); 
// const { ChatGrok } = require('@langchain/xai');
// const { ChatOpenRouter } = require('@langchain/openrouter');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const Store = require('electron-store');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const { Mistral } = require('@mistralai/mistralai');

/**
 * Store instance for persisting LLM configuration
 */
let store;

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
 * Creates and returns the appropriate Langchain chat model based on configuration
 * @returns {Promise<ChatOpenAI|ChatAnthropic|ChatGoogleGenerativeAI|ChatMistralAI>}
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

      case 'mistral': {
        console.log(`[LLM Service] Using Mistral model: ${config.modelName || 'Default model'}`);
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
          return new ChatMistralAI(options);
        } catch (error) {
          console.error(`[LLM Service] Error initializing Mistral:`, error);
          throw new Error(`Failed to initialize Mistral: ${error.message}`);
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

    // Special handling for Mistral API
    if (config.provider === 'mistral') {
      try {
        console.log('[LLM Service] Using direct Mistral API client');
        // Format messages in the format Mistral expects
        const mistralMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Create a Mistral client with the correct initialization
        console.log('[LLM Service] Creating Mistral client');
        const mistralOptions = {
          apiKey: config.apiKey,
        };

        if (config.baseUrl) {
          mistralOptions.endpoint = config.baseUrl;
        }

        const mistral = new Mistral(mistralOptions);

        console.log(
          '[LLM Service] Sending request to Mistral API with model:',
          config.modelName || 'mistral-medium'
        );
        const response = await mistral.chat.completions.create({
          model: config.modelName || 'mistral-medium',
          messages: mistralMessages,
          temperature: 0.7,
          max_tokens: 2048,
        });

        console.log('[LLM Service] Received response from Mistral API');
        return {
          content: response.choices[0].message.content,
          provider: 'mistral',
        };
      } catch (mistralError) {
        console.error('[LLM Service] Mistral direct API error:', mistralError);

        // Handle common Mistral API errors
        const errorMsg = mistralError.message || '';
        if (errorMsg.includes('401')) {
          throw new Error('Mistral API authentication failed. Please check your API key.');
        } else if (errorMsg.includes('429')) {
          throw new Error('Mistral API rate limit exceeded. Please try again later.');
        } else if (errorMsg.includes('400')) {
          throw new Error('Mistral API request error: ' + errorMsg);
        } else if (errorMsg.includes('403')) {
          throw new Error('Mistral API access denied. Please check your permissions.');
        } else if (errorMsg.includes('404')) {
          throw new Error('Mistral API model not found. Please check your model name.');
        } else if (errorMsg.includes('500')) {
          throw new Error('Mistral API server error. Please try again later.');
        }

        // Rethrow with more context
        throw new Error(`Mistral API error: ${mistralError.message}`);
      }
    }

    // Get chat model for other providers
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
        _type: typeof msg._getType === 'function' ? msg._getType() : msg._type || 'unknown',
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
};
