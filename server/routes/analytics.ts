import type { Express } from "express";
import { db } from "../../db";
import { users, rewrites, aiOutputLogs } from "@db/schema";
import { eq, and, desc, sql, count, sum, avg } from "drizzle-orm";

// Simple auth checks
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const requireSupergod = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "supergod") return next();
  res.status(403).json({ message: "Supergod access required" });
};

export function registerAnalyticsRoutes(app: Express) {
  // Analytics summary endpoint
  app.get("/api/admin/analytics/summary", requireAuth, requireSupergod, async (req, res) => {
    try {
      const { period = '7' } = req.query;
      const days = parseInt(period as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total rewrites in period
      const [totalRewritesResult] = await db
        .select({ count: count() })
        .from(rewrites)
        .where(sql`${rewrites.createdAt} >= ${startDate}`);

      // Get total tokens used in period
      const [totalTokensResult] = await db
        .select({ sum: sum(aiOutputLogs.tokensUsed) })
        .from(aiOutputLogs)
        .where(sql`${aiOutputLogs.createdAt} >= ${startDate}`);

      // Get average tokens per rewrite
      const [avgTokensResult] = await db
        .select({ avg: avg(aiOutputLogs.tokensUsed) })
        .from(aiOutputLogs)
        .where(sql`${aiOutputLogs.createdAt} >= ${startDate}`);

      // Get unique users in period
      const [uniqueUsersResult] = await db
        .select({ count: sql`COUNT(DISTINCT ${rewrites.userId})` })
        .from(rewrites)
        .where(sql`${rewrites.createdAt} >= ${startDate}`);

      // Get detection rating distribution
      const detectionStats = await db
        .select({
          rating: aiOutputLogs.detectionRating,
          count: count()
        })
        .from(aiOutputLogs)
        .where(sql`${aiOutputLogs.createdAt} >= ${startDate}`)
        .groupBy(aiOutputLogs.detectionRating);

      res.json({
        period: `${days} days`,
        summary: {
          totalRewrites: totalRewritesResult.count || 0,
          totalTokens: Number(totalTokensResult.sum) || 0,
          avgTokensPerRewrite: Math.round(Number(avgTokensResult.avg) || 0),
          uniqueUsers: Number(uniqueUsersResult.count) || 0
        },
        detectionDistribution: detectionStats
      });
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });

  // Top users by volume endpoint
  app.get("/api/admin/analytics/top-users", requireAuth, requireSupergod, async (req, res) => {
    try {
      const { limit = '10', period = '30' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 10, 50);
      const days = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const topUsers = await db
        .select({
          userId: rewrites.userId,
          username: users.username,
          email: users.email,
          rewriteCount: count(rewrites.id),
          totalTokens: sum(aiOutputLogs.tokensUsed),
          avgTokensPerRewrite: avg(aiOutputLogs.tokensUsed)
        })
        .from(rewrites)
        .leftJoin(users, eq(rewrites.userId, users.id))
        .leftJoin(aiOutputLogs, eq(rewrites.id, aiOutputLogs.rewriteId))
        .where(sql`${rewrites.createdAt} >= ${startDate}`)
        .groupBy(rewrites.userId, users.username, users.email)
        .orderBy(desc(count(rewrites.id)))
        .limit(limitNum);

      res.json({
        period: `${days} days`,
        topUsers: topUsers.map(user => ({
          ...user,
          totalTokens: Number(user.totalTokens) || 0,
          avgTokensPerRewrite: Math.round(Number(user.avgTokensPerRewrite) || 0)
        }))
      });
    } catch (error) {
      console.error('Top users analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch top users analytics' });
    }
  });

  // Detection statistics endpoint
  app.get("/api/admin/analytics/detection-stats", requireAuth, requireSupergod, async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get detection stats by rating
      const detectionStats = await db
        .select({
          rating: aiOutputLogs.detectionRating,
          count: count(),
          avgTokens: avg(aiOutputLogs.tokensUsed)
        })
        .from(aiOutputLogs)
        .where(sql`${aiOutputLogs.createdAt} >= ${startDate}`)
        .groupBy(aiOutputLogs.detectionRating);

      // Get daily breakdown
      const dailyStats = await db
        .select({
          date: sql`DATE(${aiOutputLogs.createdAt})`.as('date'),
          count: count(),
          totalTokens: sum(aiOutputLogs.tokensUsed)
        })
        .from(aiOutputLogs)
        .where(sql`${aiOutputLogs.createdAt} >= ${startDate}`)
        .groupBy(sql`DATE(${aiOutputLogs.createdAt})`)
        .orderBy(sql`DATE(${aiOutputLogs.createdAt})`);

      // Calculate effectiveness metrics
      const humanLikeCount = detectionStats
        .filter(stat => stat.rating === 'Human' || stat.rating === 'Likely Human')
        .reduce((sum, stat) => sum + stat.count, 0);
      
      const totalCount = detectionStats.reduce((sum, stat) => sum + stat.count, 0);
      const humanizationRate = totalCount > 0 ? (humanLikeCount / totalCount) * 100 : 0;

      res.json({
        period: `${days} days`,
        detectionBreakdown: detectionStats.map(stat => ({
          ...stat,
          avgTokens: Math.round(Number(stat.avgTokens) || 0)
        })),
        dailyStats: dailyStats.map(stat => ({
          ...stat,
          totalTokens: Number(stat.totalTokens) || 0
        })),
        effectiveness: {
          humanizationRate: Math.round(humanizationRate * 100) / 100,
          totalProcessed: totalCount
        }
      });
    } catch (error) {
      console.error('Detection stats error:', error);
      res.status(500).json({ message: 'Failed to fetch detection statistics' });
    }
  });

  // User activity timeline
  app.get("/api/admin/analytics/user-activity", requireAuth, requireSupergod, async (req, res) => {
    try {
      const { userId, limit = '50' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 50, 200);

      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      const userActivity = await db
        .select({
          id: rewrites.id,
          originalText: sql`LEFT(${rewrites.originalText}, 100)`.as('originalText'),
          wordCount: rewrites.wordCount,
          tone: rewrites.tone,
          dialect: rewrites.dialect,
          styleLabel: rewrites.styleLabel,
          tokensUsed: aiOutputLogs.tokensUsed,
          detectionRating: aiOutputLogs.detectionRating,
          createdAt: rewrites.createdAt
        })
        .from(rewrites)
        .leftJoin(aiOutputLogs, eq(rewrites.id, aiOutputLogs.rewriteId))
        .where(eq(rewrites.userId, parseInt(userId as string)))
        .orderBy(desc(rewrites.createdAt))
        .limit(limitNum);

      res.json({
        userId: parseInt(userId as string),
        activities: userActivity
      });
    } catch (error) {
      console.error('User activity error:', error);
      res.status(500).json({ message: 'Failed to fetch user activity' });
    }
  });
}