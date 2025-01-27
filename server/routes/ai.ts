import express from "express";
import { aiAssistant } from "../ai_assistant/service";
import { AIQuerySchema } from "../ai_assistant/types";
import { db } from "@db";
import { errorLogs } from "@db/schema";

const router = express.Router();

// Middleware to check if user can access admin-level AI
const canAccessAdminAI = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Admin access required for God Mode AI" });
};

// Handle AI queries
router.post("/query", async (req, res) => {
  try {
    const queryData = AIQuerySchema.parse(req.body);

    // Check permissions for admin queries
    if (queryData.type === "admin" && (!req.isAuthenticated() || req.user.role !== "admin")) {
      return res.status(403).json({ message: "Admin access required for God Mode AI" });
    }

    const response = await aiAssistant.processQuery({
      ...queryData,
      userId: req.user?.id || 0
    });

    res.json(response);
  } catch (error) {
    // Log the error
    await db.insert(errorLogs).values({
      errorMessage: error instanceof Error ? error.message : "Unknown error in AI route",
      location: "AI Query Endpoint",
      stackTrace: error instanceof Error ? error.stack : undefined,
      timestamp: new Date()
    });

    res.status(400).json({ 
      message: "Error processing AI query",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get AI interaction history (admin only)
router.get("/history", canAccessAdminAI, async (req, res) => {
  try {
    const interactions = await db.query.activityLogs.findMany({
      where: (logs) => logs.action.like("ai_%"),
      orderBy: (logs) => logs.timestamp,
      limit: 50
    });

    res.json(interactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching AI interaction history" });
  }
});

export default router;