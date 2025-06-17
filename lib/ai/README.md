# OmegaAIR Developer Utilities

## Overview
OmegaAIR provides developer-facing utilities that enable modules to access AI providers without handling routing, fallback, or configuration logic. The system automatically selects the best available provider based on configuration and handles failures gracefully.

## Core Functions

### `getBestModel(): Promise<ProviderName>`
Returns the highest-priority available AI provider based on current routing configuration.

```javascript
import { getBestModel } from '@/lib/ai/router';

const provider = await getBestModel();
console.log(`Using ${provider} for this request`);
```

### `sendAIRequest(prompt: string, options?: any): Promise<string>`
Sends a request to the best available AI provider with automatic fallback handling.

```javascript
import { sendAIRequest } from '@/lib/ai/router';

const response = await sendAIRequest('Explain quantum computing', {
  temperature: 0.7,
  maxTokens: 500
});
```

### `getProviderStatuses(): Promise<Record<ProviderName, ProviderStatus>>`
Returns the current status of all AI providers.

```javascript
import { getProviderStatuses } from '@/lib/ai/router';

const statuses = await getProviderStatuses();
// Returns: { claude: 'stub', openai: 'offline', mistral: 'stub' }
```

### `isAnyProviderAvailable(): Promise<boolean>`
Quick check to determine if any AI provider is currently available.

```javascript
import { isAnyProviderAvailable } from '@/lib/ai/router';

if (await isAnyProviderAvailable()) {
  // Safe to make AI requests
} else {
  // Handle unavailable state
}
```

## Provider Status Types

- **`online`**: Provider has valid API key and is fully operational
- **`offline`**: Provider is not available (no API key or configuration issue)
- **`stub`**: Provider returns test responses for development/testing

## Routing Configuration

The system respects routing preferences set through the AI Model Router interface:

1. **Priority Order**: Providers are tried in configured priority order (default: Claude → OpenAI → Mistral)
2. **Fallback Settings**: Individual provider fallback can be enabled/disabled
3. **Global Fallback**: System-wide fallback behavior control

## Error Handling

All functions throw descriptive errors when operations fail:

```javascript
try {
  const response = await sendAIRequest('Generate content');
} catch (error) {
  if (error.message === 'No available AI models found.') {
    // Handle no providers available
  } else {
    // Handle other errors
  }
}
```

## Module Integration Examples

### Basic Content Generation Module
```javascript
class ContentModule {
  async generateContent(prompt) {
    if (!(await isAnyProviderAvailable())) {
      throw new Error('AI services unavailable');
    }
    
    return await sendAIRequest(prompt);
  }
}
```

### Smart Request Handler
```javascript
async function smartGenerate(prompt, options = {}) {
  const provider = await getBestModel();
  console.log(`Using ${provider} provider`);
  
  const response = await sendAIRequest(prompt, {
    temperature: options.temperature || 0.7,
    maxTokens: options.maxTokens || 1000
  });
  
  return {
    content: response,
    provider,
    timestamp: new Date().toISOString()
  };
}
```

### Health Check Implementation
```javascript
async function getAISystemHealth() {
  const [available, statuses, bestModel] = await Promise.all([
    isAnyProviderAvailable(),
    getProviderStatuses(),
    getBestModel().catch(() => null)
  ]);

  return {
    operational: available,
    bestProvider: bestModel,
    providerStatuses: statuses
  };
}
```

## Configuration Integration

The router automatically reads configuration from the AI Model Router panel and respects:

- Provider priority order set by Supergod users
- Individual fallback enable/disable settings
- Global fallback mode configuration
- Real-time configuration updates without restart

## Best Practices

1. **Always check availability** before batch operations
2. **Handle errors gracefully** with meaningful fallback messages
3. **Use appropriate options** for temperature and token limits
4. **Log provider usage** for debugging and monitoring
5. **Implement retries** for critical operations when appropriate

## Development vs Production

- **Development**: Stub providers return test responses for consistent testing
- **Production**: Real API providers are used when keys are configured
- **Hybrid**: Mix of stub and real providers based on available configurations