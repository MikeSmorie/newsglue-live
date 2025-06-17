import express from "express";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const router = express.Router();

// Ensure config directory exists
const configDir = join(process.cwd(), "server", "config");
const configFile = join(configDir, "ai-routing.json");

if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true });
}

// Default configuration
const defaultConfig = {
  models: [
    {
      id: "claude",
      name: "Claude",
      provider: "claude",
      status: "stub",
      priority: 1,
      fallbackEnabled: true,
      hasApiKey: false,
      models: ["claude-3-5-sonnet", "claude-3-haiku"]
    },
    {
      id: "openai",
      name: "OpenAI",
      provider: "openai",
      status: "offline",
      priority: 2,
      fallbackEnabled: true,
      hasApiKey: false,
      models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]
    },
    {
      id: "mistral",
      name: "Mistral",
      provider: "mistral",
      status: "stub",
      priority: 3,
      fallbackEnabled: true,
      hasApiKey: false,
      models: ["mistral-large", "mistral-medium"]
    }
  ],
  globalFallback: true,
  lastUpdated: new Date().toISOString()
};

// Get routing configuration
router.get("/config", async (req, res) => {
  try {
    if (existsSync(configFile)) {
      const configData = readFileSync(configFile, "utf8");
      const config = JSON.parse(configData);
      res.json(config);
    } else {
      res.json(defaultConfig);
    }
  } catch (error) {
    console.error("Failed to read AI routing config:", error);
    res.status(500).json({ error: "Failed to read configuration" });
  }
});

// Save routing configuration
router.post("/config", async (req, res) => {
  try {
    const config = req.body;
    
    // Validate configuration structure
    if (!config.models || !Array.isArray(config.models)) {
      return res.status(400).json({ error: "Invalid configuration format" });
    }

    // Update timestamp
    config.lastUpdated = new Date().toISOString();

    // Write to file
    writeFileSync(configFile, JSON.stringify(config, null, 2));

    res.json({ message: "Configuration saved successfully" });
  } catch (error) {
    console.error("Failed to save AI routing config:", error);
    res.status(500).json({ error: "Failed to save configuration" });
  }
});

// Get current routing preferences for multiplexer
router.get("/preferences", async (req, res) => {
  try {
    let config = defaultConfig;
    
    if (existsSync(configFile)) {
      const configData = readFileSync(configFile, "utf8");
      config = JSON.parse(configData);
    }

    // Extract routing preferences
    const preferences = {
      priority: config.models
        .sort((a, b) => a.priority - b.priority)
        .map(model => model.provider),
      fallbackEnabled: config.globalFallback,
      modelSettings: config.models.reduce((acc, model) => {
        acc[model.provider] = {
          enabled: model.fallbackEnabled,
          priority: model.priority
        };
        return acc;
      }, {} as Record<string, any>)
    };

    res.json(preferences);
  } catch (error) {
    console.error("Failed to get routing preferences:", error);
    res.status(500).json({ error: "Failed to get preferences" });
  }
});

export { router as aiRoutingRouter };