import { db } from "@db";
import { activityLogs, errorLogs, users, subscriptionPlans, userSubscriptions } from "@db/schema";
import { eq } from "drizzle-orm";
import type { AIQuery, AIResponse } from "./types";

export class AIAssistantService {
  private async getSystemContext() {
    try {
      // Get insights about the system state
      const recentErrors = await db.select().from(errorLogs).orderBy(errorLogs.timestamp).limit(10);
      const recentActivity = await db.select().from(activityLogs).orderBy(activityLogs.timestamp).limit(10);
      const activePlans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));

      return {
        errors: recentErrors,
        activity: recentActivity,
        subscriptionPlans: activePlans,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting system context:", error);
      return {
        errors: [],
        activity: [],
        subscriptionPlans: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getUserContext(userId: number) {
    try {
      // Get user-specific context
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          subscriptions: {
            with: {
              plan: true
            }
          },
          activityLogs: true
        }
      });

      return {
        user,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting user context:", error);
      return {
        user: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  async processQuery(aiQuery: AIQuery): Promise<AIResponse> {
    const { type, query, userId, context } = aiQuery;

    // Log the AI interaction
    await db.insert(activityLogs).values({
      userId,
      action: `ai_${type}_query`,
      details: JSON.stringify({ query, context }),
      timestamp: new Date()
    });

    try {
      if (type === "admin") {
        return this.handleAdminQuery(query, userId);
      } else {
        return this.handleUserQuery(query, userId);
      }
    } catch (error) {
      // Log the error
      await db.insert(errorLogs).values({
        errorMessage: error instanceof Error ? error.message : "Unknown error in AI processing",
        location: "AIAssistantService.processQuery",
        stackTrace: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      });

      throw error;
    }
  }

  private async handleAdminQuery(query: string, userId: number): Promise<AIResponse> {
    const systemContext = await this.getSystemContext();

    // Format insights about the system for admin consumption
    const insights = {
      errorRate: systemContext.errors.length > 0 ? 
        `${((systemContext.errors.length / systemContext.activity.length) * 100).toFixed(1)}%` : 
        "0%",
      activeSubscriptionPlans: systemContext.subscriptionPlans.length,
      recentActivityCount: systemContext.activity.length,
      latestError: systemContext.errors[0]
    };

    return {
      answer: `[Admin Insights] Here's what I know about the system:
- Error Rate: ${insights.errorRate}
- Active Subscription Plans: ${insights.activeSubscriptionPlans}
- Recent Activity Count: ${insights.recentActivityCount}
${insights.latestError ? `\nLatest Error: ${insights.latestError.errorMessage}` : ''}`,
      suggestions: [
        "View detailed error logs",
        "Check subscription plan statistics",
        "Monitor user activity trends"
      ],
      relatedDocs: [
        "system_architecture.md",
        "api_documentation.md"
      ],
      confidence: 0.95
    };
  }

  private async handleUserQuery(query: string, userId: number): Promise<AIResponse> {
    const userContext = await this.getUserContext(userId);

    // Get user-specific information
    const subscription = userContext.user?.subscriptions?.[0];
    const hasActiveSubscription = subscription?.status === "active";

    return {
      answer: `I'm here to help! ${hasActiveSubscription ? 
        "I see you have an active subscription plan." : 
        "You might want to check out our subscription plans for additional features."}`,
      suggestions: [
        hasActiveSubscription ? "Check your subscription features" : "View available plans",
        "Explore the dashboard",
        "Get help with specific features"
      ],
      confidence: 0.9
    };
  }
}

export const aiAssistant = new AIAssistantService();