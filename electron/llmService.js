const fetch = require('node-fetch'); // Added for fetchAvailableModelsFromProvider
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatMistralAI } = require('@langchain/mistralai');
const { ChatGroq } = require('@langchain/groq');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const Store = require('electron-store');
// const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Store instance for persisting LLM configuration
 */
let store;

// Active LLM requests for cancellation support
const activeRequests = new Map(); // requestId -> AbortController

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
            console.log(
              '[LLM Service] Gemini invoke adapter - received langchainMessages:',
              JSON.stringify(langchainMessages, null, 2)
            ); // Log received langchainMessages
            // Convert Langchain messages to Google AI SDK format
            // Google SDK expects: { role: "user" | "model", parts: [{ text: "..." }] }
            // System messages need to be handled carefully. Google's SDK's chat.sendMessage
            // takes history which can include alternating user/model. System prompt is often prepended to the first user message.

            let systemInstruction = null;
            // const history = [];
            const messagesForGoogle = [];

            for (const lcMsg of langchainMessages) {
              if (lcMsg._getType() === 'system') {
                // Google's GenerativeModel.startChat doesn't directly take a system message in the same way OpenAI does.
                // It can be part of the initial message or set in `startChat({ systemInstruction: ... })` for newer models/features.
                // For `generateContent`, it's often prepended to the first user message content.
                // Let's store it and prepend it to the first "user" message.
                systemInstruction = lcMsg.content || ''; // Ensure systemInstruction is at least an empty string
              } else if (lcMsg._getType() === 'human') {
                messagesForGoogle.push({ role: 'user', parts: [{ text: lcMsg.content || '' }] }); // Ensure text key exists
              } else if (lcMsg._getType() === 'ai') {
                messagesForGoogle.push({ role: 'model', parts: [{ text: lcMsg.content || '' }] }); // Ensure text key exists
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
              } else if (messagesForGoogle.length > 0) {
                // If no user message, prepend to the first model message (less ideal)
                messagesForGoogle[0].parts[0].text =
                  systemInstruction + '\n\n' + messagesForGoogle[0].parts[0].text;
              } else {
                // Only a system message was provided. Convert it to a user message.
                messagesForGoogle.push({ role: 'user', parts: [{ text: systemInstruction }] });
              }
            } else if (systemInstruction && messagesForGoogle.length === 0) {
              // Only a system message was provided in langchainMessages and messagesForGoogle is still empty.
              messagesForGoogle.push({ role: 'user', parts: [{ text: systemInstruction }] });
            }

            // Final check: if after all processing, messagesForGoogle is empty, or contains only messages with empty text parts,
            // the API will likely fail. The Google API requires at least one part with non-empty text.
            const hasAnyActualContent = messagesForGoogle.some((msg) =>
              msg.parts.some((part) => part.text && part.text.trim() !== '')
            );

            if (!hasAnyActualContent) {
              console.warn(
                '[LLM Service] Gemini: No actual text content found in messages for Google. Sending a placeholder to avoid API error.'
              );
              // Replace messagesForGoogle with a single placeholder user message
              messagesForGoogle.splice(0, messagesForGoogle.length, {
                role: 'user',
                parts: [{ text: '(No meaningful content to send)' }],
              });
            } else {
              // Ensure all parts have text, even if it was originally empty string from lcMsg.content
              messagesForGoogle.forEach((msg) => {
                msg.parts.forEach((part) => {
                  if (typeof part.text !== 'string') {
                    part.text = ''; // Ensure text property exists and is a string
                  }
                });
              });
            }

            // The last message in messagesForGoogle is the current user prompt
            const lastMessage = messagesForGoogle[messagesForGoogle.length - 1];

            // Ensure lastMessage and its parts are defined and have text content
            let promptText = '';
            if (
              lastMessage &&
              lastMessage.parts &&
              lastMessage.parts[0] &&
              typeof lastMessage.parts[0].text === 'string'
            ) {
              promptText = lastMessage.parts[0].text;
            } else {
              console.error(
                '[LLM Service] Gemini: Last message for sending is invalid or has no text content.',
                lastMessage
              );
              // If it's somehow still empty, use a non-empty placeholder to avoid API error,
              // though this indicates a deeper logic issue upstream.
              promptText = '(No content provided for this message)';
            }

            if (!promptText.trim()) {
              console.warn(
                '[LLM Service] Gemini: Attempting to send an empty or whitespace-only message. Using placeholder.'
              );
              promptText = '(User sent an empty message)';
            }

            // console.log('[LLM Service] Gemini: Sending to API. History:', messagesForGoogle.slice(0, -1));
            // console.log('[LLM Service] Gemini: Sending to API. Current prompt:', promptText);

            console.log(
              '[LLM Service] Gemini: Final messagesForGoogle before API call:',
              JSON.stringify(messagesForGoogle, null, 2)
            ); // Log final payload
            const result = await modelInstance.generateContent({ contents: messagesForGoogle });
            const response = result.response;
            const text = response.text(); // Helper function to get full text
            return new AIMessage(text); // Return as a Langchain AIMessage
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
 * Normalizes LLM error messages for user display.
 * @param {Error} error - The error object from the LLM SDK.
 * @param {string} provider - The name of the LLM provider (e.g., 'openai', 'anthropic').
 * @returns {string} A user-friendly error message.
 */
