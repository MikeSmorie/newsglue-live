import express from "express";
import { db } from "@db";
import { 
  adminAnnouncements, 
  announcementRecipients,
  users,
  errorLogs 
} from "@db/schema";

const router = express.Router();

// Create a new announcement with form-data handling
router.post("/admin/announcements", async (req, res) => {
  const requestId = Date.now().toString();

  try {
    // Step 1: Log raw request data
    console.log(`[${requestId}] Raw request body:`, {
      body: req.body,
      contentType: req.headers['content-type']
    });

    // Step 2: Extract and validate form fields
    const { title, content } = req.body;

    if (!title?.trim()) {
      throw new Error('Title is required');
    }

    if (!content?.trim()) {
      throw new Error('Content is required');
    }

    // Step 3: Log validated data
    console.log(`[${requestId}] Validated fields:`, {
      title: title.trim(),
      content: content.trim()
    });

    const senderId = req.user?.id;
    if (!senderId) {
      throw new Error("Unauthorized - No sender ID found");
    }

    // Step 4: Create basic announcement
    const [announcement] = await db.insert(adminAnnouncements)
      .values({
        title: title.trim(),
        content: content.trim(),
        importance: 'normal',
        senderId,
        startDate: new Date(),
        targetAudience: { type: 'all' }
      })
      .returning();

    console.log(`[${requestId}] Created announcement:`, announcement);

    // Step 5: Add all users as recipients
    const allUsers = await db.query.users.findMany({
      columns: { id: true }
    });

    await db.insert(announcementRecipients)
      .values(
        allUsers.map(user => ({
          announcementId: announcement.id,
          userId: user.id
        }))
      );

    console.log(`[${requestId}] Added ${allUsers.length} recipients`);

    // Step 6: Return success response
    res.json({
      status: 'success',
      message: 'Announcement created successfully',
      data: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content
      }
    });

  } catch (error) {
    // Log error details
    console.error(`[${requestId}] Error creating announcement:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Log to database
    await db.insert(errorLogs).values({
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      location: 'announcement_creation',
      timestamp: new Date(),
      stackTrace: error instanceof Error ? error.stack : undefined
    });

    // Return clear error message
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create announcement',
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
      .where(eq(announcementRecipients.announcementId, parseInt(id)))
      .where(eq(announcementRecipients.userId, userId));

    res.json({ message: "Announcement marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating announcement status" });
  }
});

export default router;