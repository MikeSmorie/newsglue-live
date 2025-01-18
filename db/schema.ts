import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
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

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs)
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
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

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type SelectActivityLog = typeof activityLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;
export type SelectErrorLog = typeof errorLogs.$inferSelect;