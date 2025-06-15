import { Router } from "express";
import { db } from "../../db";
import { omegaLogs } from "../../db/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { requireSupergod } from "../middleware/rbac";

const router = Router();

/**
 * GET /admin/logs - Retrieve system logs (Supergod only)
 */
router.get("/", requireSupergod(), async (req, res) => {
  try {
    const { 
      limit = "100", 
      severity, 
      eventType, 
      userId,
      hours = "24" 
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);
    const hoursNum = parseInt(hours as string) || 24;
    
    // Build where conditions
    let whereConditions: any[] = [];
    
    // Filter by time range
    const timeThreshold = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
    whereConditions.push(gte(omegaLogs.timestamp, timeThreshold));
    
    // Filter by severity
    if (severity && ["info", "warning", "error"].includes(severity as string)) {
      const severityFilter = (logs: any[]) => logs.filter(log => log.severity === severity);
      // Will apply after fetching
    }
    
    // Filter by event type
    if (eventType) {
      const eventTypeFilter = (logs: any[]) => logs.filter(log => log.eventType === eventType);
      // Will apply after fetching
    }
    
    // Filter by user ID
    if (userId) {
      whereConditions.push(eq(omegaLogs.userId, parseInt(userId as string)));
    }

    const logs = await db.query.omegaLogs.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(omegaLogs.timestamp),
      limit: limitNum,
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    // Format logs for frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.user ? {
        id: log.user.id,
        username: log.user.username,
        role: log.user.role
      } : null,
      userRole: log.userRole,
      endpoint: log.endpoint,
      eventType: log.eventType,
      severity: log.severity,
      message: log.message,
      stackTrace: log.stackTrace,
      metadata: log.metadata
    }));

    res.json({
      logs: formattedLogs,
      total: logs.length,
      filters: {
        limit: limitNum,
        severity,
        eventType,
        userId,
        hours: hoursNum
      }
    });

  } catch (error: any) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ 
      message: "Failed to fetch logs",
      error: error.message 
    });
  }
});

/**
 * GET /admin/logs/stats - Get log statistics (Supergod only)
 */
router.get("/stats", requireSupergod(), async (req, res) => {
  try {
    const { hours = "24" } = req.query;
    const hoursNum = parseInt(hours as string) || 24;
    const timeThreshold = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

    // Get all logs for time range and compute counts
    const allLogs = await db.query.omegaLogs.findMany({
      where: gte(omegaLogs.timestamp, timeThreshold),
      columns: {
        severity: true,
        eventType: true
      }
    });

    // Compute counts manually
    const severityCounts = allLogs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventTypeCounts = allLogs.reduce((acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      timeRange: `${hoursNum} hours`,
      severityCounts,
      eventTypeCounts
    });

  } catch (error: any) {
    console.error("Error fetching log stats:", error);
    res.status(500).json({ 
      message: "Failed to fetch log statistics",
      error: error.message 
    });
  }
});

export default router;