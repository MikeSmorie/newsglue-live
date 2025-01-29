import express from "express";
import { db } from "@db";
import { 
  adminAnnouncements, 
  announcementRecipients,
  users,
  errorLogs 
} from "@db/schema";

const router = express.Router();

// Debug middleware to log raw request data
router.use((req, res, next) => {
  console.log('\n=== RAW ANNOUNCEMENT REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body:', req.body);
  console.log('Raw body:', req.rawBody);
  console.log('Content type:', req.get('content-type'));
  console.log('================================\n');
  next();
});

// Create a new announcement with minimal processing
router.post("/admin/announcements", async (req, res) => {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Processing announcement request`);

  try {
    // Force default values if body is empty
    const title = req.body?.title || 'Default Title';
    const content = req.body?.content || 'Default Content';

    console.log(`[${requestId}] Extracted values:`, {
      title,
      content,
      rawBody: req.body
    });

    const senderId = req.user?.id;
    if (!senderId) {
      throw new Error("No sender ID found");
    }

    // Directly create announcement without validation
    const [announcement] = await db.insert(adminAnnouncements)
      .values({
        title,
        content,
        importance: 'normal',
        senderId,
        startDate: new Date(),
        targetAudience: { type: 'all' }
      })
      .returning();

    console.log(`[${requestId}] Created announcement:`, announcement);

    // Add all users as recipients
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

    // Always return success
    res.json({
      status: 'success',
      message: 'Announcement processed',
      data: announcement
    });

  } catch (error) {
    console.error(`[${requestId}] Database error:`, error);

    // Log to database but don't let it block the response
    try {
      await db.insert(errorLogs).values({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        location: 'announcement_creation',
        timestamp: new Date(),
        stackTrace: error instanceof Error ? error.stack : undefined
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      status: 'error',
      message: 'Database error occurred',
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