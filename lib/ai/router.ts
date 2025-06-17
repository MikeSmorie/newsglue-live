// 🧠 OmegaAIR: Developer-Facing Utilities — lib/ai/router.ts

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { runClaude } from "./providers/claude";
import { runMistral } from "./providers/mistral";

// Provider type definitions
export type ProviderName = 'claude' | 'openai' | 'mistral';
export type ProviderStatus = 'online' | 'offline' | 'stub';

interface RoutingConfig {
  priority: ProviderName[];
  fallbacks: Record<ProviderName, boolean>;
  globalFallback: boolean;
}

interface ProviderResponse {
  success: boolean;
  provider: string;
  model: string;
  output: string;
  tokensUsed: number;
  error?: string;
}

// Provider implementations
export const providers = {
  claude: {
    async status(): Promise<ProviderStatus> {
      return !!process.env.CLAUDE_API_KEY ? 'online' : 'stub';
    },
    async generate(prompt: string, options?: any): Promise<string> {
      const response = await runClaude(prompt);
      if (response.success) {
        return response.output;
      }
      throw new Error('Claude provider failed');
    }
  },
  openai: {
    async status(): Promise<ProviderStatus> {
      return !!process.env.OPENAI_API_KEY ? 'online' : 'offline';
    },
    async generate(prompt: string, options?: any): Promise<string> {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      // Use existing OpenAI integration when available
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  mistral: {
    async status(): Promise<ProviderStatus> {
      return !!process.env.MISTRAL_API_KEY ? 'online' : 'stub';
    },
    async generate(prompt: string, options?: any): Promise<string> {
      const response = await runMistral(prompt);
      if (response.success) {
        return response.output;
      }
      throw new Error('Mistral provider failed');
    }
  }
};

// Get routing configuration from saved settings
async function getRoutingConfig(): Promise<RoutingConfig> {
  const configPath = join(process.cwd(), "server", "config", "ai-routing.json");
  
  // Default configuration
  const defaultConfig: RoutingConfig = {
    priority: ['claude', 'openai', 'mistral'],
    fallbacks: {
      claude: true,
      openai: true,
      mistral: true
    },
    globalFallback: true
  };

  if (!existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const configData = readFileSync(configPath, 'utf8');
    const savedConfig = JSON.parse(configData);
    
    // Extract routing preferences from saved config
    return {
      priority: savedConfig.models?.sort((a: any, b: any) => a.priority - b.priority)
        .map((model: any) => model.provider) || defaultConfig.priority,
      fallbacks: savedConfig.models?.reduce((acc: any, model: any) => {
        acc[model.provider] = model.fallbackEnabled;
        return acc;
      }, {}) || defaultConfig.fallbacks,
      globalFallback: savedConfig.globalFallback ?? defaultConfig.globalFallback
    };
  } catch (error) {
    console.warn('Failed to load routing config, using defaults:', error);
    return defaultConfig;
  }
}

// Returns the top-priority *available* model (with fallbacks respected)
export async function getBestModel(): Promise<ProviderName> {
  const config = await getRoutingConfig();
  
  for (const provider of config.priority) {
    const isFallbackEnabled = config.fallbacks[provider];
    const status = await providers[provider].status();
    
    if (status === "online" || (status === "stub" && isFallbackEnabled)) {
      return provider;
    }
  }
  
  throw new Error("No available AI models found.");
}

// Allows a module to send a request using the best available model
export async function sendAIRequest(prompt: string, options?: any): Promise<string> {
  const config = await getRoutingConfig();
  let lastError: Error | null = null;

  for (const provider of config.priority) {
    const isFallbackEnabled = config.fallbacks[provider];
    const status = await providers[provider].status();
    
    if (status === "online" || (status === "stub" && isFallbackEnabled)) {
      try {
        const response = await providers[provider].generate(prompt, options);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider} failed:`, error);
        
        // If fallback is disabled or global fallback is off, throw immediately
        if (!isFallbackEnabled || !config.globalFallback) {
          throw error;
        }
        
        // Continue to next provider if fallback is enabled
        continue;
      }
    }
  }
  
  throw lastError || new Error("No available AI models found.");
}

// Get current provider status for debugging
export async function getProviderStatuses(): Promise<Record<ProviderName, ProviderStatus>> {
  const statuses: Record<ProviderName, ProviderStatus> = {} as any;
  
  for (const [name, provider] of Object.entries(providers)) {
    statuses[name as ProviderName] = await provider.status();
  }
  
  return statuses;
}

// Quick utility to test if any AI provider is available
export async function isAnyProviderAvailable(): Promise<boolean> {
  try {
    await getBestModel();
    return true;
  } catch {
    return false;
  }
}