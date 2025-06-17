import express from "express";
import { getBestModel, sendAIRequest, getProviderStatuses, isAnyProviderAvailable } from "../../lib/ai/router";

const router = express.Router();

// Test endpoint to demonstrate OmegaAIR router utilities
router.post("/demo", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Demonstrate all OmegaAIR utilities
    const available = await isAnyProviderAvailable();
    if (!available) {
      return res.json({
        success: false,
        error: "No AI providers are currently available",
        providersChecked: await getProviderStatuses()
      });
    }

    const bestModel = await getBestModel();
    const response = await sendAIRequest(prompt);
    const statuses = await getProviderStatuses();

    res.json({
      success: true,
      result: {
        prompt,
        response: response.substring(0, 200) + (response.length > 200 ? "..." : ""),
        selectedProvider: bestModel,
        providerStatuses: statuses,
        systemAvailable: available,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("OmegaAIR demo failed:", error);
    res.status(500).json({
      success: false,
      error: "Router utilities test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test individual utility functions
router.get("/test-utilities", async (req, res) => {
  try {
    const results = {
      tests: []
    };

    // Test 1: Check availability
    try {
      const available = await isAnyProviderAvailable();
      results.tests.push({
        function: "isAnyProviderAvailable",
        success: true,
        result: available
      });
    } catch (error) {
      results.tests.push({
        function: "isAnyProviderAvailable",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Test 2: Get provider statuses
    try {
      const statuses = await getProviderStatuses();
      results.tests.push({
        function: "getProviderStatuses",
        success: true,
        result: statuses
      });
    } catch (error) {
      results.tests.push({
        function: "getProviderStatuses",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Test 3: Get best model
    try {
      const bestModel = await getBestModel();
      results.tests.push({
        function: "getBestModel",
        success: true,
        result: bestModel
      });
    } catch (error) {
      results.tests.push({
        function: "getBestModel",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Test 4: Send AI request
    try {
      const response = await sendAIRequest("Hello from OmegaAIR test suite");
      results.tests.push({
        function: "sendAIRequest",
        success: true,
        result: response.substring(0, 100) + "..."
      });
    } catch (error) {
      results.tests.push({
        function: "sendAIRequest",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    const successCount = results.tests.filter(t => t.success).length;
    results.summary = {
      totalTests: results.tests.length,
      passed: successCount,
      failed: results.tests.length - successCount,
      allPassed: successCount === results.tests.length
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: "Test suite failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { router as aiRouterTestRouter };