import { pgTable, text, varchar, serial, timestamp, integer, boolean, decimal, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

export const userRoleEnum = z.enum(["user", "admin", "supergod"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const subscriptionPlanEnum = z.enum(["free", "pro", "enterprise"]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanEnum>;

export const tierEnum = z.enum(["free", "pro", "enterprise"]);
export type Tier = z.infer<typeof tierEnum>;

export const paymentMethodEnum = z.enum(["paypal", "stablecoin", "credit_card"]);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

// Module access control table
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  requiredTier: text("required_tier").notNull().default("free"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
  subscriptionPlan: text("subscription_plan").default("free"),
  walletAddress: text("wallet_address"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  trialActive: boolean("trial_active").notNull().default(true),
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialExpiresAt: timestamp("trial_expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  bonusTrialClaimed: boolean("bonus_trial_claimed").notNull().default(false),
  status: text("status").default("active"),
  notes: text("notes"),
  isTestAccount: boolean("is_test_account").default(false),
  referredBy: integer("referred_by"),
  tokens: integer("tokens").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  tokenVersion: integer("token_version").notNull().default(0)
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at")
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

// Omega-V8.3 New Payment System Architecture
export const transactionTypeEnum = z.enum(["payment", "refund", "payout"]);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const transactionStatusEnum = z.enum(["pending", "completed", "failed", "refunded", "cancelled"]);
export type TransactionStatus = z.infer<typeof transactionStatusEnum>;

export const subscriptionStatusEnum = z.enum(["active", "cancelled", "expired", "pending"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;

// Payment Providers Table
export const paymentProviders = pgTable("payment_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  integrationType: text("integration_type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// Transactions Table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => paymentProviders.id),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"),
  txReference: text("tx_reference").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

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
  transactions: many(transactions),
  tokens: many(tokens)
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

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id]
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id]
  })
}));

// New payment system relations
export const paymentProvidersRelations = relations(paymentProviders, ({ many }) => ({
  transactions: many(transactions)
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id]
  }),
  provider: one(paymentProviders, {
    fields: [transactions.providerId],
    references: [paymentProviders.id]
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

// News items table for Module 3 -> Module 6 workflow
export const newsItems = pgTable("news_items", {
  id: serial("id").primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  headline: text("headline").notNull(),
  sourceUrl: text("source_url").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull().default("external"), // 'external' | 'internal'
  status: text("status").notNull().default("draft"), // 'draft' | 'sent' | 'complete' | 'error'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// News items relations
export const newsItemsRelations = relations(newsItems, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [newsItems.campaignId],
    references: [campaigns.id]
  })
}));

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

// News items schema and types
export const insertNewsItemSchema = createInsertSchema(newsItems);
export const selectNewsItemSchema = createSelectSchema(newsItems);
export type InsertNewsItem = typeof newsItems.$inferInsert;
export type SelectNewsItem = typeof newsItems.$inferSelect;



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
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
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

// New payment system schemas
export const insertPaymentProviderSchema = createInsertSchema(paymentProviders);
export const selectPaymentProviderSchema = createSelectSchema(paymentProviders);

export const insertTransactionSchema = createInsertSchema(transactions, {
  type: transactionTypeEnum,
  status: transactionStatusEnum,
});
export const selectTransactionSchema = createSelectSchema(transactions);

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
// New payment system types
export type InsertPaymentProvider = typeof paymentProviders.$inferInsert;
export type SelectPaymentProvider = typeof paymentProviders.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;

// Add new types
export type InsertFeature = typeof features.$inferInsert;
export type SelectFeature = typeof features.$inferSelect;
export type InsertPlanFeature = typeof planFeatures.$inferInsert;
export type SelectPlanFeature = typeof planFeatures.$inferSelect;

// Omega Logs Table for Global Observability
export const logSeverityEnum = z.enum(["info", "warning", "error"]);
export type LogSeverity = z.infer<typeof logSeverityEnum>;

export const logEventTypeEnum = z.enum([
  "login",
  "logout", 
  "failed_request",
  "subscription_change",
  "payment_attempt",
  "error_boundary",
  "api_error",
  "user_action",
  "system_event"
]);
export type LogEventType = z.infer<typeof logEventTypeEnum>;

export const omegaLogs = pgTable("omega_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userRole: text("user_role"),
  endpoint: text("endpoint"),
  eventType: text("event_type", { enum: logEventTypeEnum.options }).notNull(),
  severity: text("severity", { enum: logSeverityEnum.options }).default("info").notNull(),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const omegaLogsRelations = relations(omegaLogs, ({ one }) => ({
  user: one(users, {
    fields: [omegaLogs.userId],
    references: [users.id]
  })
}));

export const insertOmegaLogSchema = createInsertSchema(omegaLogs);
export const selectOmegaLogSchema = createSelectSchema(omegaLogs);

export type InsertOmegaLog = typeof omegaLogs.$inferInsert;
export type SelectOmegaLog = typeof omegaLogs.$inferSelect;

// Module schema for validation
export const insertModuleSchema = createInsertSchema(modules);
export const selectModuleSchema = createSelectSchema(modules);

export type InsertModule = typeof modules.$inferInsert;
export type SelectModule = typeof modules.$inferSelect;

// Tokens table for hybrid billing system
export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tokensRelations = relations(tokens, ({ one }) => ({
  user: one(users, {
    fields: [tokens.userId],
    references: [users.id],
  }),
}));

export const insertTokenSchema = createInsertSchema(tokens);
export const selectTokenSchema = createSelectSchema(tokens);

export type InsertToken = typeof tokens.$inferInsert;
export type SelectToken = typeof tokens.$inferSelect;

// Referral tables for referral engine
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referralRedemptions = pgTable("referral_redemptions", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refereeId: integer("referee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
  rewardAmount: integer("reward_amount").notNull().default(50), // tokens
});

// Relations for referral tables
export const referralsRelations = relations(referrals, ({ one, many }) => ({
  user: one(users, {
    fields: [referrals.userId],
    references: [users.id],
  }),
  redemptions: many(referralRedemptions, { relationName: "referrer" }),
}));

export const referralRedemptionsRelations = relations(referralRedemptions, ({ one }) => ({
  referrer: one(users, {
    fields: [referralRedemptions.referrerId],
    references: [users.id],
  }),
  referee: one(users, {
    fields: [referralRedemptions.refereeId],
    references: [users.id],
  }),
}));

// Schemas for referral tables
export const insertReferralSchema = createInsertSchema(referrals);
export const selectReferralSchema = createSelectSchema(referrals);
export const insertReferralRedemptionSchema = createInsertSchema(referralRedemptions);
export const selectReferralRedemptionSchema = createSelectSchema(referralRedemptions);

export type InsertReferral = typeof referrals.$inferInsert;
export type SelectReferral = typeof referrals.$inferSelect;
export type InsertReferralRedemption = typeof referralRedemptions.$inferInsert;
export type SelectReferralRedemption = typeof referralRedemptions.$inferSelect;

// AI Output Tracking Tables
export const rewrites = pgTable("rewrites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  originalText: text("original_text").notNull(),
  rewrittenText: text("rewritten_text").notNull(),
  wordCount: integer("word_count").default(0),
  tone: text("tone"),
  dialect: text("dialect"),
  styleLabel: text("style_label"),
  isClone: boolean("is_clone").default(false),
  rewriteTime: timestamp("rewrite_time").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const aiOutputLogs = pgTable("ai_output_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  rewriteId: uuid("rewrite_id").references(() => rewrites.id),
  tokensUsed: integer("tokens_used"),
  detectionRating: text("detection_rating"), // 'Human', 'Likely AI', 'Detectable', etc.
  createdAt: timestamp("created_at").defaultNow()
});

// AI tracking relations
export const rewritesRelations = relations(rewrites, ({ one, many }) => ({
  user: one(users, {
    fields: [rewrites.userId],
    references: [users.id]
  }),
  outputLogs: many(aiOutputLogs)
}));

export const aiOutputLogsRelations = relations(aiOutputLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiOutputLogs.userId],
    references: [users.id]
  }),
  rewrite: one(rewrites, {
    fields: [aiOutputLogs.rewriteId],
    references: [rewrites.id]
  })
}));

