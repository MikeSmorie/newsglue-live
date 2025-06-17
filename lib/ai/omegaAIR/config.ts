// 🧠 OmegaAIR Module: Model Config Loader

import type { ProviderConfig, Provider } from './types';

export const getEnabledModels = () => {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    claude: !!process.env.CLAUDE_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
  };
};

export const getProviderConfig = (provider: Provider): ProviderConfig | null => {
  const configs = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      enabled: !!process.env.OPENAI_API_KEY,
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      baseUrl: 'https://api.anthropic.com/v1',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      enabled: !!process.env.CLAUDE_API_KEY,
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY || '',
      baseUrl: 'https://api.mistral.ai/v1',
      models: ['mistral-large-latest', 'mistral-medium-latest'],
      enabled: !!process.env.MISTRAL_API_KEY,
    }
  };

  return configs[provider] || null;
};

export const getOmegaAIRMode = (): string => {
  return process.env.OMEGAAIR_MODE || 'auto';
};

export const getAIProviders = (): Provider[] => {
  const providersStr = process.env.AI_PROVIDERS || 'openai,claude,mistral';
  return providersStr.split(',').map(p => p.trim() as Provider);
};