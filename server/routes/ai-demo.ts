import express from "express";
import { getBestModel, sendAIRequest, getProviderStatuses, isAnyProviderAvailable } from "../../lib/ai/router";

const router = express.Router();

// Demo endpoint showing how modules can use OmegaAIR utilities
router.post("/generate", async (req, res) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Check if any provider is available
    const available = await isAnyProviderAvailable();
    if (!available) {
      return res.status(503).json({ error: "No AI providers available" });
    }

    // Get the best model and generate response
    const bestModel = await getBestModel();
    const response = await sendAIRequest(prompt, options);

    res.json({
      success: true,
      bestModel,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("AI demo generation failed:", error);
    res.status(500).json({ 
      error: "AI generation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get current system status
router.get("/status", async (req, res) => {
  try {
    const [bestModel, providerStatuses, anyAvailable] = await Promise.all([
      getBestModel().catch(() => null),
      getProviderStatuses(),
      isAnyProviderAvailable()
    ]);

    res.json({
      bestModel,
      providerStatuses,
      anyAvailable,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to get AI demo status:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

// Simple health check for the AI router
router.get("/health", async (req, res) => {
  try {
    const available = await isAnyProviderAvailable();
    res.json({
      healthy: available,
      message: available ? "AI router is operational" : "No AI providers available"
    });
  } catch (error) {
    res.status(500).json({
      healthy: false,
      message: "AI router health check failed"
    });
  }
});

export { router as aiDemoRouter };