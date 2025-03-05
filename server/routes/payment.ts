import express from "express";
import { MockPaymentGateway } from "../payment/gateway";
import { db } from "@db";
import { clientPaymentGateways } from "@db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();
const paymentGateway = new MockPaymentGateway();

// Test endpoint for payment gateway
router.get("/test", async (_req, res) => {
  try {
    await paymentGateway.initialize();
    const result = await paymentGateway.processPayment(10.00, "test-user");
    res.json({ message: "Payment test successful", result });
  } catch (error) {
    console.error("[ERROR] Payment test failed:", error);
    res.status(500).json({ error: "Payment test failed" });
  }
});

// Get available payment gateways for a client
router.get("/gateways/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const gateways = await db.query.clientPaymentGateways.findMany({
      where: eq(clientPaymentGateways.clientId, parseInt(clientId))
    });
    res.json(gateways);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment gateways" });
  }
});

export default router;
