import express from "express";
import { OpenAI } from "openai";
import { db } from "@db";
import { errorLogs, activityLogs } from "@db/schema";
import { sql } from "drizzle-orm";

const router = express.Router();
const openai = new OpenAI();

// Middleware to check if user can access admin-level AI
const canAccessAdminAI = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Admin access required for admin AI features" });
};

// Handle module suggestions
router.post("/suggest-modules", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that suggests module names for a modular application. Return exactly 10 short, clear module names based on the app description."
        },
        {
          role: "user",
          content: `Suggest 10 module names for this app: ${description}`
        }
      ],
      max_tokens: 150
    });

    const suggestions = response.choices[0]?.message?.content
      ?.split('\n')
      .filter(line => line.trim())
      .slice(0, 10) || [];

    // Log activity
    await db.insert(activityLogs).values({
      action: "ai_module_suggestion",
      userId: req.user?.id || 0,
      details: description,
      timestamp: new Date()
    });

    res.json({ suggestions });
  } catch (error) {
    console.error("AI module suggestion error:", error);

    // Log error
    await db.insert(errorLogs).values({
      message: error instanceof Error ? error.message : "Unknown error",
      source: "AI Module Suggestion",
      stackTrace: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      userId: req.user?.id || 0
    });

    res.status(500).json({ 
      error: "Failed to get module suggestions",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Handle AI queries
router.post("/query", async (req, res) => {
  try {
    const { query, type = "user" } = req.body;

    // Check permissions for admin queries
    if (type === "admin" && (!req.isAuthenticated() || req.user.role !== "admin")) {
      return res.status(403).json({ message: "Admin access required for admin-level queries" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: query }],
      max_tokens: 150
    });

    res.json({ response: response.choices[0]?.message?.content });
  } catch (error) {
    console.error("AI query error:", error);

    // Log error
    await db.insert(errorLogs).values({
      message: error instanceof Error ? error.message : "Unknown error",
      source: "AI Query",
      stackTrace: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      userId: req.user?.id || 0
    });

    res.status(500).json({ error: "Failed to process AI query" });
  }
});

// Get AI interaction history (admin only)
router.get("/history", canAccessAdminAI, async (req, res) => {
  try {
    const interactions = await db.select()
      .from(activityLogs)
      .where(sql`${activityLogs.action} ILIKE 'ai_%'`)
      .orderBy(activityLogs.timestamp)
      .limit(50);

    res.json(interactions);
  } catch (error) {
    console.error("AI history error:", error);
    res.status(500).json({ message: "Error fetching AI interaction history" });
  }
});

export default router;