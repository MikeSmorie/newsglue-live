import express from "express";
import { getProviderStatuses, runAIProvider, runWithFallback } from "../../lib/ai/multiplexer";

const router = express.Router();

// Get provider statuses
router.get("/status", async (req, res) => {
  try {
    const statuses = getProviderStatuses();
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