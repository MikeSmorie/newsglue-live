// AI Multiplexer - Routes requests to appropriate providers
import { runClaude } from './providers/claude';
import { runMistral } from './providers/mistral';

export interface AIResponse {
  success: boolean;
  provider: string;
  model: string;
  output: string;
  tokensUsed: number;
  error?: string;
}

export interface ProviderStatus {
  name: string;
  isOnline: boolean;
  hasApiKey: boolean;
  models: string[];
}

export const getProviderStatuses = async (): Promise<ProviderStatus[]> => {
  // Get routing preferences if available
  let routingPrefs = null;
  try {
    const response = await fetch('/api/admin/ai-routing/preferences');
    if (response.ok) {
      routingPrefs = await response.json();
    }
  } catch (error) {
    // Fallback to defaults if no saved preferences
  }

  const baseProviders = [
    {
      name: 'openai',
      isOnline: !!process.env.OPENAI_API_KEY,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    {
      name: 'claude',
      isOnline: false, // Stubbed - will be true when API key provided
      hasApiKey: !!process.env.CLAUDE_API_KEY,
      models: ['claude-3-5-sonnet', 'claude-3-haiku']
    },
    {
      name: 'mistral',
      isOnline: false, // Stubbed - will be true when API key provided
      hasApiKey: !!process.env.MISTRAL_API_KEY,
      models: ['mistral-large', 'mistral-medium']
    }
  ];

  // Apply routing preferences if available
  if (routingPrefs?.priority) {
    return routingPrefs.priority.map((providerName: string) => {
      const provider = baseProviders.find(p => p.name === providerName);
      return provider || baseProviders.find(p => p.name === providerName);
    }).filter(Boolean);
  }

  return baseProviders;
};

export const runAIProvider = async (
  provider: string,
  input: string,
  model?: string
): Promise<AIResponse> => {
  try {
    switch (provider.toLowerCase()) {
      case 'claude':
        return await runClaude(input);
      
      case 'mistral':
        return await runMistral(input);
      
      case 'openai':
        // Check if OpenAI is available
        if (!process.env.OPENAI_API_KEY) {
          return {
            success: false,
            provider: 'openai',
            model: model || 'gpt-3.5-turbo',
            output: '',
            tokensUsed: 0,
            error: 'OpenAI API key not configured'
          };
        }
        
        // For now, return a stub response for OpenAI too
        // This will be replaced with actual OpenAI integration
        return {
          success: true,
          provider: 'openai',
          model: model || 'gpt-3.5-turbo',
          output: `OpenAI response for: ${input}`,
          tokensUsed: 50
        };
      
      default:
        return {
          success: false,
          provider: provider,
          model: model || 'unknown',
          output: '',
          tokensUsed: 0,
          error: `Unknown provider: ${provider}`
        };
    }
  } catch (error) {
    return {
      success: false,
      provider: provider,
      model: model || 'unknown',
      output: '',
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const runWithFallback = async (
  input: string,
  preferredProvider?: string,
  preferredModel?: string
): Promise<AIResponse> => {
  const providers = await getProviderStatuses();
  const availableProviders = providers.filter((p: ProviderStatus) => p.isOnline || p.name === 'claude' || p.name === 'mistral');
  
  // Try preferred provider first
  if (preferredProvider) {
    const result = await runAIProvider(preferredProvider, input, preferredModel);
    if (result.success) {
      return result;
    }
  }
  
  // Fallback to other providers in priority order
  for (const provider of availableProviders) {
    if (provider.name !== preferredProvider) {
      const result = await runAIProvider(provider.name, input);
      if (result.success) {
        return result;
      }
    }
  }
  
  // All providers failed
  return {
    success: false,
    provider: 'none',
    model: 'none',
    output: '',
    tokensUsed: 0,
    error: 'All AI providers are unavailable'
  };
};