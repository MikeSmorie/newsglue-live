import express from "express";
import { db } from "@db";
import { 
  subscriptionPlans, 
  userSubscriptions, 
  transactions,
  paymentProviders,
  insertSubscriptionPlanSchema,
  insertUserSubscriptionSchema,
  insertTransactionSchema
} from "@db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get all subscription plans
router.get("/plans", async (_req, res) => {
  try {
    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true)
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscription plans" });
  }
});

// Subscribe to a plan
router.post("/subscribe", async (req, res) => {
  try {
    const { userId, planId } = req.body;

    // Get the plan details for pricing
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId)
    });

    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    // Create subscription record
    const [subscription] = await db.insert(userSubscriptions)
      .values({
        userId,
        planId,
        status: "pending",
        startDate: new Date(),
      })
      .returning();

    if (!subscription) {
      throw new Error("Failed to create subscription");
    }

    // Get default payment provider for transaction creation
    const defaultProvider = await db.query.paymentProviders.findFirst({
      where: eq(paymentProviders.isActive, true)
    });

    if (!defaultProvider) {
      return res.status(400).json({ message: "No payment providers available" });
    }

    // Create pending transaction record
    const [transaction] = await db.insert(transactions)
      .values({
        userId,
        providerId: defaultProvider.id,
        type: "payment",
        amount: plan.price,
        currency: "USD",
        status: "pending",
        txReference: `sub_${subscription.id}_${Date.now()}`,
        metadata: { subscriptionId: subscription.id }
      })
      .returning();

    res.json({ 
      message: "Subscription initiated", 
      subscription,
      transaction
    });
  } catch (error) {
    res.status(400).json({ 
      message: "Error creating subscription",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user's active subscription
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, parseInt(userId)),
      with: {
        plan: true
      }
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscription" });
  }
});

// Admin: Create or update subscription plan
router.post("/admin/plans", async (req, res) => {
  try {
    const planData = insertSubscriptionPlanSchema.parse(req.body);

    const [plan] = await db.insert(subscriptionPlans)
      .values(planData)
      .returning();

    res.json(plan);
  } catch (error) {
    res.status(400).json({ 
      message: "Error creating subscription plan",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin: Update plan ordering
router.patch("/admin/plans/reorder", async (req, res) => {
  try {
    const { planIds } = req.body; // Array of plan IDs in desired order

    // Update positions for each plan
    await Promise.all(
      planIds.map((planId: number, index: number) =>
        db.update(subscriptionPlans)
          .set({ position: index })
          .where(eq(subscriptionPlans.id, planId))
      )
    );

    const updatedPlans = await db.query.subscriptionPlans.findMany({
      orderBy: subscriptionPlans.position
    });

    res.json(updatedPlans);
  } catch (error) {
    res.status(400).json({ 
      message: "Error reordering subscription plans",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;