const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatMistralAI } = require('@langchain/mistralai');
const { ChatGroq } = require('@langchain/groq');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const Store = require('electron-store');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

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
  if (!provider || !apiKey || !modelName) {
    throw new Error('LLM provider, API key, and Model Name are required to getChatModel.');
  }

  console.log(
    `[LLM Service] Creating chat model for provider: ${provider}, model: ${modelName}, Base URL from settings: ${baseUrl || 'Not provided'}`
  );
  // Diagnostic log to inspect the provider string before the switch
  console.log(
    `[LLM Service] DIAGNOSTIC: Provider string before switch: "${provider}", Length: ${provider?.length}`
  );
  if (typeof provider === 'string') {
    console.log(
      `[LLM Service] DIAGNOSTIC: Character codes: ${provider
        .split('')
        .map((char) => char.charCodeAt(0))
        .join(', ')}`
    );
  }

  try {
    switch (provider) {
      case 'openai': {
        console.log(`[LLM Service] Using OpenAI model: ${modelName}`);
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName,
        };
        if (baseUrl) {
          options.configuration = { baseURL: baseUrl };
        }
        return new ChatOpenAI(options);
      }

      case 'anthropic': {
        console.log(`[LLM Service] Using Anthropic model: ${modelName}`);
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName,
        };
        return new ChatAnthropic(options);
      }

      case 'gemini': {
        console.log(`[LLM Service] Initializing Google Gemini model directly: ${modelName}`);

        // Using @google/generative-ai directly
        const genAI = new GoogleGenerativeAI(apiKey);

        // Prepare safety settings for Google's SDK
        // These were previously in finalChatGoogleOptions, now adapting for direct SDK use.
        // Keeping them commented out if user previously removed them, but showing structure.
        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ];

        // Note: The @google/generative-ai SDK uses 'generationConfig' for temperature, maxOutputTokens etc.
        // The 'baseUrl' for this SDK is typically configured during GoogleGenerativeAI instantiation if needed for a proxy,
        // or model names might need specific paths if not using the default endpoint.
        // The direct curl test used the default endpoint successfully.

        // The model name for Google's SDK should be just the identifier like 'gemini-2.5-flash-preview-05-20'
        // It internally knows to use v1beta for preview models.
        const modelInstance = genAI.getGenerativeModel({
          model: modelName,
          // safetySettings, // Uncomment if you want to re-enable safety settings
          // generationConfig: { // Optional: map temperature, maxOutputTokens if needed
          //   temperature: 0.7,
          //   maxOutputTokens: 2048,
          // }
        });

        // Adapter to make it compatible with the existing sendPromptToLlm structure
        return {
          async invoke(langchainMessages) {
            // Convert Langchain messages to Google AI SDK format
            // Google SDK expects: { role: "user" | "model", parts: [{ text: "..." }] }
            // System messages need to be handled carefully. Google's SDK's chat.sendMessage
            // takes history which can include alternating user/model. System prompt is often prepended to the first user message.

            let systemInstruction = null;
            const history = [];
            const messagesForGoogle = [];

            for (const lcMsg of langchainMessages) {
              if (lcMsg._getType() === 'system') {
                // Google's GenerativeModel.startChat doesn't directly take a system message in the same way OpenAI does.
                // It can be part of the initial message or set in `startChat({ systemInstruction: ... })` for newer models/features.
                // For `generateContent`, it's often prepended to the first user message content.
                // Let's store it and prepend it to the first "user" message.
                systemInstruction = lcMsg.content;
              } else if (lcMsg._getType() === 'human') {
                messagesForGoogle.push({ role: 'user', parts: [{ text: lcMsg.content }] });
              } else if (lcMsg._getType() === 'ai') {
                messagesForGoogle.push({ role: 'model', parts: [{ text: lcMsg.content }] });
              }
            }

            // Prepend system instruction to the content of the first user message if available
            if (systemInstruction && messagesForGoogle.length > 0) {
              let firstUserMessageIndex = -1;
              for (let i = 0; i < messagesForGoogle.length; i++) {
                if (messagesForGoogle[i].role === 'user') {
                  firstUserMessageIndex = i;
                  break;
                }
              }
              if (firstUserMessageIndex !== -1) {
                messagesForGoogle[firstUserMessageIndex].parts[0].text =
                  systemInstruction +
                  '\n\n' +
                  messagesForGoogle[firstUserMessageIndex].parts[0].text;
              } else {
                // If no user message, create one with system instruction (edge case)
                messagesForGoogle.unshift({ role: 'user', parts: [{ text: systemInstruction }] });
              }
            }

            // If using `startChat` and `sendMessage` (for conversational history)
            // const chat = modelInstance.startChat({ history: googleHistory, systemInstruction: { parts: [{text: systemInstructionContent}], role: "system" } });
            // const result = await chat.sendMessage(currentUserMessageContent);

            // Using generateContent for simplicity, as it takes full message sequence
            console.log(
              '[LLM Service Direct SDK] Sending to Google with messages:',
              JSON.stringify(messagesForGoogle, null, 2)
            );
            try {
              const result = await modelInstance.generateContent({ contents: messagesForGoogle });
              const response = result.response;
              const text = response.text(); // Helper function to get full text
              return new AIMessage(text); // Return as a Langchain AIMessage
            } catch (error) {
              console.error('[LLM Service Direct SDK] Error invoking Google model:', error);
              // Check if the error has specific Gemini API error structure
              if (error.response && error.response.promptFeedback) {
                throw new Error(
                  `Google API Error: ${error.message}, Feedback: ${JSON.stringify(error.response.promptFeedback)}`
                );
              }
              throw error; // rethrow original error if not a specific API feedback error
            }
          },
          // Add _isChatModel property to satisfy Langchain checks if any part of your code relies on it.
          _isChatModel: true,
        };
      }

      case 'mistral': {
        console.log(`[LLM Service] Using Mistral model: ${modelName}`);
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName,
        };
        if (baseUrl) {
          options.baseUrl = baseUrl;
        }
        return new ChatMistralAI(options);
      }

      case 'groq': {
        console.log("[LLM Service] DIAGNOSTIC: Entered 'groq' case.");
        console.log(`[LLM Service] Using Groq model: ${modelName}`);
        const options = {
          apiKey: apiKey,
          temperature: 0.7,
          modelName: modelName,
          model: modelName,
        };
        return new ChatGroq(options);
      }

      case 'openrouter': {
        console.log(`[LLM Service] Using OpenRouter via OpenAI client. Model: ${modelName}`);
        const options = {
          openAIApiKey: apiKey,
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
