import { pgTable, text, serial, timestamp, integer, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
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
  timestamp: timestamp("timestamp").defaultNow(),
  level: text("level").notNull(),  // INFO, WARNING, ERROR
  message: text("message").notNull(),
  source: text("source").notNull(),
  stackTrace: text("stack_trace"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id)
});

// Add relations for error logs
export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  resolvedByUser: one(users, {
    fields: [errorLogs.resolvedBy],
    references: [users.id],
  }),
}));

// Add schemas for validation
export const insertErrorLogSchema = createInsertSchema(errorLogs);
export const selectErrorLogSchema = createSelectSchema(errorLogs);

// Add types
export type InsertErrorLog = typeof errorLogs.$inferInsert;
export type SelectErrorLog = typeof errorLogs.$inferSelect;


// Simple messages table with no relations
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Add schema and types for messages
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;


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
  position: integer("position").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: text("interval").notNull(), // monthly, yearly, etc.
  features: text("features"), // JSON string of features
  isActive: boolean("is_active").default(true),
  trialPeriodDays: integer("trial_period_days"),
  metadata: text("metadata"), // JSON string for additional flexible properties
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").notNull().default("pending"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  cancelledAt: timestamp("cancelled_at"),
  customFeatures: text("custom_features"), // JSON string for feature overrides
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
  gatewayType: text("gateway_type").notNull().default("mock"),
  gatewayProvider: text("gateway_provider").notNull(),
  apiKey: text("api_key").notNull(),
  secretKey: text("secret_key").notNull(),
  isActive: boolean("is_active").default(false),
  configJson: jsonb("config_json"),
  status: text("status").notNull().default("inactive"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// New Feature Management Tables
export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

export const planFeatures = pgTable("plan_features", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  featureId: integer("feature_id").notNull().references(() => features.id),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow()
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
  subscriptions: many(userSubscriptions),
  planFeatures: many(planFeatures)
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

export const featuresRelations = relations(features, ({ many }) => ({
  planFeatures: many(planFeatures)
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  feature: one(features, {
    fields: [planFeatures.featureId],
    references: [features.id]
  }),
  plan: one(subscriptionPlans, {
    fields: [planFeatures.planId],
    references: [subscriptionPlans.id]
  })
}));


// New tables for admin-to-user communication
export const adminAnnouncements = pgTable("admin_announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  importance: text("importance").default("normal"), // normal, important, urgent
  senderId: integer("sender_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at"),
  requiresResponse: boolean("requires_response").default(false),
  targetAudience: jsonb("target_audience").notNull(), // { type: "all" | "subscription" | "user", targetIds?: number[] }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  archived: boolean("archived").default(false)
});

export const announcementRecipients = pgTable("announcement_recipients", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => adminAnnouncements.id),
  userId: integer("user_id").notNull().references(() => users.id),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  notificationSent: boolean("notification_sent").default(false),
  emailSent: boolean("email_sent").default(false)
});

export const announcementResponses = pgTable("announcement_responses", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => adminAnnouncements.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  readByAdmin: boolean("read_by_admin").default(false),
  readByAdminAt: timestamp("read_by_admin_at")
});

// Add relations for the new tables
export const adminAnnouncementsRelations = relations(adminAnnouncements, ({ one, many }) => ({
  sender: one(users, {
    fields: [adminAnnouncements.senderId],
    references: [users.id]
  }),
  recipients: many(announcementRecipients),
  responses: many(announcementResponses)
}));

export const announcementRecipientsRelations = relations(announcementRecipients, ({ one }) => ({
  announcement: one(adminAnnouncements, {
    fields: [announcementRecipients.announcementId],
    references: [adminAnnouncements.id]
  }),
  user: one(users, {
    fields: [announcementRecipients.userId],
    references: [users.id]
  })
}));

export const announcementResponsesRelations = relations(announcementResponses, ({ one }) => ({
  announcement: one(adminAnnouncements, {
    fields: [announcementResponses.announcementId],
    references: [adminAnnouncements.id]
  }),
  user: one(users, {
    fields: [announcementResponses.userId],
    references: [users.id]
  })
}));

// Add new schemas for validation
export const insertAdminAnnouncementSchema = createInsertSchema(adminAnnouncements);
export const selectAdminAnnouncementSchema = createSelectSchema(adminAnnouncements);

export const insertAnnouncementRecipientSchema = createInsertSchema(announcementRecipients);
export const selectAnnouncementRecipientSchema = createSelectSchema(announcementRecipients);

export const insertAnnouncementResponseSchema = createInsertSchema(announcementResponses);
export const selectAnnouncementResponseSchema = createSelectSchema(announcementResponses);

// Add new types
export type InsertAdminAnnouncement = typeof adminAnnouncements.$inferInsert;
export type SelectAdminAnnouncement = typeof adminAnnouncements.$inferSelect;
export type InsertAnnouncementRecipient = typeof announcementRecipients.$inferInsert;
export type SelectAnnouncementRecipient = typeof announcementRecipients.$inferSelect;
export type InsertAnnouncementResponse = typeof announcementResponses.$inferInsert;
export type SelectAnnouncementResponse = typeof announcementResponses.$inferSelect;

// Schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  role: userRoleEnum.default("user"),
  email: z.string().email("Invalid email address").optional(),
  lastLogin: z.date().optional()
});

export const selectUserSchema = createSelectSchema(users);

export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const selectActivityLogSchema = createSelectSchema(activityLogs);


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

// Add new schemas
export const insertFeatureSchema = createInsertSchema(features);
export const selectFeatureSchema = createSelectSchema(features);

export const insertPlanFeatureSchema = createInsertSchema(planFeatures);
export const selectPlanFeatureSchema = createSelectSchema(planFeatures);

// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type SelectActivityLog = typeof activityLogs.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SelectSubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;
export type SelectUserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type SelectPayment = typeof payments.$inferSelect;
export type InsertClientPaymentGateway = typeof clientPaymentGateways.$inferInsert;
export type SelectClientPaymentGateway = typeof clientPaymentGateways.$inferSelect;

// Add new types
export type InsertFeature = typeof features.$inferInsert;
export type SelectFeature = typeof features.$inferSelect;
export type InsertPlanFeature = typeof planFeatures.$inferInsert;
export type SelectPlanFeature = typeof planFeatures.$inferSelect;