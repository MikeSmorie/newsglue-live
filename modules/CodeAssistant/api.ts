// Code Assistant Module - Refactored to use OmegaAIR
import { sendAIRequest, getBestModel, isAnyProviderAvailable } from "../../lib/ai/router";

export async function reviewCode(code: string, language: string): Promise<{
  success: boolean;
  review?: string;
  suggestions?: string[];
  securityIssues?: string[];
  provider?: string;
  error?: string;
}> {
  try {
    if (!(await isAnyProviderAvailable())) {
      return {
        success: false,
        error: "Code review services are temporarily unavailable"
      };
    }

    const prompt = `Review this ${language} code for:
    - Code quality and best practices
    - Potential bugs or issues
    - Security vulnerabilities
    - Performance optimizations

    Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Provide structured feedback with specific recommendations.`;

    const provider = await getBestModel();
    const review = await sendAIRequest(prompt, {
      temperature: 0.2,
      maxTokens: 1500
    });

    const suggestions = review.match(/suggestion[s]?:(.*?)(?=security|$)/is)?.[1]
      ?.split('\n').filter(line => line.trim()).slice(0, 5) || [];
    
    const securityIssues = review.match(/security[^:]*:(.*?)(?=performance|recommendations|$)/is)?.[1]
      ?.split('\n').filter(line => line.trim()).slice(0, 3) || [];

    return {
      success: true,
      review,
      suggestions,
      securityIssues,
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Code review failed"
    };
  }
}