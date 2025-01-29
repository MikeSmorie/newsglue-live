import express from "express";
import { db } from "@db";
import { messages } from "@db/schema";

const router = express.Router();

// Debug logging middleware
router.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('\n=== ANNOUNCEMENT REQUEST DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('================================\n');
  }
  next();
});

// Create announcement - accepts only form data
router.post("/messages", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).send('Title and content are required');
    }

    const [message] = await db.insert(messages)
      .values({
        title,
        content,
        createdAt: new Date()
      })
      .returning();

    res.json({ 
      status: 'success',
      message: 'Announcement created',
      data: message 
    });

  } catch (error) {
    console.error('Failed to create announcement:', error);
    res.status(500).send('Failed to create announcement');
  }
});

// Get all announcements
router.get("/messages", async (req, res) => {
  try {
    const allMessages = await db.query.messages.findMany({
      orderBy: (messages, { desc }) => [desc(messages.createdAt)]
    });
    res.json(allMessages);
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    res.status(500).send('Failed to fetch announcements');
  }
});

export default router;