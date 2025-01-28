import express from "express";
import { db } from "@db";
import { 
  subscriptionPlans, 
  userSubscriptions, 
  payments,
  insertSubscriptionPlanSchema,
  insertUserSubscriptionSchema,
  insertPaymentSchema
} from "@db/schema";
import { eq } from "drizzle-orm";
import NodeCache from "node-cache";

const router = express.Router();
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
}); 

// Cache metrics
const cacheStats = {
  hits: 0,
  misses: 0
};

function trackCacheMetrics() {
  const stats = cache.getStats();
  logActivity(0, 'CACHE_METRICS', JSON.stringify({
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    keys: cache.keys().length,
    ...stats
  }));
}

setInterval(trackCacheMetrics, 300000); // Log every 5 minutes

// Get all subscription plans with caching
router.get("/plans", async (_req, res) => {
  try {
    const cachedPlans = cache.get("subscription_plans");
    if (cachedPlans) {
      return res.json(cachedPlans);
    }

    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: subscriptionPlans.position,
      with: {
        planFeatures: {
          with: {
            feature: true
          }
        }
      }
    });

    cache.set("subscription_plans", plans);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscription plans" });
  }
});

// Subscribe to a plan
router.post("/subscribe", async (req, res) => {
  try {
    const { userId, planId } = req.body;

    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
      columns: {
        id: true,
        price: true,
      }
    });

    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    const [subscription] = await db.insert(userSubscriptions)
      .values({
        userId,
        planId,
        status: "pending",
        startDate: new Date(),
      })
      .returning();

    const [payment] = await db.insert(payments)
      .values({
        userId,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: "USD",
        status: "pending",
        paymentMethod: "placeholder"
      })
      .returning();

    // Invalidate user subscription cache
    cache.del(`user_subscription_${userId}`);

    res.json({ subscription, payment });
  } catch (error) {
    res.status(400).json({ 
      message: "Error creating subscription",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user's active subscription with caching
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `user_subscription_${userId}`;

    const cachedSubscription = cache.get(cacheKey);
    if (cachedSubscription) {
      return res.json(cachedSubscription);
    }

    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, parseInt(userId)),
      with: {
        plan: {
          columns: {
            id: true,
            name: true,
            price: true,
            features: true
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    cache.set(cacheKey, subscription);
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

    cache.del("subscription_plans"); // Invalidate cache after reordering

    res.json(updatedPlans);
  } catch (error) {
    res.status(400).json({ 
      message: "Error reordering subscription plans",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;