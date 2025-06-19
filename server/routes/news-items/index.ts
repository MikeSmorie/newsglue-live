import express from 'express';
import { db } from '../../../db/index.js';
import { newsItems, campaigns } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

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

    // Verify campaign exists AND user owns it (critical security check)
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, campaignId),
        eq(campaigns.userId, req.user!.id)
      )
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found or access denied'
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

    // Verify user owns the campaign first (critical security check)
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, campaignId),
        eq(campaigns.userId, req.user!.id)
      )
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found or access denied'
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

// PUT /api/news-items/:id/status - Update news item status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid news item ID' });
    }

    const { status } = req.body;
    if (!['draft', 'sent', 'complete', 'error'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify user owns the news item through campaign ownership
    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, itemId),
      with: {
        campaign: true
      }
    });

    if (!newsItem || newsItem.campaign.userId !== req.user!.id) {
      return res.status(404).json({ error: 'News item not found or access denied' });
    }

    // Update status
    const [updatedItem] = await db.update(newsItems)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(newsItems.id, itemId))
      .returning();

    res.json({
      success: true,
      newsItem: updatedItem
    });
  } catch (error) {
    console.error('Error updating news item status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/news-items/:id - Update news item content
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid news item ID' });
    }

    const validation = manualSubmitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { headline, sourceUrl, content, type } = validation.data;

    // Verify user owns the news item through campaign ownership
    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, itemId),
      with: {
        campaign: true
      }
    });

    if (!newsItem || newsItem.campaign.userId !== req.user!.id) {
      return res.status(404).json({ error: 'News item not found or access denied' });
    }

    // Update news item
    const [updatedItem] = await db.update(newsItems)
      .set({
        headline,
        sourceUrl,
        content,
        contentType: type,
        updatedAt: new Date()
      })
      .where(eq(newsItems.id, itemId))
      .returning();

    res.json({
      success: true,
      message: 'News item updated successfully',
      newsItem: updatedItem
    });
  } catch (error) {
    console.error('Error updating news item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/news-items/:id - Delete single news item
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid news item ID' });
    }

    // Verify user owns the news item through campaign ownership
    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, itemId),
      with: {
        campaign: true
      }
    });

    if (!newsItem || newsItem.campaign.userId !== req.user!.id) {
      return res.status(404).json({ error: 'News item not found or access denied' });
    }

    // Delete news item
    await db.delete(newsItems).where(eq(newsItems.id, itemId));

    res.json({
      success: true,
      message: 'News item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting news item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/news-items/bulk - Bulk delete news items
router.delete('/bulk', requireAuth, async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Invalid item IDs array' });
    }

    // Verify user owns all news items through campaign ownership
    const newsItemsToDelete = await db.query.newsItems.findMany({
      where: and(
        eq(newsItems.id, itemIds[0]), // This will be modified below
      ),
      with: {
        campaign: true
      }
    });

    // Check ownership for all items
    for (const itemId of itemIds) {
      const item = await db.query.newsItems.findFirst({
        where: eq(newsItems.id, itemId),
        with: {
          campaign: true
        }
      });

      if (!item || item.campaign.userId !== req.user!.id) {
        return res.status(404).json({ 
          error: `News item ${itemId} not found or access denied` 
        });
      }
    }

    // Delete all verified items
    for (const itemId of itemIds) {
      await db.delete(newsItems).where(eq(newsItems.id, itemId));
    }

    res.json({
      success: true,
      message: `Successfully deleted ${itemIds.length} news items`,
      deletedCount: itemIds.length
    });
  } catch (error) {
    console.error('Error bulk deleting news items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;