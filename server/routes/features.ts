import express from "express";
import { db } from "@db";
import { features, planFeatures, userSubscriptions, insertFeatureSchema, insertPlanFeatureSchema } from "@db/schema";
import { eq, and } from "drizzle-orm";

const router = express.Router();

// Public route: Check if a feature is enabled for a user
router.get("/:featureId", async (req, res) => {
  try {
    const { featureId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get user's subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      with: {
        plan: {
          with: {
            planFeatures: {
              where: eq(planFeatures.featureId, parseInt(featureId))
            }
          }
        }
      }
    });

    if (!subscription) {
      return res.json({ isEnabled: false });
    }

    // Check custom overrides first
    const customFeatures = subscription.customFeatures ?
      JSON.parse(subscription.customFeatures) : [];

    if (customFeatures.includes(parseInt(featureId))) {
      return res.json({ isEnabled: true });
    }

    // Check plan features
    const planFeature = subscription.plan?.planFeatures[0];
    const isEnabled = planFeature?.enabled ?? false;

    res.json({ isEnabled });
  } catch (error) {
    console.error("Feature check error:", error);
    res.status(500).json({ message: "Error checking feature access" });
  }
});

// Admin routes: Feature management

// Get all available features
router.get("/", async (_req, res) => {
  try {
    const allFeatures = await db.query.features.findMany({
      orderBy: features.category
    });
    res.json(allFeatures);
  } catch (error) {
    res.status(500).json({ message: "Error fetching features" });
  }
});

// Get feature assignments (plan-feature relationships)
router.get("/assignments", async (_req, res) => {
  try {
    const assignments = await db.query.planFeatures.findMany({
      with: {
        plan: true,
        feature: true
      }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching feature assignments" });
  }
});

// Create a new feature
router.post("/", async (req, res) => {
  try {
    const featureData = insertFeatureSchema.parse(req.body);
    const [feature] = await db.insert(features)
      .values(featureData)
      .returning();

    res.json(feature);
  } catch (error) {
    res.status(400).json({
      message: "Error creating feature",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin: Override features for a specific user
router.post("/admin/override", async (req, res) => {
  try {
    const { userId, featureId, enabled } = req.body;

    // Get user's subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId)
    });

    if (!subscription) {
      return res.status(404).json({ message: "User subscription not found" });
    }

    // Parse existing custom features or initialize empty array
    const customFeatures = subscription.customFeatures ?
      JSON.parse(subscription.customFeatures) : [];

    // Update custom features
    const updatedFeatures = enabled ?
      Array.from(new Set([...customFeatures, featureId])) :
      customFeatures.filter((id: number) => id !== featureId);

    // Update subscription with new custom features
    await db
      .update(userSubscriptions)
      .set({
        customFeatures: JSON.stringify(updatedFeatures),
      })
      .where(eq(userSubscriptions.userId, userId));

    res.json({
      message: `Feature ${enabled ? 'enabled' : 'disabled'} for user`,
      customFeatures: updatedFeatures
    });
  } catch (error) {
    res.status(400).json({
      message: "Error updating user features",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user's custom features
router.get("/admin/user-features/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, parseInt(userId))
    });

    const customFeatures = subscription?.customFeatures ?
      JSON.parse(subscription.customFeatures) : [];

    res.json({ customFeatures });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user features" });
  }
});

// Assign feature to a plan
router.post("/admin/assign", async (req, res) => {
  try {
    const assignmentData = insertPlanFeatureSchema.parse(req.body);
    const [planFeature] = await db.insert(planFeatures)
      .values(assignmentData)
      .returning();

    res.json(planFeature);
  } catch (error) {
    res.status(400).json({
      message: "Error assigning feature to plan",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all features for a specific plan
router.get("/admin/plan/:planId", async (req, res) => {
  try {
    const { planId } = req.params;
    const planFeaturesList = await db.query.planFeatures.findMany({
      where: eq(planFeatures.planId, parseInt(planId)),
      with: {
        feature: true
      }
    });

    res.json(planFeaturesList);
  } catch (error) {
    res.status(500).json({ message: "Error fetching plan features" });
  }
});

// Toggle feature status for a plan
router.patch("/admin/toggle", async (req, res) => {
  try {
    const { planId, featureId, enabled } = req.body;
    const [updated] = await db
      .update(planFeatures)
      .set({ enabled })
      .where(
        and(
          eq(planFeatures.planId, planId),
          eq(planFeatures.featureId, featureId)
        )
      )
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Error toggling feature status",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;