import express from "express";
import { db } from "@db";
import { features, planFeatures, insertFeatureSchema, insertPlanFeatureSchema } from "@db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

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

// Assign feature to a plan
router.post("/assign", async (req, res) => {
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
router.get("/plan/:planId", async (req, res) => {
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
router.patch("/toggle", async (req, res) => {
  try {
    const { planId, featureId, enabled } = req.body;
    const [updated] = await db
      .update(planFeatures)
      .set({ enabled })
      .where(
        eq(planFeatures.planId, planId),
        eq(planFeatures.featureId, featureId)
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
