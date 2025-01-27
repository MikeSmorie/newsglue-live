import { pgTable, text, serial, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login")
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  details: text("details")
});

export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  errorMessage: text("error_message").notNull(),
  location: text("location").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  resolved: text("resolved").default("No"),
  stackTrace: text("stack_trace")
});

// Payment and Subscription Related Schema
export const subscriptionStatusEnum = z.enum(["active", "cancelled", "expired", "pending"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;

export const paymentStatusEnum = z.enum(["pending", "completed", "failed", "refunded"]);
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const gatewayProviderEnum = z.enum(["PayPal", "Stripe"]);
export type GatewayProvider = z.infer<typeof gatewayProviderEnum>;

export const gatewayStatusEnum = z.enum(["active", "inactive"]);
export type GatewayStatus = z.infer<typeof gatewayStatusEnum>;

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: text("interval").notNull(), // monthly, yearly, etc.
  features: text("features"), // JSON string of features
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").notNull().default("pending"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => userSubscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentIntentId: text("payment_intent_id"), // For Stripe integration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

export const clientPaymentGateways = pgTable("client_payment_gateways", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  gatewayProvider: text("gateway_provider").notNull(),
  apiKey: text("api_key").notNull(),
  secretKey: text("secret_key").notNull(),
  status: text("status").notNull().default("inactive"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// Define all relations
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
  subscriptions: many(userSubscriptions),
  payments: many(payments),
  paymentGateways: many(clientPaymentGateways)
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id]
  })
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(userSubscriptions)
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id]
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id]
  }),
  payments: many(payments)
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id]
  }),
  subscription: one(userSubscriptions, {
    fields: [payments.subscriptionId],
    references: [userSubscriptions.id]
  })
}));

export const clientPaymentGatewaysRelations = relations(clientPaymentGateways, ({ one }) => ({
  client: one(users, {
    fields: [clientPaymentGateways.clientId],
    references: [users.id]
  })
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  role: userRoleEnum.default("user"),
  email: z.string().email("Invalid email address").optional(),
  lastLogin: z.date().optional()
});

export const selectUserSchema = createSelectSchema(users);

export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const selectActivityLogSchema = createSelectSchema(activityLogs);

export const insertErrorLogSchema = createInsertSchema(errorLogs);
export const selectErrorLogSchema = createSelectSchema(errorLogs);

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlans);

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions, {
  status: subscriptionStatusEnum,
});
export const selectUserSubscriptionSchema = createSelectSchema(userSubscriptions);

export const insertPaymentSchema = createInsertSchema(payments, {
  status: paymentStatusEnum,
});
export const selectPaymentSchema = createSelectSchema(payments);

export const insertClientPaymentGatewaySchema = createInsertSchema(clientPaymentGateways, {
  gatewayProvider: gatewayProviderEnum,
  status: gatewayStatusEnum.default("inactive")
});
export const selectClientPaymentGatewaySchema = createSelectSchema(clientPaymentGateways);

// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type SelectActivityLog = typeof activityLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;
export type SelectErrorLog = typeof errorLogs.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SelectSubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;
export type SelectUserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type SelectPayment = typeof payments.$inferSelect;
export type InsertClientPaymentGateway = typeof clientPaymentGateways.$inferInsert;
export type SelectClientPaymentGateway = typeof clientPaymentGateways.$inferSelect;