// AI tracking schemas
export const insertRewriteSchema = createInsertSchema(rewrites);
export const selectRewriteSchema = createSelectSchema(rewrites);
export const insertAiOutputLogSchema = createInsertSchema(aiOutputLogs);
export const selectAiOutputLogSchema = createSelectSchema(aiOutputLogs);

export type InsertRewrite = typeof rewrites.$inferInsert;
export type SelectRewrite = typeof rewrites.$inferSelect;
export type InsertAiOutputLog = typeof aiOutputLogs.$inferInsert;
export type SelectAiOutputLog = typeof aiOutputLogs.$inferSelect;

// Password reset token relations
export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));

// Password reset token schemas
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type SelectPasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Campaign status enum
export const campaignStatusEnum = z.enum(["draft", "active", "archived"]);
export type CampaignStatus = z.infer<typeof campaignStatusEnum>;

// Campaigns table - NewsJack methodology focused
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignName: text("campaign_name").notNull(), // Campaign name
  name: text("name"), // Secondary name field
  status: text("status").notNull().default("draft"), // Campaign status: draft, active, archived
  websiteUrl: text("website_url"), // Source URL for scraping
  ctaUrl: text("cta_url"), // Call-to-action URL
  emotionalObjective: text("emotional_objective"), // Target emotional response
  audiencePain: text("audience_pain"), // Pain-focused audience description
  additionalData: text("additional_data"), // Extra context and notes
  websiteAnalysis: text("website_analysis"), // Scraped website analysis data
  socialSettings: jsonb("social_settings").default('{}'), // Social channel configurations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaign channels table for social platform targeting
export const campaignChannels = pgTable("campaign_channels", {
  id: serial("id").primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // 'twitter', 'linkedin', 'instagram', etc.
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaigns relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  channels: many(campaignChannels),
}));

// Campaign channels relations
export const campaignChannelsRelations = relations(campaignChannels, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignChannels.campaignId],
    references: [campaigns.id],
  }),
}));

// Campaigns schemas
export const insertCampaignSchema = createInsertSchema(campaigns);
export const selectCampaignSchema = createSelectSchema(campaigns);

export type InsertCampaign = typeof campaigns.$inferInsert;
export type SelectCampaign = typeof campaigns.$inferSelect;

// Campaign channels schemas
export const insertCampaignChannelSchema = createInsertSchema(campaignChannels);
export const selectCampaignChannelSchema = createSelectSchema(campaignChannels);

export type InsertCampaignChannel = typeof campaignChannels.$inferInsert;
export type SelectCampaignChannel = typeof campaignChannels.$inferSelect;