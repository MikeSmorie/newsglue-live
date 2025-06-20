import express from 'express';
import { db } from '../../../db/index.js';
import { newsItems, campaigns } from '../../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import OpenAI from 'openai';
import { protectNewsItems } from '../../middleware/dataProtection';

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
router.put('/update-status/:id', requireAuth, protectNewsItems, async (req, res) => {
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
router.delete('/delete/:id', requireAuth, protectNewsItems, async (req, res) => {
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

    // Delete related records first to avoid foreign key constraint issues
    await db.execute(sql`DELETE FROM output_metrics WHERE news_item_id = ${itemId}`);
    
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
    
    // T3: API receives generate request
    const T3 = Date.now();
    console.log(`[LATENCY] T3: API received request at ${T3} (${new Date(T3).toISOString()}) for item ${itemId}`);
    console.time(`NewsJack-Backend-Processing-${itemId}`);

    // Verify user owns the news item through campaign ownership and get channels
    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, itemId),
      with: {
        campaign: {
          with: {
            channels: true
          }
        }
      }
    });

    if (!newsItem || newsItem.campaign.userId !== req.user!.id) {
      return res.status(404).json({ error: 'News item not found or access denied' });
    }

    const campaign = newsItem.campaign;
    const startTime = T3;

    // Get enabled platforms from campaign channels, always include blog
    let platforms = ['blog']; // Always include blog for NewsJack methodology
    
    if (campaign.channels && campaign.channels.length > 0) {
      const enabledChannels = campaign.channels
        .filter(channel => channel.enabled)
        .map(channel => channel.platform);
      platforms = [...platforms, ...enabledChannels];
      console.log('Using configured platforms:', platforms);
    } else {
      // If no channels configured, use defaults
      platforms = ['blog', 'twitter', 'linkedin', 'instagram', 'facebook'];
      console.log('No platforms configured, using defaults:', platforms);
    }
    
    // Always ensure blog is included if not already present
    if (!platforms.includes('blog')) {
      platforms.unshift('blog');
      console.log('Added blog platform to generation:', platforms);
    }

    // Track processing time
    const processingStartTime = Date.now();
    
    // Preserve existing platform outputs but reset landing page status for republishing
    const existingOutputs = newsItem.platformOutputs as any || {};
    const platformOutputs: any = {};
    let totalTokens = 0;

    // Get social settings from campaign
    const socialSettings = campaign.socialSettings as any || {};
    
    // Generate platform-specific content generation functions
    const generatePlatformContent = async (platform: string) => {
      const platformConfig = socialSettings.channelConfig?.[platform] || {};
      const newsRatio = 50; // Default news ratio
      const campaignRatio = 100 - newsRatio;

      // Get platform-specific character/word limits
      const getPlatformLimit = (platform: string) => {
        switch (platform) {
          case 'blog': return '1200-2000 words (comprehensive article)';
          case 'twitter': return '280 characters';
          case 'linkedin': return '3000 characters';
          case 'instagram': return '2200 characters';
          case 'facebook': return '63206 characters';
          case 'youtube': return '5000 characters (description)';
          case 'tiktok': return '150 characters (caption)';
          default: return '1000 characters';
        }
      };

      const prompt = `You are a NewsJack content strategist. Generate compelling ${platform} content that follows this methodology:

PRIMARY OBJECTIVE: Start with the news. Frame the tension. Introduce the campaign. Drive urgency. Include campaign CTA.

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
- Target Length: ${getPlatformLimit(platform)}
- News/Campaign Ratio: ${newsRatio}% news focus, ${campaignRatio}% campaign focus
- Tone: ${platformConfig?.tone || 'Professional'}

CONTENT STRUCTURE:
1. Open with compelling news angle (hook readers immediately)
2. Frame the tension/implications of the news
3. Bridge to how this affects the target audience 
4. Introduce the campaign as the solution
5. Drive urgency for immediate action
6. End with clear CTA including the campaign URL: ${campaign.ctaUrl || campaign.websiteUrl || 'Learn more'}

CRITICAL: Always include the campaign CTA URL (${campaign.ctaUrl || campaign.websiteUrl}) in your response.

Respond with JSON in this format:
{
  "content": "Your generated content here - ${platform === 'blog' ? 'Write a comprehensive 1200-2000 word article with multiple sections, subheadings (use ## for H2, ### for H3), bullet points, and in-depth analysis. Include introduction, main body with detailed explanations, examples, and conclusion. Use markdown formatting for structure.' : 'concise and platform-optimized'}",
  "hashtags": ["relevant", "hashtags", "for", "the", "platform"],
  "cta": "Call-to-action with URL: ${campaign.ctaUrl || campaign.websiteUrl || 'Learn more'}",
  "ctaUrl": "${campaign.ctaUrl || campaign.websiteUrl || ''}",
  "metrics": {
    "newsPercentage": ${newsRatio},
    "campaignPercentage": ${campaignRatio},
    "estimatedEngagement": "high/medium/low"
  }
}`;

      try {
        // Start AI processing timer for this platform
        const aiStartTime = Date.now();
        console.log(`[LATENCY] AI Processing started for ${platform} at ${aiStartTime} (${new Date(aiStartTime).toISOString()})`);
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: platform === 'blog' ? 4000 : 1000
        });
        
        // End AI processing timer for this platform
        const aiEndTime = Date.now();
        console.log(`[LATENCY] AI Processing completed for ${platform} at ${aiEndTime} - Duration: ${aiEndTime - aiStartTime}ms`);

        let generatedContent;
        try {
          generatedContent = JSON.parse(response.choices[0].message.content || '{}');
        } catch (parseError) {
          console.error(`Error parsing JSON for ${platform}:`, parseError);
          // Fallback content if JSON parsing fails
          generatedContent = {
            content: response.choices[0].message.content || `Error generating ${platform} content`,
            hashtags: [],
            cta: "Learn more about our solution",
            metrics: { newsPercentage: 50, campaignPercentage: 50, estimatedEngagement: "medium" }
          };
        }

        const platformOutput = {
          ...generatedContent,
          generatedAt: new Date().toISOString(),
          platform,
          config: platformConfig,
          tokens: response.usage?.total_tokens || 0
        };

        // Reset landing page status for blog platform to allow republishing
        if (platform === 'blog') {
          platformOutput.landingPageStatus = 'unpublished';
          platformOutput.landingPageSlug = null;
          platformOutput.landingPageUrl = null;
          platformOutput.landingPagePublishedAt = null;
        }

        return { platform, content: platformOutput, tokens: response.usage?.total_tokens || 0 };
      } catch (error) {
        console.error(`Error generating content for ${platform}:`, error);
        const errorOutput = {
          error: 'Failed to generate content',
          platform,
          config: platformConfig,
          tokens: 0
        };

        // Reset landing page status even on error for blog platform
        if (platform === 'blog') {
          errorOutput.landingPageStatus = 'unpublished';
          errorOutput.landingPageSlug = null;
          errorOutput.landingPageUrl = null;
          errorOutput.landingPagePublishedAt = null;
        }

        return { platform, content: errorOutput, tokens: 0 };
      }
    };

    // Store progress tracking in memory for this generation
    const generationProgress = {};
    platforms.forEach(platform => {
      generationProgress[platform] = false;
    });
    
    // Store progress globally for polling endpoint
    global[`generation_progress_${itemId}`] = generationProgress;
    
    // Enhanced platform content generation with progress tracking
    const generatePlatformContentWithProgress = async (platform: string) => {
      const result = await generatePlatformContent(platform);
      // Mark platform as completed
      generationProgress[platform] = true;
      global[`generation_progress_${itemId}`] = {...generationProgress};
      return result;
    };

    // Execute all platform generations in parallel
    console.log(`[LATENCY] Starting parallel AI generation for platforms: ${platforms.join(', ')}`);
    const parallelStartTime = Date.now();
    
    const platformResults = await Promise.all(
      platforms.map(platform => generatePlatformContentWithProgress(platform))
    );
    
    const parallelEndTime = Date.now();
    console.log(`[LATENCY] Parallel AI generation completed in ${parallelEndTime - parallelStartTime}ms`);
    
    // Clean up progress tracking
    delete global[`generation_progress_${itemId}`];

    // Process results and build platform outputs
    platformResults.forEach(result => {
      platformOutputs[result.platform] = result.content;
      totalTokens += result.tokens;
    });

    // T4: AI response completed and returned to client
    const T4 = Date.now();
    const processingTimeSeconds = Math.round((T4 - T3) / 1000);
    
    console.log(`[LATENCY] T4: AI processing completed at ${T4} (${new Date(T4).toISOString()})`);
    console.log(`[LATENCY] Total Backend Processing Time: ${T4 - T3}ms`);
    console.log(`[LATENCY] Database operations time: ${Date.now() - T4}ms`);
    console.timeEnd(`NewsJack-Backend-Processing-${itemId}`);
    
    // Generate comprehensive latency breakdown
    const latencyBreakdown = {
      totalBackendTime: T4 - T3,
      aiProcessingTime: T4 - T3, // Most of backend time is AI processing
      platformsProcessed: platforms.length,
      avgTimePerPlatform: Math.round((T4 - T3) / platforms.length),
      timestamp: new Date().toISOString()
    };
    
    const generationMetrics = {
      totalTokens,
      generationTime: T4 - T3,
      platformsGenerated: platforms.length,
      latencyBreakdown,
      timestamp: new Date().toISOString()
    };

    // Update news item with generated content and processing time
    const [updatedItem] = await db.update(newsItems)
      .set({
        platformOutputs,
        generationMetrics,
        processingTimeSeconds,
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(newsItems.id, itemId))
      .returning();

    console.log(`[LATENCY] Database update completed - Total request duration: ${Date.now() - T3}ms`);

    res.json({
      success: true,
      newsItem: updatedItem,
      platformOutputs,
      metrics: generationMetrics,
      latencyBreakdown
    });
  } catch (error) {
    console.error('Error generating newsjacks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/queue/generation-progress/:id - Get real-time generation progress
router.get('/generation-progress/:id', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const progress = global[`generation_progress_${itemId}`] || {};
    
    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error fetching generation progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/queue/update-content/:id - Update platform content manually
router.put('/update-content/:id', requireAuth, protectNewsItems, async (req, res) => {
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