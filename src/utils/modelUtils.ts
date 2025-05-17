/**
 * Utility functions for fetching and managing LLM models.
 */
import {
  ModelInfo,
  STORAGE_KEY_MODELS_CACHE,
  STORAGE_KEY_MODELS_FETCH_TIME,
} from '../types/ModelTypes';

// OpenRouter API endpoint for fetching models
const MODELS_API_URL = 'https://openrouter.ai/api/v1/models';

// Cache expiration time in milliseconds (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

/**
 * Fetches available models from the OpenRouter API directly.
 * Caches results to minimize API calls.
 *
 * @returns {Promise<ModelInfo[] | null>} Array of model information or null if fetch fails
 */
export async function fetchModels(): Promise<ModelInfo[] | null> {
  try {
    // Check for cached models first
    const cachedModels = getCachedModels();
    if (cachedModels) {
      console.log(`Using ${cachedModels.length} cached models.`);
      return cachedModels;
    }

    console.log('Fetching models from OpenRouter API...');
    const response = await fetch(MODELS_API_URL);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }

    // Map API response to ModelInfo structure
    const models = data.data.map((apiModel: any) => ({
      id: apiModel.id,
      name: apiModel.name || apiModel.id,
      description: apiModel.description || '',
      context_length: apiModel.context_length || 0,
      pricing: apiModel.pricing || '',
      available: apiModel.available !== false,
    }));

    // Cache the fetched models
    cacheModels(models);
    console.log(`Fetched and cached ${models.length} models.`);

    return models;
  } catch (error) {
    console.error('Error fetching models:', error);
    return null;
  }
}

/**
 * Caches models in localStorage to reduce API calls.
 *
 * @param {ModelInfo[]} models - Array of model information to cache
 */
export function cacheModels(models: ModelInfo[]): void {
  try {
    // Store models
    localStorage.setItem(STORAGE_KEY_MODELS_CACHE, JSON.stringify(models));

    // Store timestamp for cache expiration checking
    localStorage.setItem(STORAGE_KEY_MODELS_FETCH_TIME, Date.now().toString());

    console.log(`Cached ${models.length} models.`);
  } catch (error) {
    console.error('Error caching models:', error);
  }
}

/**
 * Retrieves cached models if they exist and aren't expired.
 *
 * @returns {ModelInfo[] | null} Cached models or null if cache is expired/empty
 */
export function getCachedModels(): ModelInfo[] | null {
  try {
    // Check if we have cached models and a timestamp
    const cachedModelsJson = localStorage.getItem(STORAGE_KEY_MODELS_CACHE);
    const cachedTimestamp = localStorage.getItem(STORAGE_KEY_MODELS_FETCH_TIME);

    if (!cachedModelsJson || !cachedTimestamp) {
      return null;
    }

    // Check if cache is expired
    const fetchTime = parseInt(cachedTimestamp, 10);
    const now = Date.now();

    if (now - fetchTime > CACHE_EXPIRATION) {
      console.log('Cached models have expired.');
      return null;
    }

    // Parse and return cached models
    const models = JSON.parse(cachedModelsJson) as ModelInfo[];
    return models;
  } catch (error) {
    console.error('Error retrieving cached models:', error);
    return null;
  }
}

/**
 * Formats the context length into a human-readable string.
 *
 * @param {number | undefined} tokens - Number of tokens in the context window
 * @returns {string} Formatted context length (e.g., "8k tokens" or "1M tokens")
 */
export function formatContextLength(tokens: number | undefined): string {
  if (typeof tokens !== 'number' || isNaN(tokens)) {
    return 'N/A';
  }

  if (tokens === 0) {
    return 'N/A';
  }

  if (tokens >= 1000000) {
    // Format as millions (e.g., "1.0M tokens")
    return `${(tokens / 1000000).toFixed(1).replace(/\.0$/, '')}M tokens`;
  }

  if (tokens >= 1000) {
    // Format as thousands (e.g., "8k tokens")
    return `${Math.round(tokens / 1000)}k tokens`;
  }

  // Format as raw number for small values
  return `${tokens} tokens`;
}
