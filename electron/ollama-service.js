const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');

/**
 * Default Ollama configuration
 */
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_API_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch with timeout using AbortController
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @param {AbortSignal} [externalSignal] - External abort signal for cancellation
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = 5000, externalSignal = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // If external signal is provided, abort our controller when it's aborted
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('Request cancelled');
    }
    externalSignal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if (externalSignal && externalSignal.aborted) {
        throw new Error('Request cancelled');
      }
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Check if Ollama is installed and running
 * @returns {Promise<{isInstalled: boolean, isRunning: boolean, url: string, error?: string}>}
 */
async function checkOllamaStatus(customUrl = null) {
  const ollamaUrl = customUrl || DEFAULT_OLLAMA_URL;

  try {
    // First check if Ollama is installed
    const isInstalled = await checkOllamaInstalled();

    if (!isInstalled) {
      return {
        isInstalled: false,
        isRunning: false,
        url: ollamaUrl,
        error: 'Ollama is not installed',
      };
    }

    // Check if Ollama service is running
    const isRunning = await checkOllamaRunning(ollamaUrl);

    return {
      isInstalled: true,
      isRunning,
      url: ollamaUrl,
      error: isRunning ? undefined : 'Ollama is installed but not running',
    };
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return {
      isInstalled: false,
      isRunning: false,
      url: ollamaUrl,
      error: error.message,
    };
  }
}

/**
 * Check if Ollama is installed on the system
 * @returns {Promise<boolean>}
 */
async function checkOllamaInstalled() {
  return new Promise((resolve) => {
    exec('ollama --version', (error, stdout, stderr) => {
      if (error) {
        console.log('Ollama not found in PATH');
        resolve(false);
      } else {
        console.log('Ollama found:', stdout.trim());
        resolve(true);
      }
    });
  });
}

/**
 * Check if Ollama service is running
 * @param {string} ollamaUrl - The Ollama API URL
 * @returns {Promise<boolean>}
 */
async function checkOllamaRunning(ollamaUrl) {
  try {
    const response = await fetchWithTimeout(
      `${ollamaUrl}/api/tags`,
      {
        method: 'GET',
      },
      5000
    );
    return response.ok;
  } catch (error) {
    console.log('Ollama service not running:', error.message);
    return false;
  }
}

/**
 * Fetch available Ollama models
 * @param {string} ollamaUrl - The Ollama API URL
 * @returns {Promise<Array>} Array of Ollama models
 */
async function fetchOllamaModels(ollamaUrl = DEFAULT_OLLAMA_URL) {
  try {
    console.log('Fetching Ollama models from:', ollamaUrl);

    const response = await fetchWithTimeout(
      `${ollamaUrl}/api/tags`,
      {
        method: 'GET',
      },
      OLLAMA_API_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      console.warn('No models found in Ollama response');
      return [];
    }

    // Transform Ollama model format to our ModelInfo format
    const models = data.models.map((model) => ({
      id: `ollama/${model.name}`,
      name: model.name,
      provider: 'ollama',
      context_length: model.details?.parameter_size || 4096, // Default context length
      description: `${model.details?.family || 'Unknown'} model`,
      available: true,
      isLocal: true,
      size: formatBytes(model.size),
      family: model.details?.family,
      modified_at: model.modified_at,
    }));

    console.log(`Found ${models.length} Ollama models`);
    return models;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error;
  }
}

/**
 * Send a chat request to Ollama
 * @param {Object} params - Chat parameters
 * @returns {Promise<string>} The response content
 */
