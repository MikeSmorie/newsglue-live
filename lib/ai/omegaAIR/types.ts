// 🧠 OmegaAIR Module: Core Types and Interfaces

export interface OmegaAIRRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: number;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

export interface OmegaAIRResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
  error?: string;
}

export interface ModelMeta {
  provider: string;
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  priority: number;
  available: boolean;
  latency?: number;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  models: string[];
  enabled: boolean;
}

export type Provider = 'openai' | 'claude' | 'mistral';

export interface FallbackOptions {
  maxRetries: number;
  backoffMultiplier: number;
  excludeProviders?: Provider[];
}