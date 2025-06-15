import { Router } from "express";
import { db } from "../../../db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/admin/audit-logs - Fetch audit logs (supergod only)
router.get("/", async (req, res) => {
  try {
    // Auth check: Must be supergod
    if (!req.user || req.user.role !== "supergod") {
      return res.status(403).json({ message: "Supergod privileges required" });
    }

    // Query audit logs from database
    const logs = await db.execute(
      sql`SELECT * FROM omega_audit_log ORDER BY created_at DESC LIMIT 100`
    );

    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

export default router;