const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatMistralAI } = require('@langchain/mistralai');
const { ChatGroq } = require('@langchain/groq');
// implement later
// const { ChatQwen } = require('@langchain/qwen'); //
// const { ChatGrok } = require('@langchain/xai');
// const { ChatOpenRouter } = require('@langchain/openrouter');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const Store = require('electron-store');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

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
        name: 'pastemax-llm-configs',
        encryptionKey,
        schema: {
          allLlmConfigs: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                apiKey: { type: ['string', 'null'] },
                defaultModel: { type: ['string', 'null'] },
                baseUrl: { type: ['string', 'null'] },
              },
              required: ['apiKey'],
            },
          },
        },
        defaults: {
          allLlmConfigs: {},
        },
        clearInvalidConfig: true,
      });

      console.log('LLM configurations store initialized with secure encryption');
    } catch (error) {
      console.error('Error initializing LLM configurations store:', error);

      // If there's an error, attempt to recover by creating a store with no encryption
      // and no pre-existing data (will reset user settings but allow the app to work)
      try {
        // Attempt to delete potentially corrupted file - this is a fallback safety measure
        const fs = require('fs');
        const path = require('path');
        const electron = require('electron');

        // Try to locate and remove the config file
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        const storePath = path.join(userDataPath, 'pastemax-llm-configs.json');

        if (fs.existsSync(storePath)) {
          console.log('Removing corrupted config file:', storePath);
          fs.unlinkSync(storePath);
        }

        // Create a new store with default values and no encryption
        store = new Store({
          name: 'pastemax-llm-configs-new',
          defaults: {
            allLlmConfigs: {},
          },
        });

        console.log('Created fallback LLM configurations store without encryption');
      } catch (fallbackError) {
        console.error('Failed to create fallback store:', fallbackError);
        // Last resort - in-memory store that won't persist
        store = {
          get: () => ({ allLlmConfigs: {} }),
          set: () => {},
        };
        console.log('Using in-memory (non-persistent) store as last resort');
      }
    }
  }
}

/**
 * Retrieves the stored AllLlmConfigs object
 * @returns {Promise<AllLlmConfigs>}
 */
async function getAllLlmConfigsFromStore() {
  initializeStore();
  return store.get('allLlmConfigs', {});
}

/**
 * Saves the AllLlmConfigs object
 * @param {AllLlmConfigs} configs - The AllLlmConfigs object
 * @returns {Promise<void>}
 */
async function setAllLlmConfigsInStore(configs) {
  initializeStore();
  store.set('allLlmConfigs', configs);
}

/**
 * Creates and returns the appropriate Langchain chat model based on provided configuration.
 * MODIFIED: Now accepts parameters instead of reading from global store.
 * @param {string} provider - The LLM provider (e.g., 'openai', 'groq', 'gemini')
 * @param {string} modelName - The specific model name to use
 * @param {string} apiKey - The API key for the provider
 * @param {string} [baseUrl] - Optional base URL for the API
 * @returns {Promise<ChatOpenAI|ChatAnthropic|ChatGoogleGenerativeAI|ChatMistralAI|ChatGroq>}
 */
