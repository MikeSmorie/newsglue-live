import type { Express } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import cors from "cors";
import express from "express";
import subscriptionRoutes from "./routes/subscription";
import webhookRoutes from "./routes/webhook";
import aiRoutes from "./routes/ai";
import { aiProvidersRouter } from "./routes/ai-providers";
import { aiRoutingRouter } from "./routes/ai-routing";
import { aiDemoRouter } from "./routes/ai-demo";
import { aiRouterTestRouter } from "./routes/ai-router-test";
import { modulesTestRouter } from "./routes/modules-test";
import { supportAgentRouter } from "./routes/support-agent";
import { passwordResetRouter } from "./routes/password-reset";
import { emailVerificationRouter } from "./routes/email-verification";
import { sessionManagementRouter } from "./routes/session-management";
import featureRoutes from "./routes/features";
import messagesRoutes from "./routes/announcements";
import adminLogsRoutes from "./routes/admin-logs";
import paymentRoutes from "./routes/payment";
import logsRoutes from "./routes/logs";
import { registerSupergodRoutes } from "./routes/supergod";
import auditRoutes from "./routes/admin/audit";
import { modulesRouter } from "./routes/modules";
import { checkTrialStatus, resetUserTrial } from "./routes/trial";
import metricsRoutes from "./routes/metrics";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { logError } from "./utils/logger";
import { requireRole, requireSupergod } from "./middleware/rbac";
import { getTokenBalance, consumeTokens, giftTokens, modifyTokens, getAllTokenBalances } from "./routes/tokens";
import referralRouter from "../modules/3.ReferralEngine/api";
import { registerAnalyticsRoutes } from "./routes/analytics";

import newsjackRouter from "./routes/newsjack.js";
import campaignsRouter from "./routes/campaigns/index";
import campaignChannelRoutes from "./routes/campaign-channels";
import newsitemsRouter from "./routes/newsitems";
import newsItemsRouter from "./routes/news-items";
import websiteScraperRouter from "./routes/website-scraper";
import pdfRouter from "./routes/pdf";
import landingPageRouter from "./routes/landing-page.js";
import aiSitemapRouter from "./routes/ai-sitemap.js";
import proposalRouter from "./routes/proposal";
import aiDiscoverabilityRouter from "./routes/ai-discoverability";
import googleNewsRouter from "./routes/google-news-simple";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { logEvent } from "../lib/logs";
import path from 'path';
import fs from 'fs';

// Simple auth checks using passport
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && (req.user.role === "admin" || req.user.role === "supergod")) return next();
  res.status(403).json({ message: "Not authorized" });
};

// Global error handler
const errorHandler = async (err: any, req: any, res: any, next: any) => {
  await logError(
    "ERROR",
    err.message,
    `${req.method} ${req.path}`,
    err.stack
  );

  res.status(500).json({
    message: "An unexpected error occurred",
    error: process.env.NODE_ENV === "production" ? undefined : err.message
  });
};