function normalizeLlmError(error, provider) {
  // General checks
  if (error.name === 'AbortError' || error.message?.toLowerCase().includes('abort')) {
    return 'Request cancelled by user.';
  }
  if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED') || error.message?.includes('EAI_AGAIN')) {
    return `Network Error: Could not connect to ${provider}. Check your internet connection and firewall settings.`;
  }
  if (error.message?.includes('socket hang up')) {
    return `Network Error: Connection to ${provider} was unexpectedly closed. Check your internet connection.`;
  }

  // Provider-specific error handling
  let status;
  let errorCode;
  let errorMessage = error.message || `An unknown error occurred with ${provider}.`; // Default

  if (error.response) { // Axios-like error structure (used by some SDKs implicitly)
    status = error.response.status;
    // Attempt to get more specific error message from response data
    if (error.response.data && error.response.data.error) {
      if (typeof error.response.data.error === 'string') {
        errorMessage = error.response.data.error;
      } else if (error.response.data.error.message) {
        errorMessage = error.response.data.error.message;
      }
      if (error.response.data.error.code) {
        errorCode = error.response.data.error.code;
      }
    } else if (error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message; // For some API formats
    }
  } else if (error.status) { // Direct status property
    status = error.status;
  } else if (error.statusCode) { // Another common property for status
    status = error.statusCode;
  }

  if (error.code) { // SDK-specific error codes (not HTTP status)
    errorCode = error.code;
  }


  // Normalize based on provider and status/code
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1); // Capitalize provider

  switch (provider.toLowerCase()) {
    case 'openai':
    case 'mistral': // MistralAI often uses similar error structures to OpenAI
    case 'openrouter': // OpenRouter also mirrors OpenAI errors
      if (status === 401) return `Authentication Error: Invalid API Key for ${providerName}. Please check your settings.`;
      if (status === 403) return `Permission Denied: Ensure your API key has the correct permissions for ${providerName}. (${errorMessage})`;
      if (status === 404) {
        if (errorMessage.includes('model_not_found') || errorMessage.includes('does not exist')) {
          return `Model Not Found: The selected model could not be found for ${providerName}. Check the model name and availability.`;
        }
        return `API Endpoint Not Found for ${providerName}. This might indicate an issue with the Base URL or API version. (${status})`;
      }
      if (status === 429) {
        if (errorCode === 'insufficient_quota' || errorMessage.toLowerCase().includes('quota')) {
          return `Quota Exceeded for ${providerName}. Please check your billing details and plan limits.`;
        }
        return `Rate Limit Exceeded for ${providerName}. Please try again later or check your plan. (${errorMessage})`;
      }
      if (status === 500) return `Internal Server Error with ${providerName}. Please try again later. (${errorMessage})`;
      if (errorCode === 'invalid_api_key') return `Authentication Error: Invalid API Key for ${providerName}.`;
      break;

    case 'anthropic':
      if (status === 401) return `Authentication Error: Invalid API Key for Anthropic. Please check your settings.`;
      if (status === 403) {
        if (errorMessage.includes('does not have access to models of type')) {
          return `Model Access Denied: Your Anthropic API key may not have access to the requested model. (${errorMessage})`;
        }
        return `Permission Denied: Ensure your API key has the correct permissions for Anthropic. (${errorMessage})`;
      }
      if (status === 404) return `Model Not Found or Endpoint Invalid for Anthropic. Check model name and API version. (${errorMessage})`;
      if (status === 429) return `Rate Limit Exceeded for Anthropic. Please try again later or check your plan. (${errorMessage})`;
      if (status === 500) return `Internal Server Error with Anthropic. Please try again later. (${errorMessage})`;
      if (error.type === 'authentication_error') return `Authentication Error: Invalid API Key for Anthropic.`;
      if (error.type === 'permission_error') return `Permission Denied for Anthropic. Check API key permissions.`;
      break;

    case 'gemini': // Google Generative AI
      // Google's SDK might wrap errors differently. Often, `error.message` contains the core info.
      // HTTP status might be less directly available or wrapped inside a deeper object.
      // Example: error.message might be "[GoogleGenerativeAI Error]: Error fetching from https..."
      // or "GoogleGenerativeAIError: [400] User location is not supported for the API use."
      if (errorMessage.includes('[400]') && errorMessage.toLowerCase().includes('api key not valid')) {
        return `Authentication Error: Invalid API Key for Google Gemini. Please ensure it is correct and enabled.`;
      }
      if (errorMessage.toLowerCase().includes('api key not valid')) {
         return `Authentication Error: Invalid API Key for Google Gemini. Please ensure it is correct and enabled.`;
      }
      if (errorMessage.includes('[400]') && errorMessage.toLowerCase().includes('user location is not supported')) {
        return `Region Not Supported: Google Gemini API does not support your current location. (${errorMessage})`;
      }
      if (errorMessage.includes('[404]') && errorMessage.toLowerCase().includes('model not found')) {
        return `Model Not Found: The specified model could not be found for Google Gemini.`;
      }
      if (errorMessage.includes('[429]') || errorMessage.toLowerCase().includes('resource has been exhausted') || errorMessage.toLowerCase().includes('rate limit')) {
        return `Rate Limit Exceeded or Quota Exhausted for Google Gemini. Please check your quota and try again later.`;
      }
      if (errorMessage.includes('[500]') || errorMessage.toLowerCase().includes('internal error')) {
        return `Internal Server Error with Google Gemini. Please try again later.`;
      }
      // Fallback for Gemini if specific patterns not matched
      if (providerName === 'Gemini' && errorMessage) return `Google Gemini Error: ${errorMessage}`;
      break;

    case 'groq':
      if (status === 401) return `Authentication Error: Invalid API Key for Groq. Please check your settings.`;
      if (status === 403) return `Permission Denied: Ensure your API key has the correct permissions for Groq. (${errorMessage})`;
      if (status === 404) return `Model Not Found or Endpoint Invalid for Groq. Check model name. (${errorMessage})`;
      if (status === 429) return `Rate Limit Exceeded for Groq. Please try again later or check your plan. (${errorMessage})`;
      if (status === 500) return `Internal Server Error with Groq. Please try again later. (${errorMessage})`;
      if (error.code === 'auth_failed' || errorMessage.toLowerCase().includes('invalid api key')) {
        return `Authentication Error: Invalid API Key for Groq.`;
      }
      break;

    default:
      // Generic status code handling if provider specific checks didn't catch it
      if (status === 401) return `Authentication Error for ${providerName}. Check your API Key. (${errorMessage})`;
      if (status === 403) return `Permission Denied for ${providerName}. Check API key permissions. (${errorMessage})`;
      if (status === 404) return `Resource/Model Not Found for ${providerName}. (${errorMessage})`;
      if (status === 429) return `Rate Limit or Quota Exceeded for ${providerName}. (${errorMessage})`;
      if (status >= 500) return `Server Error (${status}) with ${providerName}. Please try again later. (${errorMessage})`;
      break;
  }

  // If nothing specific matched, return the most relevant message we have
  return errorMessage || `An unknown error occurred with ${providerName}. Status: ${status || 'N/A'}, Code: ${errorCode || 'N/A'}`;
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
 * Sends a prompt to the specified LLM
 * @param {Object} params - Parameters for the LLM request
 * @param {Array} params.messages - Array of message objects
 * @param {string} params.provider - LLM provider
 * @param {string} params.model - Model name
 * @param {string} params.apiKey - API key
 * @param {string} [params.baseUrl] - Base URL for the API
 * @param {string} params.requestId - Unique request ID for cancellation
 * @returns {Promise<Object>} Response from the LLM
 */
