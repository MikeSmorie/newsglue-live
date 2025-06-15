import express from "express";
import { db } from "@db";
import { paymentProviders, transactions } from "@db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get all active payment providers
router.get("/providers", async (_req, res) => {
  try {
    const providers = await db.query.paymentProviders.findMany({
      where: eq(paymentProviders.isActive, true)
    });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment providers" });
  }
});

// Dynamic payment processing endpoint
router.post("/:provider/pay", async (req, res) => {
  try {
    const { provider } = req.params;
    const { amount, currency = 'USD', userId, metadata } = req.body;

    if (!amount || !userId) {
      return res.status(400).json({ error: "Amount and userId are required" });
    }

    // Validate provider exists and is active
    const providerRecord = await db.query.paymentProviders.findFirst({
      where: eq(paymentProviders.name, provider.toLowerCase())
    });

    if (!providerRecord || !providerRecord.isActive) {
      return res.status(404).json({ error: "Payment provider not found or inactive" });
    }

    // Dynamic import of payment provider module
    let paymentModule;
    try {
      paymentModule = await import(`../../../lib/payments/${provider.toLowerCase()}/index.js`);
    } catch (importError) {
      console.error(`Failed to import provider ${provider}:`, importError);
      return res.status(500).json({ error: "Payment provider module not available" });
    }

    // Process payment using the provider module
    const paymentResult = await paymentModule.processPayment(amount, currency, userId, metadata);

    // Record transaction in database
    const [transaction] = await db.insert(transactions)
      .values({
        userId: parseInt(userId),
        providerId: providerRecord.id,
        type: "payment",
        amount: amount.toString(),
        currency,
        status: paymentResult.status === 'success' ? 'completed' : 'failed',
        txReference: paymentResult.txReference,
        metadata: paymentResult.metadata || {}
      })
      .returning();

    res.json({
      status: paymentResult.status,
      txReference: paymentResult.txReference,
      transactionId: transaction.id,
      provider: providerRecord.name
    });

  } catch (error) {
    console.error("[ERROR] Payment processing failed:", error);
    res.status(500).json({ error: "Payment processing failed" });
  }
});

// Get transaction status
router.get("/transaction/:txReference", async (req, res) => {
  try {
    const { txReference } = req.params;
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.txReference, txReference),
      with: {
        provider: true
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

export default router;
