import express from "express";
import axios from "axios";
import { db } from "@db";
import { activityLogs } from "@db/schema";

const router = express.Router();

// Handle module suggestions
router.post("/suggest-modules", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-3.5-turbo",
      messages: [{ 
        role: "user", 
        content: `Suggest a module workflow for app: ${description}. Return as JSON with names and purposes.` 
      }],
      max_tokens: 100,
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const suggestions = response.data.choices[0].message.content;
    console.log("[DEBUG] AI Suggestions:", suggestions);

    // Log activity
    await db.insert(activityLogs).values({
      action: "ai_module_suggestion",
      userId: req.user?.id || 0,
      details: description,
      timestamp: new Date()
    });

    res.json(JSON.parse(suggestions));
  } catch (error) {
    console.error("[ERROR] AI suggestion failed:", error);
    res.status(500).json({ error: "AI suggestion failed" });
  }
});

export default router;