async function sendPromptToLlm({ messages, provider, model, apiKey, baseUrl, requestId }) {
  console.log('[LLM Service] Preparing to send prompt to LLM');

  // Create AbortController for this request
  const abortController = new AbortController();
  activeRequests.set(requestId, abortController);

  try {
    // Get the chat model
    const chatModel = await getChatModel(provider, model, apiKey, baseUrl);

    // Convert messages to Langchain format
    const langchainMessages = convertToLangchainMessages(messages);
    console.log('[LLM Service] Converted', messages.length, 'messages to Langchain format');
    console.log(
      '[LLM Service] langchainMessages (in sendPromptToLlm):',
      JSON.stringify(langchainMessages, null, 2)
    );
    console.log(
      '[LLM Service] Message structure:',
      langchainMessages.map((msg) => ({
        type: msg.constructor.name,
        _type: msg._getType(),
        contentLength: msg.content.length,
      }))
    );

    console.log('[LLM Service] Invoking chat model');

    // Pass the abort signal to the LLM invocation
    const response = await chatModel.invoke(langchainMessages, {
      signal: abortController.signal,
    });

    console.log('[LLM Service] Received response from LLM');
    console.log('[LLM Service] Response received, length:', response.content.length, 'characters');

    return {
      content: response.content,
      provider: provider,
    };
  } catch (error) {
    console.error('[LLM Service] Error sending prompt:', error);

    // Normalize the error message
    const normalizedErrorMessage = normalizeLlmError(error, provider);

    // Check if the error was due to cancellation (handled by normalizeLlmError)
    if (normalizedErrorMessage === 'Request cancelled by user.') {
      console.log('[LLM Service] Request was cancelled by user (identified by normalizeLlmError)');
      return {
        cancelled: true,
        error: normalizedErrorMessage,
      };
    }

    return {
      error: normalizedErrorMessage,
    };
  } finally {
    // Clean up the active request
    activeRequests.delete(requestId);
  }
}

