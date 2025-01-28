import express from "express";
import { db } from "@db";
import { 
  adminAnnouncements, 
  announcementRecipients, 
  announcementResponses,
  userSubscriptions,
  users
} from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = express.Router();

// Create a new announcement
router.post("/admin/announcements", async (req, res) => {
  try {
    const { title, content, importance, expiresAt, requiresResponse, targetAudience } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Create the announcement
    const [announcement] = await db.insert(adminAnnouncements)
      .values({
        title,
        content,
        importance,
        senderId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        requiresResponse,
        targetAudience
      })
      .returning();

    // Get target recipients based on audience type
    let recipientUserIds: number[] = [];
    
    if (targetAudience.type === "all") {
      const allUsers = await db.query.users.findMany({
        columns: { id: true }
      });
      recipientUserIds = allUsers.map(user => user.id);
    } else if (targetAudience.type === "subscription" && targetAudience.targetIds) {
      const subscriptionUsers = await db.query.userSubscriptions.findMany({
        where: inArray(userSubscriptions.planId, targetAudience.targetIds),
        columns: { userId: true }
      });
      recipientUserIds = subscriptionUsers.map(sub => sub.userId);
    } else if (targetAudience.type === "user" && targetAudience.targetIds) {
      recipientUserIds = targetAudience.targetIds;
    }

    // Create recipient records
    await db.insert(announcementRecipients)
      .values(
        recipientUserIds.map(userId => ({
          announcementId: announcement.id,
          userId
        }))
      );

    res.json(announcement);
  } catch (error) {
    res.status(400).json({ 
      message: "Error creating announcement",
      error: error instanceof Error ? error.message : String(error)
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
