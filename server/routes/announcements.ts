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
import { z } from "zod";

const router = express.Router();

// Zod schema for announcement validation
const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.string().min(1, "Content is required").max(10000, "Content is too long"),
  importance: z.enum(["normal", "important", "urgent"], {
    required_error: "Please select importance level",
  }),
  targetAudience: z.object({
    type: z.enum(["all", "subscription", "user"], {
      required_error: "Please select target audience type",
    }),
    targetIds: z.array(z.number()).optional(),
  }).refine(data => {
    if (data.type !== "all" && (!data.targetIds || data.targetIds.length === 0)) {
      return false;
    }
    return true;
  }, "Please select at least one target recipient"),
  startDate: z.string({
    required_error: "Start date is required",
  }).refine(date => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date(Date.now() - 24 * 60 * 60 * 1000);
  }, "Start date must be valid and not in the past"),
  endDate: z.string().optional(),
});

// Create a new announcement
router.post("/admin/announcements", async (req, res) => {
  const requestId = Date.now().toString();

  try {
    // Step 1: Log raw request
    console.log(`[${requestId}] Raw announcement request:`, {
      headers: req.headers,
      body: JSON.stringify(req.body, null, 2)
    });

    // Step 2: Validate request body against schema
    const validationResult = announcementSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map(i => i.message).join(", "));
    }

    const validatedData = validationResult.data;
    const senderId = req.user?.id;

    if (!senderId) {
      throw new Error("Unauthorized - No sender ID found");
    }

    // Step 3: Log validated data
    console.log(`[${requestId}] Validated announcement data:`, {
      ...validatedData,
      senderId
    });

    // Step 4: Create the announcement
    const [announcement] = await db.insert(adminAnnouncements)
      .values({
        title: validatedData.title,
        content: validatedData.content,
        importance: validatedData.importance,
        senderId,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        requiresResponse: false,
        targetAudience: validatedData.targetAudience
      })
      .returning();

    console.log(`[${requestId}] Announcement created:`, announcement);

    // Step 5: Get target recipients based on audience type
    let recipientUserIds: number[] = [];

    if (validatedData.targetAudience.type === "all") {
      const allUsers = await db.query.users.findMany({
        columns: { id: true }
      });
      recipientUserIds = allUsers.map(user => user.id);
      console.log(`[${requestId}] Targeting all users:`, recipientUserIds.length);
    } else if (validatedData.targetAudience.type === "subscription" && validatedData.targetAudience.targetIds) {
      const subscriptionUsers = await db.query.userSubscriptions.findMany({
        where: inArray(userSubscriptions.planId, validatedData.targetAudience.targetIds),
        columns: { userId: true }
      });
      recipientUserIds = subscriptionUsers.map(sub => sub.userId);
      console.log(`[${requestId}] Targeting subscription users:`, recipientUserIds.length);
    } else if (validatedData.targetAudience.type === "user" && validatedData.targetAudience.targetIds) {
      recipientUserIds = validatedData.targetAudience.targetIds;
      console.log(`[${requestId}] Targeting specific users:`, recipientUserIds.length);
    }

    // Step 6: Create recipient records
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

    // Step 7: Return success response
    res.json({
      status: 'success',
      data: announcement,
      requestId,
      timestamp: new Date().toISOString()
    });
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
      errorMessage,
      location: 'announcement_creation',
      timestamp: new Date(),
      stackTrace: error instanceof Error ? error.stack : undefined
    });

    res.status(400).json({ 
      status: 'error',
      message: "Failed to create announcement",
      details: errorMessage,
      requestId,
      timestamp: new Date().toISOString()
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