/**
 * Cancels an active LLM request
 * @param {string} requestId - The ID of the request to cancel
 * @returns {Promise<{success: boolean, error?: string}>} Result of the cancellation
 */
async function cancelLlmRequestInService(requestId) {
  console.log('[LLM Service] Attempting to cancel request:', requestId);

  try {
    const abortController = activeRequests.get(requestId);

    if (abortController) {
      console.log('[LLM Service] Found active request, sending abort signal');
      abortController.abort();
      activeRequests.delete(requestId);
      return { success: true };
    } else {
      console.log('[LLM Service] No active request found for ID:', requestId);
      return { success: false, error: 'Request not found or already completed' };
    }
  } catch (error) {
    console.error('[LLM Service] Error cancelling request:', error);
    return { success: false, error: error.message || 'Failed to cancel request' };
  }
}

module.exports = {
  getAllLlmConfigsFromStore,
  setAllLlmConfigsInStore,
  sendPromptToLlm,
  cancelLlmRequestInService,
  fetchAvailableModelsFromProvider, // Export the new function
};

/**
 * @typedef {Object} ModelInfo
 * @property {string} id - Composite ID like 'provider/modelName'
 * @property {string} name - User-friendly display name
 * @property {string} provider - The provider name
 * @property {any} [originalData] - The original data from the API for this model
 */