async function sendOllamaRequest({ messages, model, ollamaUrl = DEFAULT_OLLAMA_URL, requestId }) {
  try {
    // Convert messages to Ollama format
    const prompt = convertMessagesToOllamaFormat(messages);

    // Extract just the model name (remove ollama/ prefix if present)
    const modelName = model.startsWith('ollama/') ? model.substring(7) : model;

    console.log(`Sending request to Ollama model: ${modelName}`);

    const response = await fetchWithTimeout(
      `${ollamaUrl}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
          },
        }),
      },
      OLLAMA_API_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error('Invalid response from Ollama API');
    }

    return data.response;
  } catch (error) {
    console.error('Error sending Ollama request:', error);
    throw error;
  }
}

/**
 * Send a streaming chat request to Ollama
 * @param {Object} params - Chat parameters
 * @param {Function} onChunk - Callback for streaming chunks
 * @param {AbortSignal} [params.signal] - AbortSignal for cancellation
 * @returns {Promise<void>}
 */
async function sendOllamaStreamRequest({
  messages,
  model,
  ollamaUrl = DEFAULT_OLLAMA_URL,
  requestId,
  onChunk,
  onEnd,
  onError,
  signal,
}) {
  try {
    const prompt = convertMessagesToOllamaFormat(messages);
    const modelName = model.startsWith('ollama/') ? model.substring(7) : model;

    console.log(`Sending streaming request to Ollama model: ${modelName}`);

    // Check if already cancelled before starting
    if (signal && signal.aborted) {
      console.log('[Ollama Service] Request cancelled before starting');
      onError(new Error('Request cancelled'));
      return;
    }

    const response = await fetchWithTimeout(
      `${ollamaUrl}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: true,
          options: {
            temperature: 0.7,
          },
        }),
      },
      OLLAMA_API_TIMEOUT,
      signal
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body;
    let buffer = '';

    reader.on('data', (chunk) => {
      // Check if request was cancelled
      if (signal && signal.aborted) {
        console.log('[Ollama Service] Streaming cancelled, destroying reader');
        reader.destroy();
        onError(new Error('Request cancelled'));
        return;
      }

      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the incomplete line in buffer

      for (const line of lines) {
        // Check cancellation again before processing each line
        if (signal && signal.aborted) {
          console.log('[Ollama Service] Streaming cancelled during line processing');
          reader.destroy();
          onError(new Error('Request cancelled'));
          return;
        }

        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              onChunk(data.response);
            }
            if (data.done) {
              onEnd();
              return;
            }
          } catch (parseError) {
            console.warn('Failed to parse Ollama response line:', line);
          }
        }
      }
    });

    reader.on('end', () => {
      if (signal && signal.aborted) {
        console.log('[Ollama Service] Stream ended due to cancellation');
        onError(new Error('Request cancelled'));
      } else {
        onEnd();
      }
    });

    reader.on('error', (error) => {
      if (signal && signal.aborted) {
        console.log('[Ollama Service] Stream error due to cancellation');
        onError(new Error('Request cancelled'));
      } else {
        onError(error);
      }
    });

    // Handle external cancellation
    if (signal) {
      signal.addEventListener('abort', () => {
        console.log('[Ollama Service] Abort signal received, destroying stream');
        reader.destroy();
        onError(new Error('Request cancelled'));
      });
    }
  } catch (error) {
    console.error('Error sending Ollama streaming request:', error);
    onError(error);
  }
}

/**
 * Convert messages array to Ollama prompt format
 * @param {Array} messages - Array of chat messages
 * @returns {string} Formatted prompt for Ollama
 */
function convertMessagesToOllamaFormat(messages) {
  let prompt = '';

  for (const message of messages) {
    switch (message.role) {
      case 'system':
        prompt += `System: ${message.content}\n\n`;
        break;
      case 'user':
        prompt += `Human: ${message.content}\n\n`;
        break;
      case 'assistant':
        prompt += `Assistant: ${message.content}\n\n`;
        break;
    }
  }

  // Add the final prompt for the assistant to respond
  prompt += 'Assistant: ';

  return prompt;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Start Ollama service (if installed but not running)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function startOllamaService() {
  return new Promise((resolve) => {
    try {
      console.log('[Ollama Service] Starting Ollama server as detached process...');

      // Start ollama serve as a detached background process
      const child = spawn('ollama', ['serve'], {
        detached: true, // Allow the process to continue running independently
        stdio: 'ignore', // Don't pipe stdout/stderr (run silently)
      });

      // Unref the child process so the parent can exit independently
      child.unref();

      // Handle spawn errors (e.g., ollama not found)
      child.on('error', (error) => {
        console.error('[Ollama Service] Failed to start Ollama server:', error.message);
        resolve({ success: false, error: error.message });
      });

      // If spawn succeeds, resolve immediately
      // The server will run in the background
      console.log('[Ollama Service] Ollama server started with PID:', child.pid);
      resolve({ success: true });
    } catch (error) {
      console.error('[Ollama Service] Error starting Ollama service:', error);
      resolve({ success: false, error: error.message });
    }
  });
}

module.exports = {
  checkOllamaStatus,
  fetchOllamaModels,
  sendOllamaRequest,
  sendOllamaStreamRequest,
  startOllamaService,
  DEFAULT_OLLAMA_URL,
};
