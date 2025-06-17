# OmegaAIR AI Multiplexer System

## Overview
OmegaAIR is a comprehensive AI provider multiplexer system that enables seamless switching between multiple AI providers (OpenAI, Claude, Mistral) with intelligent fallback mechanisms.

## Architecture

### Core Components

1. **Router** (`router.ts`) - Main entry point that routes requests to appropriate providers
2. **Providers** (`providers.ts`) - Individual AI provider implementations
3. **Config** (`config.ts`) - Environment-based configuration management
4. **Fallback** (`fallback.ts`) - Retry and fallback logic for provider failures
5. **Types** (`types.ts`) - TypeScript interfaces and type definitions

### Provider Status
- **OpenAI**: Configured when `OPENAI_API_KEY` is provided
- **Claude**: Stub implementation (offline mode) - returns test responses
- **Mistral**: Stub implementation (offline mode) - returns test responses

## Configuration

### Environment Variables
```env
OMEGAAIR_MODE=auto
AI_PROVIDERS=openai,claude,mistral
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key (optional)
MISTRAL_API_KEY=your_mistral_key (optional)
```

### Operating Modes
- `auto`: Intelligent provider selection with fallback
- `fallback`: Sequential provider retry
- `priority`: Provider selection based on priority ranking

## API Endpoints

### Provider Status
```http
GET /api/ai/providers/status
```
Returns current status of all configured providers.

### Test Provider
```http
POST /api/ai/providers/test/:provider
Content-Type: application/json

{
  "input": "Your test prompt",
  "model": "optional-model-name"
}
```

### Generate with Fallback
```http
POST /api/ai/providers/generate
Content-Type: application/json

{
  "input": "Your prompt",
  "preferredProvider": "openai",
  "preferredModel": "gpt-4o"
}
```

## Usage Example

```typescript
import { omegaAIR } from './lib/ai/omegaAIR/router';

// Basic usage
const response = await omegaAIR.route({
  prompt: "Hello, world!",
  temperature: 0.7,
  maxTokens: 1000
});

// With specific provider preference
const response = await omegaAIR.route({
  prompt: "Analyze this data",
  model: "gpt-4o",
  systemPrompt: "You are a data analyst"
});
```

## Stub Provider Behavior

When API keys are not configured, providers return structured stub responses:

### Claude Stub Response
```json
{
  "success": true,
  "provider": "claude",
  "model": "claude-3-sonnet",
  "output": "Claude is currently offline. This is a stubbed response for input: [input]",
  "tokensUsed": 42
}
```

### Mistral Stub Response
```json
{
  "success": true,
  "provider": "mistral",
  "model": "mistral-medium",
  "output": "Mistral is currently offline. This is a stubbed response for input: [input]",
  "tokensUsed": 37
}
```

## Admin Interface

The system includes a comprehensive admin dashboard with:

1. **Provider Management**: Switch between providers and view their status
2. **Testing Interface**: Test individual providers or the fallback system
3. **System Monitoring**: Real-time status and configuration monitoring

## Future Enhancements

When API keys are provided:
- Real API integration will automatically replace stub responses
- Full model selection and parameter control
- Usage analytics and cost tracking
- Performance monitoring and optimization

## Integration

The OmegaAIR system integrates seamlessly with existing AI infrastructure:
- Compatible with current AI assistant implementations
- Maintains existing API contracts
- Provides enhanced reliability through fallback mechanisms
- Supports gradual migration from single-provider setups