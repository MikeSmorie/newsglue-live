// Content Generator Module - Refactored to use OmegaAIR
import { sendAIRequest, isAnyProviderAvailable, getBestModel } from "../../lib/ai/router";

export async function generateContent(prompt: string): Promise<string> {
  try {
    const result = await sendAIRequest(prompt, {
      temperature: 0.7,
      maxTokens: 1024,
    });
    return result;
  } catch (err) {
    console.error("AI generation failed:", err);
    return "⚠️ Error generating content. Please try again.";
  }
}

export async function generateBlogPost(topic: string, style: string = 'professional'): Promise<{
  success: boolean;
  content?: string;
  provider?: string;
  error?: string;
}> {
  try {
    if (!(await isAnyProviderAvailable())) {
      return {
        success: false,
        error: "AI services are temporarily unavailable"
      };
    }

    const prompt = `Write a ${style} blog post about: ${topic}. Include an engaging introduction, main content sections, and a conclusion.`;
    
    const provider = await getBestModel();
    const content = await sendAIRequest(prompt, {
      temperature: 0.8,
      maxTokens: 2000
    });

    return {
      success: true,
      content,
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}