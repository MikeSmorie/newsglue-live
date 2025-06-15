// Omega-V8.3 DB Audit & Restore Script
const { db } = require("./db");
const { users, paymentProviders, subscriptionPlans, vouchers } = require("./db/schema");
const { eq } = require("drizzle-orm");

async function auditAndRestore() {
  const results = {};

  console.log("🔍 Starting database audit...");

  try {
    // 1. Verify SuperGod User Exists
    const supergods = await db.select().from(users).where(eq(users.role, "supergod"));
    if (supergods.length === 0) {
      results.supergod = "❌ No supergod account found.";
      
      // Create SuperGod user if missing
      await db.insert(users).values({
        username: "MichaelSuperGod",
        email: "Michael@WirelessAlert.co.za", 
        password: "0", // Will be hashed by system
        role: "supergod",
        tokens: 1000000,
        status: "active"
      });
      results.supergod += " ✅ Created MichaelSuperGod account.";
    } else {
      results.supergod = `✅ Found ${supergods.length} supergod account(s).`;
    }

    // 2. Check Payment Providers
    const providers = await db.select().from(paymentProviders);
    if (providers.length === 0) {
      await db.insert(paymentProviders).values([
        {
          name: "PayPal",
          slug: "paypal",
          active: true,
          icon: "paypal",
        },
        {
          name: "Solana", 
          slug: "solana",
          active: true,
          icon: "sol",
        },
        {
          name: "Flutterwave",
          slug: "flutterwave", 
          active: false,
          icon: "wave",
        },
      ]);
      results.paymentProviders = "⚠️ Payment providers missing. Seeded fresh set.";
    } else {
      results.paymentProviders = `✅ ${providers.length} payment providers already exist.`;
    }

    // 3. Check Subscription Plans
    const plans = await db.select().from(subscriptionPlans);
    if (plans.length === 0) {
      await db.insert(subscriptionPlans).values([
        {
          name: "Free",
          price: 0,
          tier: "free", 
          description: "Basic access",
          features: ["Access to 3 modules"],
        },
        {
          name: "Pro",
          price: 29,
          tier: "pro",
          description: "Upgraded tools", 
          features: ["Access to 7 modules", "Priority access"],
        },
        {
          name: "Enterprise", 
          price: 99,
          tier: "enterprise",
          description: "Full access",
          features: ["All modules", "Unlimited access", "Custom tools"],
        },
      ]);
      results.subscriptionPlans = "⚠️ Subscription plans missing. Seeded default plans.";
    } else {
      results.subscriptionPlans = `✅ ${plans.length} subscription plans already exist.`;
    }

    // 4. Check for Active Voucher
    const existing = await db.select().from(vouchers);
    if (existing.length === 0) {
      await db.insert(vouchers).values({
        code: "WELCOME50",
        value: 50,
        expiresAt: new Date("2099-12-31"),
        maxRedemptions: 9999,
      });
      results.voucher = "⚠️ Voucher missing. Seeded WELCOME50.";
    } else {
      results.voucher = `✅ ${existing.length} voucher(s) already exist.`;
    }

    console.log("\n📊 Audit Results:");
    console.table(results);
    console.log("✅ Database audit and restoration completed successfully!");

  } catch (error) {
    console.error("❌ Database audit failed:", error);
    throw error;
  }
}

auditAndRestore();