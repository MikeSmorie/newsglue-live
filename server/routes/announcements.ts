import express from "express";
import { db } from "@db";
import { messages } from "@db/schema";

const router = express.Router();

// Create announcement - accepts only form data
router.post("/messages", async (req, res) => {
  try {
    const title = req.body.title;
    const content = req.body.content;

    if (!title || !content) {
      return res.status(400).send('Title and content are required');
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        title,
        content,
        createdAt: new Date()
      })
      .returning();

    console.log('Created message:', newMessage);

    res.status(200).send('OK');

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
    res.send(allMessages);
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    res.status(500).send('Failed to fetch announcements');
  }
});

export default router;