import express from "express";
import { db } from "@db";
import { 
  adminAnnouncements, 
  announcementRecipients, 
  announcementResponses,
  userSubscriptions,
  users,
  errorLogs
} from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = express.Router();

// Create a new announcement
router.post("/admin/announcements", async (req, res) => {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] New announcement request received:`, {
    headers: req.headers,
    body: JSON.stringify(req.body, null, 2)
  });

  try {
    const { title, content, importance, startDate, endDate, requiresResponse, targetAudience } = req.body;
    const senderId = req.user?.id;

    // Log parsed request data
    console.log(`[${requestId}] Parsed announcement data:`, {
      title,
      importance,
      targetAudience,
      startDate,
      endDate,
      senderId
    });

    if (!senderId) {
      throw new Error("Unauthorized - No sender ID found");
    }

    // Validate data types and required fields
    const validationErrors = [];
    if (typeof title !== 'string' || !title.trim()) validationErrors.push("Invalid title");
    if (typeof content !== 'string' || !content.trim()) validationErrors.push("Invalid content");
    if (!['normal', 'important', 'urgent'].includes(importance)) validationErrors.push("Invalid importance level");
    if (!targetAudience?.type || !['all', 'subscription', 'user'].includes(targetAudience.type)) {
      validationErrors.push("Invalid target audience type");
    }

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    // Log pre-database operation
    console.log(`[${requestId}] Creating announcement record:`, {
      title,
      importance,
      targetAudience
    });

    // Create the announcement
    const [announcement] = await db.insert(adminAnnouncements)
      .values({
        title,
        content,
        importance,
        senderId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        requiresResponse: requiresResponse || false,
        targetAudience
      })
      .returning();

    console.log(`[${requestId}] Announcement created:`, announcement);

    // Get target recipients based on audience type
    let recipientUserIds: number[] = [];

    if (targetAudience.type === "all") {
      const allUsers = await db.query.users.findMany({
        columns: { id: true }
      });
      recipientUserIds = allUsers.map(user => user.id);
      console.log(`[${requestId}] Targeting all users:`, recipientUserIds.length);
    } else if (targetAudience.type === "subscription" && targetAudience.targetIds) {
      const subscriptionUsers = await db.query.userSubscriptions.findMany({
        where: inArray(userSubscriptions.planId, targetAudience.targetIds),
        columns: { userId: true }
      });
      recipientUserIds = subscriptionUsers.map(sub => sub.userId);
      console.log(`[${requestId}] Targeting subscription users:`, recipientUserIds.length);
    } else if (targetAudience.type === "user" && targetAudience.targetIds) {
      recipientUserIds = targetAudience.targetIds;
      console.log(`[${requestId}] Targeting specific users:`, recipientUserIds.length);
    }

    // Create recipient records
    if (recipientUserIds.length > 0) {
      await db.insert(announcementRecipients)
        .values(
          recipientUserIds.map(userId => ({
            announcementId: announcement.id,
            userId
          }))
        );
      console.log(`[${requestId}] Created recipient records for ${recipientUserIds.length} users`);
    } else {
      console.warn(`[${requestId}] No recipients found for announcement`);
    }

    res.json(announcement);
  } catch (error) {
    // Log the error with full context
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Announcement creation failed:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body
    });

    // Log error to database
    await db.insert(errorLogs).values({
      timestamp: new Date(),
      type: 'ANNOUNCEMENT_CREATION_ERROR',
      message: errorMessage,
      details: JSON.stringify({
        requestId,
        requestBody: req.body,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : String(error)
      })
    });

    res.status(400).json({ 
      status: 'error',
      message: "Error creating announcement",
      details: errorMessage,
      requestId
    });
  }
});

// Get announcements for a user
router.get("/announcements", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const announcements = await db.query.announcementRecipients.findMany({
      where: eq(announcementRecipients.userId, userId),
      with: {
        announcement: {
          with: {
            sender: {
              columns: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Error fetching announcements" });
  }
});

// Mark announcement as read
router.post("/announcements/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await db.update(announcementRecipients)
      .set({ 
        read: true,
        readAt: new Date()
      })
      .where(
        and(
          eq(announcementRecipients.announcementId, parseInt(id)),
          eq(announcementRecipients.userId, userId)
        )
      );

    res.json({ message: "Announcement marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating announcement status" });
  }
});

// Respond to an announcement
router.post("/announcements/:id/respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [response] = await db.insert(announcementResponses)
      .values({
        announcementId: parseInt(id),
        userId,
        content
      })
      .returning();

    res.json(response);
  } catch (error) {
    res.status(400).json({ 
      message: "Error creating response",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin: Get all responses
router.get("/admin/announcements/responses", async (req, res) => {
  try {
    const responses = await db.query.announcementResponses.findMany({
      with: {
        announcement: true,
        user: {
          columns: {
            id: true,
            username: true
          }
        }
      },
      orderBy: (responses, { desc }) => [desc(responses.createdAt)]
    });

    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching responses" });
  }
});

export default router;