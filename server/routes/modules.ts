import { Router, Response } from "express";
import { db } from "../../db";
import { modules } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "../middleware/rbac";
import { requireTier, TierRequest, getUserAccessibleModules, canUserAccessModule } from "../middleware/tierAccess";
import { logEvent } from "../../lib/logs";

// Simple auth check
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

export const modulesRouter = Router();

/**
 * Get all modules with user access information
 */
modulesRouter.get("/", requireAuth, async (req: TierRequest, res: Response) => {
  try {
    const allModules = await db.query.modules.findMany({
      where: eq(modules.isActive, true),
      orderBy: (modules, { asc }) => [asc(modules.id)]
    });

    const userTier = req.user!.subscriptionPlan;
    
    // Add access information for each module
    const modulesWithAccess = await Promise.all(
      allModules.map(async (module) => {
        const hasAccess = await canUserAccessModule(userTier, module.name);
        return {
          ...module,
          hasAccess,
          isLocked: !hasAccess
        };
      })
    );

    res.json({
      modules: modulesWithAccess,
      userTier,
      totalModules: allModules.length,
      accessibleModules: modulesWithAccess.filter(m => m.hasAccess).length
    });
  } catch (error: any) {
    console.error("Error fetching modules:", error);
    
    await logEvent("api_error", `Error fetching modules: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

/**
 * Get user's accessible modules only
 */
modulesRouter.get("/accessible", requireAuth, async (req: TierRequest, res: Response) => {
  try {
    const userTier = req.user!.subscriptionPlan;
    const accessibleModules = await getUserAccessibleModules(userTier);

    res.json({
      modules: accessibleModules,
      userTier,
      count: accessibleModules.length
    });
  } catch (error: any) {
    console.error("Error fetching accessible modules:", error);
    
    await logEvent("api_error", `Error fetching accessible modules: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to fetch accessible modules" });
  }
});

/**
 * Access a specific module (with tier check)
 */
modulesRouter.get("/:moduleName/access", requireAuth, async (req: TierRequest, res: Response) => {
  const { moduleName } = req.params;
  
  try {
    // Get module details
    const module = await db.query.modules.findFirst({
      where: eq(modules.name, moduleName)
    });

    if (!module) {
      return res.status(404).json({ 
        error: "Module not found",
        module: moduleName
      });
    }

    const userTier = req.user!.subscriptionPlan;
    const hasAccess = await canUserAccessModule(userTier, moduleName);

    if (!hasAccess) {
      await logEvent("user_action", `Module access denied: ${moduleName}`, {
        userId: req.user!.id,
        userRole: req.user!.role,
        endpoint: req.path,
        severity: "warning",
        metadata: { userTier, requiredTier: module.requiredTier }
      });

      return res.status(403).json({
        error: "Insufficient subscription tier",
        module: moduleName,
        userTier,
        requiredTier: module.requiredTier,
        upgradeRequired: true,
        redirectTo: `/locked-module?name=${encodeURIComponent(moduleName)}`
      });
    }

    await logEvent("user_action", `Module accessed: ${moduleName}`, {
      userId: req.user!.id,
      userRole: req.user!.role,
      endpoint: req.path,
      severity: "info",
      metadata: { userTier, requiredTier: module.requiredTier }
    });

    res.json({
      module,
      hasAccess: true,
      userTier,
      message: `Access granted to ${moduleName}`
    });
  } catch (error: any) {
    console.error("Error checking module access:", error);
    
    await logEvent("api_error", `Error checking module access: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to check module access" });
  }
});

/**
 * Execute a module (with tier protection)
 */
modulesRouter.post("/:moduleName/execute", requireAuth, requireTier("moduleName"), async (req: TierRequest, res: Response) => {
  const { moduleName } = req.params;
  const { input } = req.body;
  
  try {
    // Here you would integrate with your module execution system
    // For now, return a success response
    
    await logEvent("user_action", `Module executed: ${moduleName}`, {
      userId: req.user!.id,
      userRole: req.user!.role,
      endpoint: req.path,
      severity: "info",
      metadata: { moduleName, inputProvided: !!input }
    });

    res.json({
      success: true,
      module: moduleName,
      message: `Module ${moduleName} executed successfully`,
      output: `Processed input for ${moduleName}` // Replace with actual module execution
    });
  } catch (error: any) {
    console.error("Error executing module:", error);
    
    await logEvent("api_error", `Error executing module: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to execute module" });
  }
});

/**
 * Admin: Get all modules for management
 */
modulesRouter.get("/admin/all", requireAuth, requireRole(["supergod"]), async (req: TierRequest, res: Response) => {
  try {
    const allModules = await db.query.modules.findMany({
      orderBy: (modules, { asc }) => [asc(modules.id)]
    });

    res.json({
      modules: allModules,
      total: allModules.length
    });
  } catch (error: any) {
    console.error("Error fetching all modules:", error);
    
    await logEvent("api_error", `Error fetching all modules: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

/**
 * Admin: Update module tier requirements
 */
modulesRouter.patch("/admin/:moduleId/tier", requireAuth, requireRole(["supergod"]), async (req: TierRequest, res: Response) => {
  const { moduleId } = req.params;
  const { requiredTier } = req.body;

  if (!["free", "pro", "enterprise"].includes(requiredTier)) {
    return res.status(400).json({ 
      error: "Invalid tier. Must be: free, pro, or enterprise" 
    });
  }

  try {
    const [updatedModule] = await db
      .update(modules)
      .set({ 
        requiredTier,
        updatedAt: new Date()
      })
      .where(eq(modules.id, parseInt(moduleId)))
      .returning();

    if (!updatedModule) {
      return res.status(404).json({ error: "Module not found" });
    }

    await logEvent("user_action", `Module tier updated: ${updatedModule.name}`, {
      userId: req.user!.id,
      userRole: req.user!.role,
      endpoint: req.path,
      severity: "info",
      metadata: { 
        moduleId: updatedModule.id,
        moduleName: updatedModule.name,
        newTier: requiredTier 
      }
    });

    res.json({
      success: true,
      module: updatedModule,
      message: `Module ${updatedModule.name} tier updated to ${requiredTier}`
    });
  } catch (error: any) {
    console.error("Error updating module tier:", error);
    
    await logEvent("api_error", `Error updating module tier: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to update module tier" });
  }
});

/**
 * Admin: Create new module
 */
modulesRouter.post("/admin/create", requireAuth, requireRole(["supergod"]), async (req: TierRequest, res: Response) => {
  const { name, description, requiredTier = "free" } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  if (!["free", "pro", "enterprise"].includes(requiredTier)) {
    return res.status(400).json({ 
      error: "Invalid tier. Must be: free, pro, or enterprise" 
    });
  }

  try {
    const [newModule] = await db
      .insert(modules)
      .values({
        name,
        description,
        requiredTier,
        isActive: true
      })
      .returning();

    await logEvent("user_action", `New module created: ${name}`, {
      userId: req.user!.id,
      userRole: req.user!.role,
      endpoint: req.path,
      severity: "info",
      metadata: { 
        moduleId: newModule.id,
        moduleName: name,
        requiredTier 
      }
    });

    res.status(201).json({
      success: true,
      module: newModule,
      message: `Module ${name} created successfully`
    });
  } catch (error: any) {
    console.error("Error creating module:", error);
    
    if (error.code === "23505") { // Unique constraint violation
      return res.status(409).json({ 
        error: "Module name already exists" 
      });
    }
    
    await logEvent("api_error", `Error creating module: ${error.message}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      severity: "error",
      stackTrace: error.stack
    });

    res.status(500).json({ error: "Failed to create module" });
  }
});