// 🧠 OmegaAIR Module: Individual Model Handlers

import type { OmegaAIRRequest, OmegaAIRResponse, ProviderConfig } from './types';
import { getProviderConfig } from './config';

export class OpenAIProvider {
  private config: ProviderConfig;

  constructor() {
    const config = getProviderConfig('openai');
    if (!config) throw new Error('OpenAI configuration not available');
    this.config = config;
  }

  async generateResponse(request: OmegaAIRRequest): Promise<OmegaAIRResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4o',
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      provider: 'openai',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      metadata: request.metadata,
    };
  }
}

export class ClaudeProvider {
  private config: ProviderConfig;

  constructor() {
    const config = getProviderConfig('claude');
    if (!config) throw new Error('Claude configuration not available');
    this.config = config;
  }

  async generateResponse(request: OmegaAIRRequest): Promise<OmegaAIRResponse> {
    const response = await fetch(`${this.config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        system: request.systemPrompt,
        messages: [
          { role: 'user', content: request.prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      model: data.model,
      provider: 'claude',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      metadata: request.metadata,
    };
  }
}

export class MistralProvider {
  private config: ProviderConfig;

  constructor() {
    const config = getProviderConfig('mistral');
    if (!config) throw new Error('Mistral configuration not available');
    this.config = config;
  }

  async generateResponse(request: OmegaAIRRequest): Promise<OmegaAIRResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || 'mistral-large-latest',
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      provider: 'mistral',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      metadata: request.metadata,
    };
  }
}