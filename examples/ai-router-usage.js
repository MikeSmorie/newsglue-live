// Example: How to use OmegaAIR router utilities in modules

import { getBestModel, sendAIRequest, getProviderStatuses, isAnyProviderAvailable } from '../lib/ai/router.js';

// Example 1: Simple AI request using best available model
async function generateContent(userPrompt) {
  try {
    const response = await sendAIRequest(userPrompt);
    console.log('AI Response:', response);
    return response;
  } catch (error) {
    console.error('AI generation failed:', error.message);
    throw error;
  }
}

// Example 2: Check system status before making requests
async function smartAIRequest(prompt) {
  // Check if any provider is available
  const available = await isAnyProviderAvailable();
  if (!available) {
    throw new Error('No AI providers are currently available');
  }

  // Get the best model that will be used
  const bestModel = await getBestModel();
  console.log(`Using ${bestModel} provider for this request`);

  // Send the request with custom options
  const response = await sendAIRequest(prompt, {
    temperature: 0.7,
    maxTokens: 500
  });

  return {
    provider: bestModel,
    response,
    timestamp: new Date().toISOString()
  };
}

// Example 3: Module with fallback handling
class ContentGeneratorModule {
  async generateBlogPost(topic, style = 'professional') {
    const prompt = `Write a ${style} blog post about: ${topic}`;
    
    try {
      const content = await sendAIRequest(prompt, {
        temperature: 0.8,
        maxTokens: 1000
      });
      
      return {
        success: true,
        content,
        generatedAt: new Date(),
        provider: await getBestModel()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallbackMessage: 'Content generation is temporarily unavailable'
      };
    }
  }

  async getSystemHealth() {
    const [available, statuses, bestModel] = await Promise.all([
      isAnyProviderAvailable(),
      getProviderStatuses(),
      getBestModel().catch(() => null)
    ]);

    return {
      operational: available,
      bestModel,
      providerStatuses: statuses,
      healthCheck: available ? 'All systems operational' : 'Service degraded'
    };
  }
}

// Example usage:
export async function demonstrateOmegaAIR() {
  console.log('=== OmegaAIR Router Demonstration ===');
  
  try {
    // Basic usage
    const response1 = await generateContent('Explain quantum computing');
    console.log('Basic generation successful');

    // Smart request with status checking
    const response2 = await smartAIRequest('Write a haiku about technology');
    console.log('Smart request result:', response2);

    // Module usage
    const contentModule = new ContentGeneratorModule();
    const blogPost = await contentModule.generateBlogPost('Artificial Intelligence', 'technical');
    console.log('Blog post generation:', blogPost.success ? 'Success' : 'Failed');

    // Health check
    const health = await contentModule.getSystemHealth();
    console.log('System health:', health);

    console.log('=== All examples completed successfully ===');
  } catch (error) {
    console.error('Demonstration failed:', error.message);
  }
}