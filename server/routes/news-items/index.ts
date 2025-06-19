import express from 'express';
import { db } from '../../../db/index.js';
import { newsItems, campaigns } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// Schema for manual news submission
const manualSubmitSchema = z.object({
  campaignId: z.string().uuid(),
  headline: z.string().min(1, "Headline is required"),
  sourceUrl: z.string().url("Valid URL is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(['external', 'internal']).default('external')
});

// POST /api/news-items/manual-submit - Submit news item to Module 6 queue
router.post('/manual-submit', async (req, res) => {
  try {
    // Validate request body
    const validation = manualSubmitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { campaignId, headline, sourceUrl, content, type } = validation.data;

    // Verify campaign exists
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId)
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Insert news item into Module 6 queue
    const [newNewsItem] = await db.insert(newsItems).values({
      campaignId,
      headline,
      sourceUrl,
      content,
      contentType: type,
      status: 'draft'
    }).returning();

    return res.status(201).json({
      success: true,
      message: 'News item queued for execution',
      newsItem: {
        id: newNewsItem.id,
        campaignId: newNewsItem.campaignId,
        headline: newNewsItem.headline,
        sourceUrl: newNewsItem.sourceUrl,
        contentType: newNewsItem.contentType,
        status: newNewsItem.status,
        createdAt: newNewsItem.createdAt
      }
    });

  } catch (error) {
    console.error('[News Items] Manual submit error:', error);
    return res.status(500).json({
      error: 'Failed to submit news item',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/news-items/:campaignId - Get news items for a campaign
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Validate campaign ID format
    if (!campaignId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) {
      return res.status(400).json({
        error: 'Invalid campaign ID format'
      });
    }

    // Get news items for campaign
    const items = await db.query.newsItems.findMany({
      where: eq(newsItems.campaignId, campaignId),
      orderBy: (newsItems, { desc }) => [desc(newsItems.createdAt)]
    });

    return res.status(200).json({
      success: true,
      newsItems: items
    });

  } catch (error) {
    console.error('[News Items] Fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch news items',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;