async function getChatModel(provider, modelName, apiKey, baseUrl) {
  if (!provider || !apiKey) {
    throw new Error('LLM provider or API key not provided to getChatModel.');
  }

  console.log(`[LLM Service] Creating chat model for provider: ${provider}`);

  try {
    switch (provider) {
      case 'openai': {
        console.log(`[LLM Service] Using OpenAI model: ${modelName || 'Default (gpt-3.5-turbo)'}`);
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName || 'gpt-3.5-turbo',
        };
        if (baseUrl) {
          options.configuration = { baseURL: baseUrl };
        }
        return new ChatOpenAI(options);
      }

      case 'anthropic': {
        console.log(`[LLM Service] Using Anthropic model: ${modelName || 'Default (claude-2)'}`);
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName || 'claude-2',
        };
        return new ChatAnthropic(options);
      }

      case 'gemini': {
        console.log(
          `[LLM Service] Using Google Gemini model: ${modelName || 'Default (gemini-pro)'}`
        );
        const options = {
          apiKey: apiKey,
          maxOutputTokens: 2048,
          temperature: 0.7,
          modelName: modelName || 'gemini-pro',
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        };
        return new ChatGoogleGenerativeAI(options);
      }

      case 'mistral': {
        console.log(
          `[LLM Service] Using Mistral model: ${modelName || 'Default (mistral-small-latest)'}`
        );
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName || 'mistral-small-latest',
        };
        if (baseUrl) {
          options.baseUrl = baseUrl;
        }
        return new ChatMistralAI(options);
      }

      case 'groq': {
        console.log(`[LLM Service] Using Groq model: ${modelName}`);
        if (!modelName) {
          throw new Error('Model name is required for Groq provider.');
        }
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName,
        };
        return new ChatGroq(options);
      }

      case 'openrouter': {
        console.log(`[LLM Service] Using OpenRouter via OpenAI client. Model: ${modelName}`);
        if (!modelName) {
          throw new Error('Model name (e.g., deepseek/deepseek-chat) is required for OpenRouter.');
        }
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName,
          configuration: {
            baseURL: baseUrl || 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': '',
              'X-Title': 'PasteMax',
            },
          },
        };
        return new ChatOpenAI(options);
      }

      default:
        console.error(`[LLM Service] Unsupported provider: ${provider}`);
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  } catch (error) {
    console.error(`[LLM Service] Error initializing chat model for ${provider}:`, error);
    throw new Error(`Failed to initialize chat model for ${provider}: ${error.message}`);
  }
}

/**
 * Converts message objects to Langchain message instances
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of Langchain message instances
 */
function convertToLangchainMessages(messages) {
  return messages.map((msg) => {
    let messageInstance;
    switch (msg.role) {
      case 'system':
        messageInstance = new SystemMessage(msg.content);
        break;
      case 'user': // Typically maps to HumanMessage for Langchain
        messageInstance = new HumanMessage(msg.content);
        break;
      case 'assistant': // Typically maps to AIMessage for Langchain
        messageInstance = new AIMessage(msg.content);
        break;
      default:
        console.warn(
          `[LLM Service] Unsupported message role encountered: ${msg.role}. Treating as HumanMessage.`
        );
        messageInstance = new HumanMessage(msg.content); // Fallback
        break;
    }
    // Add the getType method as a workaround for the Mistral library
    if (messageInstance && typeof messageInstance._getType === 'function') {
      messageInstance.getType = function () {
        return this._getType();
      };
    }
    return messageInstance;
  });
}

/**
 * Sends the prompt to the configured LLM and returns the response.
 * MODIFIED: Accepts full configuration per call.
 * @param {Object} params - The parameters for sending the prompt.
 * @param {{ role: string, content: string }[]} params.messages - The messages to send.
 * @param {string} params.provider - The LLM provider.
 * @param {string} params.model - The model name.
 * @param {string} params.apiKey - The API key.
 * @param {string} [params.baseUrl] - Optional base URL.
 * @returns {Promise<{ content: string, provider?: string, error?: string }>}
 */
async function sendPromptToLlm({ messages, provider, model, apiKey, baseUrl }) {
  console.log('[LLM Service] Preparing to send prompt to LLM');

  const chat = await getChatModel(provider, model, apiKey, baseUrl);

  const langchainMessages = convertToLangchainMessages(messages);

  console.log('[LLM Service] Converted', langchainMessages.length, 'messages to Langchain format');
  console.log(
    '[LLM Service] Message structure:',
    langchainMessages.map((m) => ({
      type: m.constructor.name,
      _type: m._getType(),
      contentLength: m.content.length,
    }))
  );

  try {
    console.log('[LLM Service] Invoking chat model');
    const response = await chat.invoke(langchainMessages);
    console.log('[LLM Service] Received response from LLM');
    const responseContent =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    console.log('[LLM Service] Response received, length:', responseContent.length, 'characters');
    return { content: responseContent, provider: provider };
  } catch (error) {
    console.error('[LLM Service] Error invoking chat model:', error);
    return {
      content: '',
      error: `Failed to get response: ${error.message}`,
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
  getAllLlmConfigsFromStore,
  setAllLlmConfigsInStore,
  sendPromptToLlm,
  saveContentToFile,
};