export async function registerRoutes(app: Express) {
  // Basic CORS setup
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }));

  // Form data parser
  app.use(express.urlencoded({ 
    extended: true,
    limit: '50mb'
  }));

  // Setup auth
  setupAuth(app);

  /**
   * AUTHENTICATION ROUTES
   * Auth: None required for registration/login
   * POST /api/register - User registration
   * POST /api/login - User login
   * POST /api/logout - User logout
   * POST /api/register-admin - Admin registration (requires secret key)
   * POST /api/register-supergod - Supergod registration (requires secret key)
   */

  /**
   * SUBSCRIPTION ROUTES
   * Auth: Required
   * Role: User/Admin/Supergod (Admin/Supergod bypass restrictions)
   */
  app.use("/api/subscription", subscriptionRoutes);

  /**
   * WEBHOOK ROUTES
   * Auth: None (external payment providers)
   * Security: Webhook signature verification
   */
  app.use("/api/webhook", webhookRoutes);

  /**
   * AI ASSISTANT ROUTES
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/ai/query - Send query to AI assistant
   * POST /api/ai/feedback - Submit feedback on AI response
   */
  app.use("/api/ai", aiRoutes);

  /**
   * AI PROVIDERS ROUTES (OmegaAIR)
   * Auth: Required for admin functions
   * Role: Admin/Supergod for provider management
   * GET /api/ai/providers/status - Get provider statuses
   * POST /api/ai/providers/test/:provider - Test specific provider
   * POST /api/ai/providers/generate - Generate with fallback
   */
  app.use("/api/ai/providers", aiProvidersRouter);

  /**
   * AI ROUTING CONFIGURATION
   * Auth: Required
   * Role: Supergod only
   * GET /api/admin/ai-routing/config - Get routing configuration
   * POST /api/admin/ai-routing/config - Save routing configuration
   * GET /api/admin/ai-routing/preferences - Get routing preferences
   */
  app.use("/api/admin/ai-routing", requireSupergod, aiRoutingRouter);

  /**
   * METRICS TRACKING ROUTES
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/metrics/campaign/:campaignId - Get campaign metrics
   * GET /api/metrics/outputs/:campaignId - Get output metrics
   * PUT /api/metrics/campaign/:campaignId/rate - Update hourly rate
   * POST /api/metrics/log-output - Log new output metrics
   * POST /api/metrics/export/:campaignId/csv - Export CSV
   * POST /api/metrics/export/:campaignId/pdf - Export PDF
   */
  app.use("/api/metrics", metricsRoutes);

  /**
   * AI DEMO UTILITIES
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/ai-demo/generate - Generate using best available model
   * GET /api/ai-demo/status - Get current AI system status
   * GET /api/ai-demo/health - Health check for AI router
   */
  app.use("/api/ai-demo", requireAuth, aiDemoRouter);

  /**
   * AI ROUTER TEST UTILITIES
   * Auth: None (public testing endpoints)
   * Role: Public access for testing
   * POST /api/ai-router-test/demo - Test OmegaAIR utilities
   * GET /api/ai-router-test/test-utilities - Test all utility functions
   */
  app.use("/api/ai-router-test", aiRouterTestRouter);

  /**
   * NEWSJACK CONTENT GENERATION
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/newsjack/generate - Generate newsjack content from campaign, news, and channel data
   */
  app.use("/api/newsjack", newsjackRouter);

  /**
   * CAMPAIGNS API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/campaigns - Get all campaigns
   * GET /api/campaigns/:id - Get specific campaign
   */
  app.use("/api/campaigns", requireAuth, campaignsRouter);

  /**
   * CAMPAIGN CHANNELS API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/campaign-channels/platforms - Get available social platforms
   * GET /api/campaign-channels/:campaignId - Get channels for campaign
   * PUT /api/campaign-channels/:campaignId - Update channels for campaign
   */
  app.use("/api/campaign-channels", requireAuth, campaignChannelRoutes);

  /**
   * NEWS ITEMS API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/newsitems - Get all news items
   * GET /api/newsitems/:id - Get specific news item
   */
  app.use("/api/newsitems", requireAuth, newsitemsRouter);

  /**
   * NEWS ITEMS SUBMISSION API (Module 3 -> Module 6)
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/news-items/manual-submit - Submit news item to Module 6 queue
   * GET /api/news-items/:campaignId - Get news items for campaign
   */
  app.use("/api/news-items", requireAuth, newsItemsRouter);

  /**
   * QUEUE MANAGEMENT API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/queue/fetch/:campaignId - Get all news items for campaign
   * PUT /api/queue/update-status/:id - Update news item status
   * DELETE /api/queue/delete/:id - Delete news item from queue
   * POST /api/queue/generate-newsjacks/:id - Generate newsjack content for all platforms
   * PUT /api/queue/update-content/:id - Update platform content manually
   */
  const { default: queueRoutes } = await import("./routes/queue/index.js");
  app.use("/api/queue", requireAuth, queueRoutes);

  /**
   * WEBSITE SCRAPER API
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/website-scraper/scrape - Scrape website content for campaign analysis
   */
  app.use("/api/website-scraper", websiteScraperRouter);

  /**
   * PDF GENERATION API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/pdf/newsjack/:newsItemId - Generate NewsJack PDF for specific news item
   * GET /api/pdf/campaign-dossier/:campaignId - Generate Campaign Dossier PDF
   */
  app.use("/api/pdf", requireAuth, pdfRouter);

  /**
   * LANDING PAGE API
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/landing-page/generate - Generate landing page content
   * POST /api/landing-page/:newsjackId/toggle - Toggle landing page publication
   * GET /api/landing-page/:newsjackId/status - Get landing page status
   */
  app.use("/api/landing-page", requireAuth, landingPageRouter);

  /**
   * PROPOSAL BUILDER API
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/proposal/generate - Generate strategic proposal
   * POST /api/proposal/download/:format - Download proposal in PDF/HTML/DOCX format
   */
  app.use("/api/proposal", requireAuth, proposalRouter);

  /**
   * AI SITEMAP API
   * Auth: Public
   * GET /ai-sitemap.xml - Dynamic sitemap for published landing pages
   */
  app.use("/", aiSitemapRouter);

  /**
   * AI DISCOVERABILITY API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/discoverability/audit - Get AI discoverability audit data
   * GET /api/discoverability/sitemap - Get sitemap status and entries
   * POST /api/discoverability/reping/:newsjackId - Re-ping AI indexing
   * GET /api/discoverability/:newsjackId/status - Validate metadata
   * POST /api/discoverability/export/pdf - Export AI indexing report
   * POST /api/discoverability/export/csv - Export metadata validation
   */
  app.use("/api/discoverability", requireAuth, aiDiscoverabilityRouter);

  /**
   * GOOGLE NEWS SEARCH API (Module 5)
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/google-news/keywords/:campaignId - Get search keywords for campaign
   * POST /api/google-news/keywords/:campaignId - Add keyword to campaign
   * DELETE /api/google-news/keywords/:keywordId - Remove keyword from campaign
   * POST /api/google-news/search/:campaignId - Search Google News for articles
   * GET /api/google-news/articles/:campaignId - Get stored articles for campaign
   * POST /api/google-news/transfer/:campaignId - Transfer articles to Module 6
   * DELETE /api/google-news/articles - Delete articles from storage
   */
  app.use("/api/google-news", requireAuth, googleNewsRouter);

  /**
   * NEWS AGGREGATOR SEARCH API (Module 4)
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/news-aggregator/keywords/:campaignId - Get search keywords for campaign
   * POST /api/news-aggregator/keywords/:campaignId - Add keyword to campaign
   * DELETE /api/news-aggregator/keywords/:keywordId - Remove keyword from campaign
   * POST /api/news-aggregator/search/:campaignId - Search News Aggregator for articles
   * GET /api/news-aggregator/articles/:campaignId - Get stored articles for campaign
   * POST /api/news-aggregator/transfer/:campaignId - Transfer articles to Module 6
   * DELETE /api/news-aggregator/articles - Delete articles from storage
   */
  const { default: newsAggregatorRouter } = await import("./routes/news-aggregator.js");
  app.use("/api/news-aggregator", requireAuth, newsAggregatorRouter);

  /**
   * LANDING PAGE STATIC SERVING
   * Auth: Public
   * GET /news/:slug - Serve static landing page HTML files
   */
  app.get('/news/:slug', (req, res) => {
    const { slug } = req.params;
    const filePath = path.join(process.cwd(), 'public', 'landing-pages', `${slug}.html`);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>404 - Page Not Found</title></head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The requested landing page "${slug}" does not exist.</p>
          </body>
        </html>
      `);
    }
  });

  /**
   * DATA PROTECTION API
   * Auth: Required
   * Role: User/Admin/Supergod
   * GET /api/data-protection/backups - List all backups for user
   * POST /api/data-protection/backup - Create manual backup
   * POST /api/data-protection/restore/:backupId - Restore from backup
   */
  const { default: dataProtectionRoutes } = await import("./routes/data-protection.js");
  app.use("/api/data-protection", requireAuth, dataProtectionRoutes);

  /**
   * BACKUP & RESTORE API
   * Auth: Required
   * Role: User/Admin/Supergod
   * POST /api/backup/create - Create campaign backup
   * GET /api/backup/list - List user backups
   * POST /api/backup/upload - Upload and restore backup
   * DELETE /api/backup/:id - Delete backup
   * GET /api/backup/download/:id - Download backup file
   */
  // Backup routes temporarily disabled to restore server functionality
  // const { default: backupRoutes } = await import("./routes/backup.js");
  // app.use("/api/backup", requireAuth, backupRoutes);

  /**
   * MODULE REFACTORING TESTS
   * Auth: None (public testing endpoints)
   * Role: Public access for testing refactored modules
   * POST /api/modules-test/content - Test content generation
   * POST /api/modules-test/analyze - Test data analysis
   * POST /api/modules-test/review - Test code review
   * GET /api/modules-test/test-all - Test all refactored modules
   */
  app.use("/api/modules-test", modulesTestRouter);

  /**
   * GPT SUPPORT AGENT
   * Auth: Required (logged-in users only)
   * Role: All authenticated users
   * POST /api/support-agent/chat - Chat with AI support assistant
   * GET /api/support-agent/status - Get support agent availability status
   */
  app.use("/api/support-agent", requireAuth, supportAgentRouter);

  /**
   * PASSWORD RESET ROUTES
   * Auth: None (public access for password reset)
   * Role: Public access
   * POST /api/auth/forgot-password - Request password reset
   * POST /api/auth/reset-password - Reset password with token
   * GET /api/auth/validate-token/:token - Validate reset token
   */
  app.use("/api/auth", passwordResetRouter);

  /**
   * EMAIL VERIFICATION ROUTES
   * Auth: None (public access for email verification)
   * Role: Public access
   * POST /api/auth/send-verification - Send verification email
   * GET /api/auth/verify-email - Verify email with token
   * GET /api/auth/status/:email - Check verification status
   * GET /api/auth/validate-verification-token/:token - Validate verification token
   */
  app.use("/api/auth", emailVerificationRouter);

  /**
   * SESSION MANAGEMENT ROUTES
   * Auth: Required (JWT with supergod role)
   * Role: Supergod only
   * POST /api/admin/users/:id/invalidate-sessions - Invalidate all sessions for user
   * GET /api/admin/users/:id/token-version - Get user's token version
   * POST /api/admin/bulk-invalidate-sessions - Bulk invalidate sessions
   */
  app.use("/api/admin", sessionManagementRouter);

  /**
   * FEATURE ACCESS ROUTES
   * Auth: Required for all
   * Role: Check routes (User/Admin/Supergod), Admin routes (Admin/Supergod only)
   */
  app.use("/api/features/check", requireAuth, featureRoutes); // Public feature check route
  app.use("/api/features/admin", requireAdmin, featureRoutes); // Admin-only routes

  /**
   * MESSAGING/ANNOUNCEMENTS ROUTES
   * Auth: Required
   * Role: Mixed (some admin-only, some user-accessible)
   */
  app.use("/api/messages", messagesRoutes);

  /**
   * ADMIN USER MANAGEMENT ROUTES
   * Auth: Required
   * Role: Admin/Supergod only
   */
  // Get all users with search and filtering
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { 
        q, 
        status, 
        role, 
        minTokens, 
        maxTokens, 
        page = '1', 
        limit = '50',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeSubscriptions
      } = req.query;

      // Build where conditions
      const conditions = [];
      
      // Search by username or email
      if (q && typeof q === 'string') {
        const searchTerm = `%${q.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${users.username}) LIKE ${searchTerm}`,
            sql`LOWER(${users.email}) LIKE ${searchTerm}`
          )
        );
      }

      // Filter by status
      if (status && typeof status === 'string' && status !== 'all') {
        if (status === 'active') {
          conditions.push(or(
            eq(users.status, 'active'),
            sql`${users.status} IS NULL`
          ));
        } else {
          conditions.push(eq(users.status, status));
        }
      }

      // Filter by role
      if (role && typeof role === 'string' && role !== 'all') {
        conditions.push(eq(users.role, role));
      }

      // Filter by token range
      if (minTokens && typeof minTokens === 'string') {
        const min = parseInt(minTokens);
        if (!isNaN(min)) {
          conditions.push(sql`${users.tokens} >= ${min}`);
        }
      }

      if (maxTokens && typeof maxTokens === 'string') {
        const max = parseInt(maxTokens);
        if (!isNaN(max)) {
          conditions.push(sql`${users.tokens} <= ${max}`);
        }
      }

      // Combine conditions
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Determine sort column and order
      const sortColumn = sortBy === 'username' ? users.username :
                        sortBy === 'email' ? users.email :
                        sortBy === 'role' ? users.role :
                        sortBy === 'tokens' ? users.tokens :
                        sortBy === 'lastLogin' ? users.lastLogin :
                        users.createdAt;

      const sortDirection = sortOrder === 'asc' ? asc : desc;

      // Calculate pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(whereClause);

      const total = Number(totalResult.count);

      // Get filtered and paginated users
      const filteredUsers = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          status: sql`COALESCE(${users.status}, 'active')`.as('status'),
          tokens: users.tokens,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          trialActive: users.trialActive,
          trialExpiresAt: users.trialExpiresAt
        })
        .from(users)
        .where(whereClause)
        .orderBy(sortDirection(sortColumn))
        .limit(limitNum)
        .offset(offset);

      res.json({
        users: filteredUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Suspend user
  app.post("/api/admin/users/:id/suspend", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Use raw SQL for status update since column may not be in schema
      await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${userId}`);

      res.json({ message: 'User suspended successfully' });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  });

  // Ban user
  app.post("/api/admin/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Use raw SQL for status update since column may not be in schema
      await db.execute(sql`UPDATE users SET status = 'banned' WHERE id = ${userId}`);

      res.json({ message: 'User banned successfully' });
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  // Add credits to user
  app.post("/api/admin/users/:id/credits", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { amount } = req.body;

      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ message: 'Invalid credit amount' });
      }

      await db
        .update(users)
        .set({ tokens: sql`${users.tokens} + ${amount}` })
        .where(eq(users.id, userId));

      res.json({ message: 'Credits added successfully' });
    } catch (error) {
      console.error('Error adding credits:', error);
      res.status(500).json({ message: 'Failed to add credits' });
    }
  });

  // Change user role
  app.post("/api/admin/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!['user', 'admin', 'supergod'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId));

      await logEvent('user_action', `Role changed to ${role} for user ID ${userId}`, {
        userId: req.user?.id,
        userRole: req.user?.role,
        endpoint: `/api/admin/users/${userId}/role`,
        metadata: { targetUserId: userId, newRole: role }
      });

      res.json({ message: 'Role updated successfully' });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  // Update user notes and test account flag
  app.post("/api/admin/users/:id/label", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { notes, isTestAccount } = req.body;

      await db.execute(sql`
        UPDATE users 
        SET notes = ${notes}, is_test_account = ${isTestAccount}
        WHERE id = ${userId}
      `);

      res.json({ message: 'User data updated successfully' });
    } catch (error) {
      console.error('Error updating user data:', error);
      res.status(500).json({ message: 'Failed to update user data' });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      await db.delete(users).where(eq(users.id, userId));

      await logEvent('user_action', `User ID ${userId} deleted`, {
        userId: req.user?.id,
        userRole: req.user?.role,
        endpoint: `/api/admin/users/${userId}`,
        metadata: { deletedUserId: userId }
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Get user statistics (for individual users)
  app.get("/api/admin/users/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Get referral counts for all users
      const referralStats = await db.execute(sql`
        SELECT r.referrer_id as userId, COUNT(*) as referralCount
        FROM referrals r
        GROUP BY r.referrer_id
      `);

      // Get total requests from activity logs
      const requestStats = await db.execute(sql`
        SELECT al.user_id as userId, COUNT(*) as totalRequests
        FROM activity_logs al
        WHERE al.user_id IS NOT NULL
        GROUP BY al.user_id
      `);

      // Combine stats
      const statsMap: Record<number, any> = {};
      
      (referralStats.rows as any[]).forEach(stat => {
        if (!statsMap[stat.userId]) statsMap[stat.userId] = {};
        statsMap[stat.userId].referralCount = Number(stat.referralCount);
      });

      (requestStats.rows as any[]).forEach(stat => {
        if (!statsMap[stat.userId]) statsMap[stat.userId] = {};
        statsMap[stat.userId].totalRequests = Number(stat.totalRequests);
      });

      res.json(statsMap);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Failed to fetch user stats' });
    }
  });

  // Get aggregate statistics for SuperGod dashboard
  app.get("/api/admin/users/aggregate-stats", requireAuth, requireSupergod, async (req, res) => {
    try {
      // Get total users
      const [totalUsersResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(users);

      // Get active users (status is null or 'active')
      const [activeUsersResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(or(
          eq(users.status, 'active'),
          sql`${users.status} IS NULL`
        ));

      // Get banned users
      const [bannedUsersResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(eq(users.status, 'banned'));

      // Get total tokens issued (sum of all user tokens)
      const [totalTokensResult] = await db
        .select({ total: sql`SUM(${users.tokens})` })
        .from(users);

      // Get total tokens used from transactions
      const tokensUsedResult = await db.execute(sql`
        SELECT COALESCE(SUM(ABS(amount)), 0) as total_used
        FROM transactions 
        WHERE transaction_type = 'payment' AND status = 'completed'
      `);

      const aggregateStats = {
        totalUsers: Number(totalUsersResult.count),
        activeUsers: Number(activeUsersResult.count),
        bannedUsers: Number(bannedUsersResult.count),
        totalTokensIssued: Number(totalTokensResult.total) || 0,
        totalTokensUsed: Number((tokensUsedResult.rows?.[0] as any)?.total_used) || 0
      };

      res.json(aggregateStats);
    } catch (error) {
      console.error('Error fetching aggregate stats:', error);
      res.status(500).json({ message: 'Failed to fetch aggregate stats' });
    }
  });

  /**
   * ADMIN ROUTES
   * Auth: Required
   * Role: Admin/Supergod only
   */
  app.use("/api/admin", requireAdmin, adminLogsRoutes);
  app.use("/api/admin/logs", logsRoutes);
  app.use("/api/admin/audit-logs", auditRoutes);

  /**
   * PAYMENT ROUTES
   * Auth: Required
   * Role: User/Admin/Supergod (Admin/Supergod bypass payment restrictions)
   */
  app.use("/api/payment", paymentRoutes);

  /**
   * REFERRAL ROUTES
   * Auth: Required
   * Role: User/Admin/Supergod
   */
  app.use("/api/referrals", referralRouter);

  // User profile export route
  app.get("/api/user/export", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userRecord = {
        id: user.id,
        username: user.username,
        email: user.email || '',
        role: user.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscriptionPlan: 'free',
        twoFactorEnabled: false
      };

      const { generateUserPdf } = await import("./utils/pdf");
      const pdfBuffer = await generateUserPdf(userRecord);
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=omega-user-profile.txt");
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating user profile export:", error);
      res.status(500).json({ message: "Failed to generate user profile export" });
    }
  });

  // Subscription management routes
  app.post("/api/subscription/change", requireAuth, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Mock subscription change - log a fake payment record
      const mockPayment = {
        userId,
        method: "paypal", // Default to PayPal for upgrades
        status: "pending",
        reference: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // In a real implementation, you would:
      // 1. Update user's subscription plan in database
      // 2. Create actual payment record
      // 3. Handle payment processing

      console.log(`[MOCK] Subscription change request: User ${userId} -> Plan ${planId}`);
      console.log(`[MOCK] Payment record:`, mockPayment);

      res.json({
        success: true,
        message: "Subscription change request submitted",
        paymentReference: mockPayment.reference
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's payment history
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Mock payment history - in real implementation, query database
      const mockPayments = [
        {
          id: 1,
          method: "paypal",
          status: "completed",
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          reference: `PAY-${Date.now() - 30 * 24 * 60 * 60 * 1000}-ABCD1234`
        },
        {
          id: 2,
          method: "stablecoin",
          status: "pending",
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reference: `USDC-${Date.now() - 7 * 24 * 60 * 60 * 1000}-XYZ9876`
        }
      ];

      res.json(mockPayments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save wallet address
  app.post("/api/user/wallet", requireAuth, async (req, res) => {
    try {
      const { walletAddress } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Valid wallet address required" });
      }

      // Mock wallet address save - in real implementation, update database
      console.log(`[MOCK] Saving wallet address for user ${userId}: ${walletAddress}`);

      res.json({
        success: true,
        message: "Wallet address saved successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PayPal routes
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Trial management routes
  app.post("/api/trial/check-status", requireAuth, checkTrialStatus);
  app.post("/api/admin/reset-trial/:userId", requireAdmin, resetUserTrial);

  // Admin route to get all user subscriptions
  app.get("/api/admin/subscriptions", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.query.users.findMany({
        with: {
          subscriptions: {
            with: {
              plan: true
            }
          }
        }
      });

      const subscriptionsData = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        walletAddress: user.walletAddress,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
        lastPaymentStatus: user.subscriptions?.[0] ? "active" : null,
        lastPaymentDate: user.subscriptions?.[0]?.startDate || null
      }));

      res.json(subscriptionsData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * TOKEN MANAGEMENT ROUTES
   * Auth: Required for all
   * Role: Basic routes (User/Admin/Supergod), Admin routes (Admin/Supergod only)
   * GET /api/tokens/balance - Get user token balance
   * POST /api/tokens/consume - Consume tokens for feature usage
   * POST /api/admin/tokens/gift - Gift tokens to users (Admin/Supergod only)
   * POST /api/admin/tokens/modify - Modify user token balance (Admin/Supergod only)
   * GET /api/admin/tokens/all - Get all user token balances (Admin/Supergod only)
   */
  app.get("/api/tokens/balance", requireAuth, getTokenBalance);
  app.post("/api/tokens/consume", requireAuth, consumeTokens);
  app.post("/api/admin/tokens/gift", requireAdmin, giftTokens);
  app.post("/api/admin/tokens/modify", requireAdmin, modifyTokens);
  app.get("/api/admin/tokens/all", requireAdmin, getAllTokenBalances);

  // Get users with subscription info for subscription manager
  app.get("/api/users/with-subscriptions", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.query.users.findMany({
        with: {
          subscriptions: {
            with: {
              plan: true
            }
          }
        }
      });

      const usersData = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        subscription: user.subscriptions?.[0] ? {
          id: user.subscriptions[0].id,
          planId: user.subscriptions[0].planId,
          status: user.subscriptions[0].status
        } : undefined
      }));

      res.json(usersData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // 2FA management routes
  app.get("/api/2fa/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Query database for user's 2FA settings
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          twoFactorEnabled: true,
          twoFactorSecret: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const response = {
        enabled: user.twoFactorEnabled || false,
        secret: user.twoFactorSecret || undefined
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/2fa/enable", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Generate TOTP secret for this user
      const totpSecret = "JBSWY3DPEHPK3PXP" + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // Update database to enable 2FA and store secret
      await db.update(users)
        .set({ 
          twoFactorEnabled: true,
          twoFactorSecret: totpSecret 
        })
        .where(eq(users.id, userId));

      console.log(`[2FA] Enabled for user ${userId}`);

      res.json({
        success: true,
        message: "2FA enabled successfully",
        secret: totpSecret
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/2fa/disable", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Update database to disable 2FA and clear secret
      await db.update(users)
        .set({ 
          twoFactorEnabled: false,
          twoFactorSecret: null 
        })
        .where(eq(users.id, userId));

      console.log(`[2FA] Disabled for user ${userId}`);

      res.json({
        success: true,
        message: "2FA disabled successfully"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Client error logging endpoint
  app.post("/api/logs/client-error", async (req, res) => {
    try {
      const { message, stack, componentStack, timestamp, userAgent, url } = req.body;
      const user = (req as any).user;

      await logEvent("error_boundary", `Client error: ${message}`, {
        userId: user?.id,
        userRole: user?.role || "anonymous",
        endpoint: url,
        severity: "error",
        stackTrace: stack,
        metadata: {
          componentStack,
          timestamp,
          userAgent,
          url
        }
      });

      res.json({ success: true, message: "Error logged successfully" });
    } catch (error: any) {
      console.error("Failed to log client error:", error);
      res.status(500).json({ message: "Failed to log error" });
    }
  });

  /**
   * PAYPAL INTEGRATION ROUTES
   * Auth: Required for order creation/capture
   * Role: User/Admin/Supergod (Admin/Supergod bypass payment restrictions)
   * GET /paypal/setup - Get PayPal client token
   * POST /paypal/order - Create PayPal order
   * POST /paypal/order/:orderID/capture - Capture PayPal payment
   */
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  /**
   * TRIAL MANAGEMENT ROUTES
   * Auth: Required
   * Role: User (Admin/Supergod bypass trial logic entirely)
   * POST /api/trial/check - Check trial status
   * POST /api/trial/reset - Reset trial (Admin/Supergod only)
   */
  app.post("/api/trial/check", requireAuth, checkTrialStatus);
  app.post("/api/trial/reset", requireAdmin, resetUserTrial);

  /**
   * MODULE SYSTEM ROUTES
   * Auth: Required
   * Role: User/Admin/Supergod with tier-based access control
   * GET /api/modules - List available modules
   * POST /api/modules/run - Execute module
   */
  app.use("/api/modules", modulesRouter);

  /**
   * SUPERGOD ROUTES
   * Auth: Required
   * Role: Supergod only
   * System configuration, admin management, platform control
   */
  registerSupergodRoutes(app);

  /**
   * ANALYTICS ROUTES
   * Auth: Required
   * Role: Supergod only
   * AI output tracking and admin insights
   */
  registerAnalyticsRoutes(app); // These routes have their own middleware checks

  // Error handler must be last
  app.use(errorHandler);

  return createServer(app);
}