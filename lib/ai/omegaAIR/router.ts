// 🧠 OmegaAIR Module: Entry Point and Request Router

import type { OmegaAIRRequest, OmegaAIRResponse, Provider, ModelMeta } from './types';
import { getOmegaAIRMode, getEnabledModels } from './config';
import { FallbackManager } from './fallback';

export class OmegaAIRRouter {
  private fallbackManager: FallbackManager;
  private modelMetadata: Map<string, ModelMeta> = new Map();

  constructor() {
    this.fallbackManager = new FallbackManager();
    this.initializeModelMetadata();
  }

  private initializeModelMetadata() {
    // OpenAI models
    this.modelMetadata.set('gpt-4o', {
      provider: 'openai',
      name: 'gpt-4o',
      maxTokens: 128000,
      costPer1kTokens: 0.03,
      priority: 1,
      available: true,
    });

    this.modelMetadata.set('gpt-4-turbo', {
      provider: 'openai',
      name: 'gpt-4-turbo',
      maxTokens: 128000,
      costPer1kTokens: 0.01,
      priority: 2,
      available: true,
    });

    // Claude models
    this.modelMetadata.set('claude-3-5-sonnet-20241022', {
      provider: 'claude',
      name: 'claude-3-5-sonnet-20241022',
      maxTokens: 200000,
      costPer1kTokens: 0.015,
      priority: 1,
      available: true,
    });

    // Mistral models
    this.modelMetadata.set('mistral-large-latest', {
      provider: 'mistral',
      name: 'mistral-large-latest',
      maxTokens: 32000,
      costPer1kTokens: 0.008,
      priority: 1,
      available: true,
    });
  }

  async route(request: OmegaAIRRequest): Promise<OmegaAIRResponse> {
    const mode = getOmegaAIRMode();

    try {
      switch (mode) {
        case 'auto':
          return await this.autoRoute(request);
        case 'fallback':
          return await this.fallbackManager.executeWithFallback(request);
        case 'priority':
          return await this.priorityRoute(request);
        default:
          return await this.autoRoute(request);
      }
    } catch (error) {
      console.error('OmegaAIR routing failed:', error);
      throw error;
    }
  }

  private async autoRoute(request: OmegaAIRRequest): Promise<OmegaAIRResponse> {
    // If specific model requested, try that first
    if (request.model) {
      const modelMeta = this.modelMetadata.get(request.model);
      if (modelMeta && this.fallbackManager.isProviderAvailable(modelMeta.provider as Provider)) {
        try {
          return await this.fallbackManager.executeWithFallback(request, { maxRetries: 1, backoffMultiplier: 1 });
        } catch (error) {
          console.warn(`Requested model ${request.model} failed, falling back to auto-selection`);
        }
      }
    }

    // Auto-select best available model
    return await this.fallbackManager.executeWithFallback(request);
  }

  private async priorityRoute(request: OmegaAIRRequest): Promise<OmegaAIRResponse> {
    const availableProviders = this.fallbackManager.getAvailableProviders();
    
    // Sort by priority (lower number = higher priority)
    const sortedProviders = availableProviders.sort((a, b) => {
      const aModels = Array.from(this.modelMetadata.values()).filter(m => m.provider === a);
      const bModels = Array.from(this.modelMetadata.values()).filter(m => m.provider === b);
      
      const aPriority = Math.min(...aModels.map(m => m.priority));
      const bPriority = Math.min(...bModels.map(m => m.priority));
      
      return aPriority - bPriority;
    });

    // Try providers in priority order
    for (const provider of sortedProviders) {
      try {
        return await this.fallbackManager.executeWithFallback(request, {
          maxRetries: 2,
          backoffMultiplier: 1.5,
          excludeProviders: availableProviders.filter(p => p !== provider)
        });
      } catch (error) {
        console.warn(`Priority provider ${provider} failed, trying next`);
        continue;
      }
    }

    throw new Error('All priority providers failed');
  }

  getModelMetadata(): ModelMeta[];
  getModelMetadata(model: string): ModelMeta | null;
  getModelMetadata(model?: string): ModelMeta | ModelMeta[] | null {
    if (model) {
      return this.modelMetadata.get(model) || null;
    }
    return Array.from(this.modelMetadata.values());
  }

  getAvailableProviders(): Provider[] {
    return this.fallbackManager.getAvailableProviders();
  }

  getSystemStatus() {
    const enabledModels = getEnabledModels();
    const availableProviders = this.fallbackManager.getAvailableProviders();
    
    return {
      mode: getOmegaAIRMode(),
      enabledModels,
      availableProviders,
      totalModels: this.modelMetadata.size,
      status: availableProviders.length > 0 ? 'operational' : 'offline'
    };
  }
}

// Singleton instance
export const omegaAIR = new OmegaAIRRouter();