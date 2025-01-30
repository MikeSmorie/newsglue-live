import express from "express";
import { db } from "@db";
import { errorLogs } from "@db/schema";
import { desc, asc } from "drizzle-orm";

const router = express.Router();

// Middleware to ensure admin access
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  res.status(403).json({ message: "Not authorized" });
};

router.use(requireAdmin);

// Get all logs
router.get("/logs", async (req, res) => {
  try {
    const logs = await db.query.errorLogs.findMany({
      orderBy: [desc(errorLogs.timestamp)],
      limit: 1000, // Limit to latest 1000 logs for performance
    });

    res.json(logs);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    res.status(500).send("Failed to fetch logs");
  }
});

// Clear all logs
router.post("/logs/clear", async (req, res) => {
  try {
    await db.delete(errorLogs);
    res.json({ message: "All logs cleared successfully" });
  } catch (error) {
    console.error("Failed to clear logs:", error);
    res.status(500).send("Failed to clear logs");
  }
});

export default router;
