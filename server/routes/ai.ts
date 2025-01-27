import express from "express";
import { aiAssistant } from "../ai_assistant/service";
import { AIQuerySchema } from "../ai_assistant/types";

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
    res.status(400).json({ 
      message: "Error processing AI query",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
