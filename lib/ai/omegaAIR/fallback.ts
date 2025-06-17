// 🧠 OmegaAIR Module: Retry and Fallback Logic

import type { OmegaAIRRequest, OmegaAIRResponse, Provider, FallbackOptions } from './types';
import { getEnabledModels, getAIProviders } from './config';
import { OpenAIProvider, ClaudeProvider, MistralProvider } from './providers';

export class FallbackManager {
  private providers: Map<Provider, any> = new Map();
  private enabledProviders: Provider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const enabledModels = getEnabledModels();
    const configuredProviders = getAIProviders();

    // Only initialize providers that are both enabled and configured
    configuredProviders.forEach(provider => {
      if (enabledModels[provider]) {
        try {
          switch (provider) {
            case 'openai':
              this.providers.set('openai', new OpenAIProvider());
              this.enabledProviders.push('openai');
              break;
            case 'claude':
              this.providers.set('claude', new ClaudeProvider());
              this.enabledProviders.push('claude');
              break;
            case 'mistral':
              this.providers.set('mistral', new MistralProvider());
              this.enabledProviders.push('mistral');
              break;
          }
        } catch (error) {
          console.warn(`Failed to initialize ${provider} provider:`, error);
        }
      }
    });
  }

  async executeWithFallback(
    request: OmegaAIRRequest,
    options: FallbackOptions = { maxRetries: 3, backoffMultiplier: 2 }
  ): Promise<OmegaAIRResponse> {
    let availableProviders = [...this.enabledProviders];
    
    // Exclude any providers specified in options
    if (options.excludeProviders) {
      availableProviders = availableProviders.filter(
        provider => !options.excludeProviders!.includes(provider)
      );
    }

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;
    let attempt = 0;

    for (const provider of availableProviders) {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) continue;

      for (let retry = 0; retry < options.maxRetries; retry++) {
        attempt++;
        
        try {
          console.log(`OmegaAIR: Attempting ${provider} (attempt ${attempt})`);
          
          const response = await providerInstance.generateResponse(request);
          console.log(`OmegaAIR: Success with ${provider}`);
          
          return response;
        } catch (error) {
          lastError = error as Error;
          console.warn(`OmegaAIR: ${provider} failed (attempt ${retry + 1}):`, error);
          
          // Wait before retry (exponential backoff)
          if (retry < options.maxRetries - 1) {
            const delay = Math.pow(options.backoffMultiplier, retry) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  getAvailableProviders(): Provider[] {
    return [...this.enabledProviders];
  }

  isProviderAvailable(provider: Provider): boolean {
    return this.enabledProviders.includes(provider);
  }
}