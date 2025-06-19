import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems, users, campaigns } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { generateLandingPageContent, generateLandingPageContentLegacy } from '../services/landing-page-service.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// Simple auth check
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

// POST /api/landing-page/generate - Generate landing page content
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { headline, content, campaignData } = req.body;
    
    if (!headline || !content) {
      return res.status(400).json({ error: 'Headline and content are required' });
    }

    const landingPageContent = await generateLandingPageContentLegacy(headline, content, campaignData);
    
    res.json({
      success: true,
      content: landingPageContent
    });
  } catch (error) {
    console.error('Error generating landing page:', error);
    res.status(500).json({ error: 'Failed to generate landing page content' });
  }
});

// POST /api/landing-page/:newsjackId/toggle - Toggle landing page publication with dual-path approach
router.post('/:newsjackId/toggle', requireAuth, async (req, res) => {
  try {
    const { newsjackId } = req.params;
    const userId = req.user!.id;

    // Find the news item and verify ownership through campaign
    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, parseInt(newsjackId)),
      with: {
        campaign: true
      }
    });

    if (!newsItem || newsItem.campaign.userId !== userId) {
      return res.status(404).json({ error: 'News item not found or access denied' });
    }

    // Check if blog content exists in platformOutputs
    const platformOutputs = newsItem.platformOutputs as any;
    const blogContent = platformOutputs?.blog?.content;
    
    if (!blogContent) {
      return res.status(400).json({ error: 'No blog content available for this news item' });
    }

    // Use the dual-path landing page service
    const result = await generateLandingPageContent(parseInt(newsjackId));

    res.json({
      success: true,
      status: result.status,
      slug: result.slug,
      url: result.url
    });

  } catch (error) {
    console.error('Error toggling landing page:', error);
    
    // Reset status on error
    try {
      const newsItem = await db.query.newsItems.findFirst({
        where: eq(newsItems.id, parseInt(req.params.newsjackId))
      });
      
      if (newsItem) {
        const platformOutputs = newsItem.platformOutputs as any;
        await db.update(newsItems)
          .set({
            platformOutputs: {
              ...platformOutputs,
              blog: {
                ...platformOutputs.blog,
                landingPageStatus: 'unpublished'
              }
            }
          })
          .where(eq(newsItems.id, parseInt(req.params.newsjackId)));
      }
    } catch (resetError) {
      console.error('Error resetting status:', resetError);
    }
    
    res.status(500).json({ error: 'Failed to toggle landing page' });
  }
});

// GET /api/landing-page/:newsjackId/status - Get landing page status
router.get('/:newsjackId/status', requireAuth, async (req, res) => {
  try {
    const { newsjackId } = req.params;
    const userId = req.user!.id;

    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, parseInt(newsjackId)),
      with: {
        campaign: true
      }
    });

    if (!newsItem || newsItem.campaign.userId !== userId) {
      return res.status(404).json({ error: 'News item not found or access denied' });
    }

    const platformOutputs = newsItem.platformOutputs as any;
    const blogData = platformOutputs?.blog || {};

    res.json({
      success: true,
      status: blogData.landingPageStatus || 'unpublished',
      slug: blogData.landingPageSlug || null,
      url: blogData.landingPageUrl || null
    });

  } catch (error) {
    console.error('Error getting landing page status:', error);
    res.status(500).json({ error: 'Failed to get landing page status' });
  }
});

export default router;