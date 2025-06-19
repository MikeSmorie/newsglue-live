import express from 'express';
import { db } from '../../../db/index.js';
import { newsItems, campaigns } from '../../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import OpenAI from 'openai';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET /api/queue/fetch/:campaignId - Get all news items for campaign
router.get('/fetch/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Verify user owns the campaign
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, campaignId),
        eq(campaigns.userId, req.user!.id)
      )
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Get all news items for the campaign
    const items = await db.query.newsItems.findMany({
      where: eq(newsItems.campaignId, campaignId),
      orderBy: [desc(newsItems.createdAt)]
    });

    res.json({
      success: true,
      newsItems: items,
      count: items.length
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/queue/update-status/:id - Update news item status
router.put('/update-status/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['draft', 'active', 'archived', 'bin'].includes(status)) {
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
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/queue/delete/:id - Delete news item from queue
router.delete('/delete/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

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
      message: 'News item deleted from queue'
    });
  } catch (error) {
    console.error('Error deleting from queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/queue/generate-newsjacks/:id - Generate newsjack content for all platforms
router.post('/generate-newsjacks/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

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

    const campaign = newsItem.campaign;
    const startTime = Date.now();

    // Get campaign's social settings to determine platforms
    const socialSettings = campaign.socialSettings as any || {};
    const platforms = Object.keys(socialSettings).filter(platform => 
      socialSettings[platform]?.enabled
    );

    if (platforms.length === 0) {
      return res.status(400).json({ 
        error: 'No platforms enabled for this campaign. Please configure platforms in Module 2.' 
      });
    }

    const platformOutputs: any = {};
    let totalTokens = 0;

    // Generate content for each enabled platform
    for (const platform of platforms) {
      const platformConfig = socialSettings[platform];
      const newsRatio = platformConfig?.newsRatio || 50;
      const campaignRatio = 100 - newsRatio;

      const prompt = `You are a NewsJack content strategist. Generate compelling ${platform} content that follows this methodology:

PRIMARY OBJECTIVE: Start with the news. Frame the tension. Introduce the campaign. Drive urgency. Use channel-specific tone.

NEWS CONTEXT:
Headline: ${newsItem.headline}
Content: ${newsItem.content}
Source: ${newsItem.sourceUrl}

CAMPAIGN CONTEXT:
Campaign: ${campaign.campaignName}
Website: ${campaign.websiteUrl || 'Not provided'}
CTA URL: ${campaign.ctaUrl || 'Not provided'}
Emotional Objective: ${campaign.emotionalObjective || 'Not provided'}
Audience Pain: ${campaign.audiencePain || 'Not provided'}

PLATFORM REQUIREMENTS:
- Platform: ${platform}
- News/Campaign Ratio: ${newsRatio}% news focus, ${campaignRatio}% campaign focus
- Tone: ${platformConfig?.tone || 'Professional'}
- Character Limit: ${platformConfig?.characterLimit || 'No limit'}

Generate ${platform}-optimized content that:
1. Opens with the news angle to grab attention
2. Creates tension around the implications
3. Seamlessly introduces the campaign as the solution
4. Drives urgency for immediate action
5. Uses platform-appropriate formatting and tone

Respond with JSON in this format:
{
  "content": "Your generated content here",
  "hashtags": ["relevant", "hashtags"],
  "cta": "Clear call-to-action",
  "metrics": {
    "newsPercentage": ${newsRatio},
    "campaignPercentage": ${campaignRatio},
    "estimatedEngagement": "high/medium/low"
  }
}`;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1000
        });

        const generatedContent = JSON.parse(response.choices[0].message.content || '{}');
        totalTokens += response.usage?.total_tokens || 0;

        platformOutputs[platform] = {
          ...generatedContent,
          generatedAt: new Date().toISOString(),
          platform,
          config: platformConfig
        };
      } catch (error) {
        console.error(`Error generating content for ${platform}:`, error);
        platformOutputs[platform] = {
          error: 'Failed to generate content',
          platform,
          config: platformConfig
        };
      }
    }

    const endTime = Date.now();
    const generationMetrics = {
      totalTokens,
      generationTime: endTime - startTime,
      platformsGenerated: platforms.length,
      timestamp: new Date().toISOString()
    };

    // Update news item with generated content
    const [updatedItem] = await db.update(newsItems)
      .set({
        platformOutputs,
        generationMetrics,
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(newsItems.id, itemId))
      .returning();

    res.json({
      success: true,
      newsItem: updatedItem,
      platformOutputs,
      metrics: generationMetrics
    });
  } catch (error) {
    console.error('Error generating newsjacks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/queue/update-content/:id - Update platform content manually
router.put('/update-content/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { platform, content } = req.body;

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

    // Update platform content
    const currentOutputs = (newsItem.platformOutputs as any) || {};
    currentOutputs[platform] = {
      ...currentOutputs[platform],
      ...content,
      lastModified: new Date().toISOString(),
      manuallyEdited: true
    };

    const [updatedItem] = await db.update(newsItems)
      .set({
        platformOutputs: currentOutputs,
        updatedAt: new Date()
      })
      .where(eq(newsItems.id, itemId))
      .returning();

    res.json({
      success: true,
      newsItem: updatedItem
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;