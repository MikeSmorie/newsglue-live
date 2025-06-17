import express from "express";
import { runAIProvider, runWithFallback } from "../../lib/ai/multiplexer";

const router = express.Router();

// Get provider statuses
router.get("/status", async (req, res) => {
  try {
    const statuses = [
      {
        name: 'openai',
        isOnline: !!process.env.OPENAI_API_KEY,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
      },
      {
        name: 'claude',
        isOnline: false, // Stubbed - will be true when API key provided
        hasApiKey: !!process.env.CLAUDE_API_KEY,
        models: ['claude-3-5-sonnet', 'claude-3-haiku']
      },
      {
        name: 'mistral',
        isOnline: false, // Stubbed - will be true when API key provided
        hasApiKey: !!process.env.MISTRAL_API_KEY,
        models: ['mistral-large', 'mistral-medium']
      }
    ];
    res.json(statuses);
  } catch (error) {
    console.error("Failed to get provider statuses:", error);
    res.status(500).json({ error: "Failed to get provider statuses" });
  }
});

// Test a specific provider
router.post("/test/:provider", async (req, res) => {
  try {
    const { provider } = req.params;
    const { input, model } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input is required" });
    }

    const result = await runAIProvider(provider, input, model);
    res.json(result);
  } catch (error) {
    console.error(`Failed to test provider ${req.params.provider}:`, error);
    res.status(500).json({ error: "Failed to test provider" });
  }
});

// Run AI with fallback
router.post("/generate", async (req, res) => {
  try {
    const { input, preferredProvider, preferredModel } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input is required" });
    }

    const result = await runWithFallback(input, preferredProvider, preferredModel);
    res.json(result);
  } catch (error) {
    console.error("Failed to generate AI response:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

export { router as aiProvidersRouter };