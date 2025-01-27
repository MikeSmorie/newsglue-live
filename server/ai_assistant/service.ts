import { db } from "@db";
import { 
  activityLogs, 
  errorLogs, 
  users, 
  subscriptionPlans, 
  userSubscriptions,
  payments
} from "@db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import type { AIQuery, AIResponse, AIFeedback } from "./types";

export class AIAssistantService {
  private async getSystemContext() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Get comprehensive system insights
      const recentErrors = await db.select().from(errorLogs)
        .orderBy(desc(errorLogs.timestamp))
        .limit(10);

      const recentActivity = await db.select().from(activityLogs)
        .orderBy(desc(activityLogs.timestamp))
        .limit(10);

      const activePlans = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true));

      // Get monthly active users
      const activeUsers = await db.select()
        .from(users)
        .where(gte(users.lastLogin, thirtyDaysAgo));

      // Get subscription metrics
      const activeSubscriptions = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.status, "active"));

      // Get recent payments
      const recentPayments = await db.select()
        .from(payments)
        .orderBy(desc(payments.createdAt))
        .limit(5);

      return {
        errors: recentErrors,
        activity: recentActivity,
        subscriptionPlans: activePlans,
        activeUsers: activeUsers.length,
        metrics: {
          activeSubscriptions: activeSubscriptions.length,
          recentPayments: recentPayments.length,
        },
        timestamp: now.toISOString()
      };
    } catch (error) {
      console.error("Error getting system context:", error);
      return {
        errors: [],
        activity: [],
        subscriptionPlans: [],
        activeUsers: 0,
        metrics: {
          activeSubscriptions: 0,
          recentPayments: 0,
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getUserContext(userId: number) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          subscriptions: {
            with: {
              plan: true
            }
          },
          activityLogs: {
            orderBy: (logs) => desc(logs.timestamp),
            limit: 5
          }
        }
      });

      // Get user's recent payments
      const userPayments = await db.select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt))
        .limit(3);

      return {
        user,
        recentPayments: userPayments,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting user context:", error);
      return {
        user: null,
        recentPayments: [],
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

    // Format comprehensive insights
    const insights = {
      errorRate: systemContext.errors.length > 0 ? 
        `${((systemContext.errors.length / systemContext.activity.length) * 100).toFixed(1)}%` : 
        "0%",
      activeSubscriptionPlans: systemContext.subscriptionPlans.length,
      recentActivityCount: systemContext.activity.length,
      latestError: systemContext.errors[0],
      activeUsers: systemContext.activeUsers,
      metrics: {
        activeSubscriptions: systemContext.metrics.activeSubscriptions,
        recentPayments: systemContext.metrics.recentPayments
      }
    };

    // Generate system health status
    const systemHealth = {
      status: insights.errorRate === "0%" ? "healthy" : "needs attention",
      details: {
        errorRate: insights.errorRate,
        activeUsers: insights.activeUsers,
        activeSubscriptions: insights.metrics.activeSubscriptions
      }
    };

    return {
      answer: `[Admin Insights] Here's a comprehensive system overview:

1. System Health:
   - Status: ${systemHealth.status}
   - Error Rate: ${insights.errorRate}
   - Active Users: ${insights.activeUsers}

2. Subscription Status:
   - Active Plans: ${insights.activeSubscriptionPlans}
   - Active Subscriptions: ${insights.metrics.activeSubscriptions}
   - Recent Payments: ${insights.metrics.recentPayments}

3. Activity Overview:
   - Recent Activities: ${insights.recentActivityCount}
${insights.latestError ? `\nLatest Error Alert:
   ${insights.latestError.errorMessage}
   Location: ${insights.latestError.location}
   Time: ${new Date(insights.latestError.timestamp).toLocaleString()}` : ''}`,
      suggestions: [
        "View detailed error logs",
        "Check subscription plan statistics",
        "Monitor user activity trends",
        "Review system health metrics"
      ],
      actions: [
        {
          type: "view",
          label: "View Error Logs",
          endpoint: "/api/admin/error-logs"
        },
        {
          type: "view",
          label: "View Activity Logs",
          endpoint: "/api/admin/activity-logs"
        }
      ],
      relatedDocs: [
        "system_architecture.md",
        "api_documentation.md",
        "monitoring_guide.md"
      ],
      metrics: {
        errorRate: insights.errorRate,
        activeUsers: insights.activeUsers,
        systemHealth
      },
      confidence: 0.95
    };
  }

  private async handleUserQuery(query: string, userId: number): Promise<AIResponse> {
    const userContext = await this.getUserContext(userId);

    // Get user-specific information
    const subscription = userContext.user?.subscriptions?.[0];
    const hasActiveSubscription = subscription?.status === "active";
    const recentActivities = userContext.user?.activityLogs || [];

    const suggestions = [];
    if (hasActiveSubscription) {
      suggestions.push(
        "Check your subscription features",
        "Explore premium features",
        "View usage analytics"
      );
    } else {
      suggestions.push(
        "View available plans",
        "Compare subscription features",
        "Start free trial"
      );
    }

    // Add personalized suggestions based on recent activity
    if (recentActivities.length > 0) {
      suggestions.push(
        "Continue where you left off",
        "Explore related features"
      );
    }

    return {
      answer: `I'm here to help! ${hasActiveSubscription ? 
        `I see you're on the ${subscription.plan.name} plan. You have access to all premium features.` : 
        "You might want to check out our subscription plans for additional features."}

${recentActivities.length > 0 ? "\nRecent Activity:\n" + 
  recentActivities.map(activity => `- ${activity.action}`).join("\n") : ""}`,
      suggestions,
      actions: hasActiveSubscription ? [
        {
          type: "view",
          label: "View Subscription Details",
          endpoint: `/api/subscription/user/${userId}`
        }
      ] : [
        {
          type: "view",
          label: "View Available Plans",
          endpoint: "/api/subscription/plans"
        }
      ],
      confidence: 0.9
    };
  }

  async recordFeedback(feedback: AIFeedback) {
    await db.insert(activityLogs).values({
      userId: feedback.userId,
      action: "ai_feedback",
      details: JSON.stringify(feedback),
      timestamp: new Date()
    });
  }
}

export const aiAssistant = new AIAssistantService();