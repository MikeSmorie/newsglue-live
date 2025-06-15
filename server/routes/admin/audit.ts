import { Router } from "express";
import { db } from "../../../db";
import { sql } from "drizzle-orm";
import { generateAuditPdf } from "../../utils/pdf";

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

// GET /api/admin/audit-logs/pdf - Export audit logs as PDF (supergod only)
router.get("/pdf", async (req, res) => {
  try {
    // Auth check: Must be supergod
    if (!req.user || req.user.role !== "supergod") {
      return res.status(403).json({ message: "Supergod privileges required" });
    }

    // Query audit logs from database
    const logs = await db.execute(
      sql`SELECT * FROM omega_audit_log ORDER BY created_at DESC LIMIT 100`
    );

    // Transform logs to match expected format  
    const formattedLogs = (logs as any).map((log: any) => ({
      id: log.id,
      timestamp: log.created_at,
      actor: log.actor,
      action: log.action,
      target: log.target,
      data: log.data,
      ipAddress: log.ip_address
    }));

    const pdfBuffer = await generateAuditPdf(formattedLogs);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=omega-audit-logs.pdf");
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error generating audit PDF:", error);
    res.status(500).json({ message: "Failed to generate audit logs PDF" });
  }
});

export default router;