/**
 * Fetches available models from a given LLM provider.
 * @param {string} providerName - The name of the provider (e.g., 'openrouter', 'openai', 'mistral').
 * @param {string} apiKey - The API key for the provider.
 * @param {string} [baseUrl] - Optional custom base URL for the API.
 * @returns {Promise<{ models: ModelInfo[], error?: string, message?: string }>}
 */
async function fetchAvailableModelsFromProvider(providerName, apiKey, baseUrl) {
  console.log(`[LLM Service] Fetching models for provider: ${providerName}`);
  try {
    switch (providerName.toLowerCase()) {
      case 'openrouter': {
        // OpenRouter uses its own API key in the Authorization header.
        const response = await fetch(baseUrl || 'https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[LLM Service] OpenRouter API error: ${response.status} ${errorText}`);
          throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
        const apiResponse = await response.json();
        if (apiResponse && Array.isArray(apiResponse.data)) {
          const models = apiResponse.data.map((model) => ({
            id: `openrouter/${model.id}`,
            name: model.name || model.id,
            provider: 'openrouter',
            originalData: model,
          }));
          return { models };
        }
        return { models: [], message: 'No models found or unexpected format from OpenRouter.' };
      }
      case 'openai': {
        const effectiveBaseUrl = baseUrl || 'https://api.openai.com/v1';
        const response = await fetch(`${effectiveBaseUrl.replace(/\/$/, '')}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[LLM Service] OpenAI API error: ${response.status} ${errorText}`);
          throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
        const apiResponse = await response.json();
        if (apiResponse && Array.isArray(apiResponse.data)) {
          const models = apiResponse.data
            .filter(model => model.id)
            .map((model) => ({
              id: `openai/${model.id}`,
              name: model.id,
              provider: 'openai',
              originalData: model,
            }));
          return { models };
        }
        return { models: [], message: 'No models found or unexpected format from OpenAI.' };
      }
      case 'mistral': {
        const effectiveBaseUrl = baseUrl || 'https://api.mistral.ai/v1';
        const response = await fetch(`${effectiveBaseUrl.replace(/\/$/, '')}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[LLM Service] Mistral API error: ${response.status} ${errorText}`);
          throw new Error(`Mistral API request failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
        const apiResponse = await response.json();
        if (apiResponse && Array.isArray(apiResponse.data)) {
          const models = apiResponse.data
            .filter(model => model.id)
            .map((model) => ({
              id: `mistral/${model.id}`,
              name: model.id,
              provider: 'mistral',
              originalData: model,
            }));
          return { models };
        }
        return { models: [], message: 'No models found or unexpected format from Mistral.' };
      }
      case 'anthropic':
        return { models: [], message: 'Anthropic does not provide a public model listing API. Please enter model IDs manually from their documentation.' };
      case 'groq':
        return { models: [], message: 'Groq does not provide a public model listing API. Please enter model IDs manually from their documentation.' };
      case 'gemini':
        return { models: [], message: 'Google Gemini models are typically specified by name from documentation. Dynamic listing is not supported through a simple client API endpoint in the same way as other providers.' };
      default:
        console.warn(`[LLM Service] Model fetching not supported for provider: ${providerName}`);
        return { models: [], message: `Model fetching not implemented for ${providerName}.` };
    }
  } catch (error) {
    console.error(`[LLM Service] Error fetching models for ${providerName}:`, error);
    const normalizedMsg = normalizeLlmError(error, providerName);
    return { models: [], error: normalizedMsg };
  }
}
