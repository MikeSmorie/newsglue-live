// Data Analyzer Module - Refactored to use OmegaAIR
import { sendAIRequest, isAnyProviderAvailable } from "../../lib/ai/router";

export async function analyzeData(dataDescription: string, analysisType: string = 'summary'): Promise<{
  success: boolean;
  analysis?: string;
  insights?: string[];
  error?: string;
}> {
  try {
    if (!(await isAnyProviderAvailable())) {
      return {
        success: false,
        error: "AI analysis services are currently unavailable"
      };
    }

    const prompt = `Analyze the following data: ${dataDescription}. 
    Provide a ${analysisType} analysis including key insights, trends, and recommendations.
    Format the response with clear sections for findings and actionable insights.`;

    const analysis = await sendAIRequest(prompt, {
      temperature: 0.3,
      maxTokens: 1500
    });

    const insightsMatch = analysis.match(/insights?:(.*?)(?=recommendations?:|$)/is);
    const insights = insightsMatch 
      ? insightsMatch[1].split('\n').filter(line => line.trim()).slice(0, 5)
      : [];

    return {
      success: true,
      analysis,
      insights
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed"
    };
  }
}