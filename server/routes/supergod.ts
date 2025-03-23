import { Express } from "express";
import { requireSupergod } from "../middleware/rbac";
import { db } from "@db";
import { users, errorLogs, activityLogs } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerSupergodRoutes(app: Express) {
  // Get supergod panel status with sensitive system info
  app.get("/api/supergod/system-status", requireSupergod(), async (req, res) => {
    try {
      // Only supergod users can access this endpoint due to the middleware

      // Gather sensitive system information
      const users_count = await db.select().from(users);
      const errorLogs_count = await db.select().from(errorLogs);
      const activityLogs_count = await db.select().from(activityLogs);
      
      const userCount = users_count.length;
      const errorLogsCount = errorLogs_count.length;
      const activityLogsCount = activityLogs_count.length;

      // Return comprehensive system data
      res.json({
        status: "Super-God Mode Activated",
        system: {
          users: {
            count: userCount,
            note: "Full access to all user data available"
          },
          logs: {
            errors: errorLogsCount,
            activities: activityLogsCount
          },
          security: {
            backdoor: "Enabled",
            bypassAuth: "Available",
            godCommands: "Unlocked"
          },
          lastChecked: new Date().toISOString()
        },
        message: "👑 Super-God privileges confirmed"
      });
    } catch (error: any) {
      console.error("[ERROR] Super-God system status error:", error);
      res.status(500).json({
        message: "Failed to retrieve Super-God system status",
        error: error.message
      });
    }
  });

  // Execute elevated privilege command (with confirmation)
  app.post("/api/supergod/execute", requireSupergod(), async (req, res) => {
    try {
      const { command, confirmation } = req.body;

      // Require a specific confirmation code for safety
      if (confirmation !== "I_UNDERSTAND_THE_POWER_OF_SUPERGOD") {
        return res.status(403).json({
          message: "Super-God command execution requires explicit confirmation"
        });
      }

      // Log the command for security auditing
      console.log(`[CRITICAL] Super-God command executed: ${command}`);

      // Mock execution response (in a real system, this would perform privileged operations)
      res.json({
        message: "Super-God command executed successfully",
        command,
        executedAt: new Date().toISOString(),
        executedBy: req.user?.username
      });
    } catch (error: any) {
      console.error("[ERROR] Super-God command execution error:", error);
      res.status(500).json({
        message: "Failed to execute Super-God command",
        error: error.message
      });
    }
  });

  // Get detailed list of system users (privileged info)
  app.get("/api/supergod/users", requireSupergod(), async (req, res) => {
    try {
      const allUsers = await db.select().from(users);

      // Filter out sensitive fields like password hashes
      const safeUsers = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }));

      res.json({
        users: safeUsers,
        count: safeUsers.length,
        supergodAccess: true
      });
    } catch (error: any) {
      console.error("[ERROR] Super-God users retrieval error:", error);
      res.status(500).json({
        message: "Failed to retrieve user data",
        error: error.message
      });
    }
  });
}