import express from 'express';
import { z } from 'zod';
import { db } from '../../../db';
import { campaignChannels, campaigns } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = express.Router();

// Available social platforms with NewsJack methodology focus
const AVAILABLE_PLATFORMS = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Perfect for breaking news reactions and real-time newsjacking with immediate viral potential.',
    icon: 'Twitter',
    maxLength: 280,
    style: 'Urgent breaking news tone with emotional hooks and trending hashtags'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional newsjacking with industry analysis and business implications of current events.',
    icon: 'Linkedin',
    maxLength: 3000,
    style: 'Thought leadership angle on news events with professional insights'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Visual news storytelling that connects current events to personal experiences and emotions.',
    icon: 'Instagram',
    maxLength: 2200,
    style: 'Visual storytelling that connects news to lifestyle and personal impact'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Community-focused news discussion with detailed context and engagement around current events.',
    icon: 'Facebook',
    maxLength: 63206,
    style: 'Community conversation starter with detailed news analysis and discussion'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'In-depth news analysis and educational content that positions your solution as the answer.',
    icon: 'Youtube',
    maxLength: 5000,
    style: 'Educational deep-dive into news implications with clear value proposition'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Viral news reactions with trending audio that creates immediate emotional connection.',
    icon: 'Video',
    maxLength: 150,
    style: 'Fast-paced news reaction with emotional storytelling and viral elements'
  },
  {
    id: 'blog',
    name: 'Blog',
    description: 'Long-form newsjacking content with SEO optimization and detailed analysis that establishes authority.',
    icon: 'FileText',
    maxLength: 10000,
    style: 'Authoritative, SEO-optimized content that positions news within broader industry context'
  }
];

// Validation schema for updating campaign channels
const updateChannelsSchema = z.object({
  platforms: z.array(z.string()).default([])
});

// GET /api/campaign-channels/platforms - Get available platforms
router.get('/platforms', requireAuth, async (req, res) => {
  try {
    res.json(AVAILABLE_PLATFORMS);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

// GET /api/campaign-channels/:campaignId - Get channels for a campaign
router.get('/:campaignId', requireAuth, async (req, res) => {
  try {
    // Verify campaign belongs to user
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, req.params.campaignId),
        eq(campaigns.userId, req.user!.id)
      ),
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const channels = await db.query.campaignChannels.findMany({
      where: eq(campaignChannels.campaignId, req.params.campaignId),
    });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching campaign channels:', error);
    res.status(500).json({ error: 'Failed to fetch campaign channels' });
  }
});

// PUT /api/campaign-channels/:campaignId - Update channels for a campaign
router.put('/:campaignId', requireAuth, async (req, res) => {
  try {
    const validatedData = updateChannelsSchema.parse(req.body);
    
    // Verify campaign belongs to user
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, req.params.campaignId),
        eq(campaigns.userId, req.user!.id)
      ),
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Validate platforms exist
    const validPlatforms = AVAILABLE_PLATFORMS.map(p => p.id);
    const invalidPlatforms = validatedData.platforms.filter(p => !validPlatforms.includes(p));
    
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid platforms', 
        invalid: invalidPlatforms 
      });
    }

    // Delete existing channels for this campaign
    await db.delete(campaignChannels)
      .where(eq(campaignChannels.campaignId, req.params.campaignId));

    // Insert new channels
    if (validatedData.platforms.length > 0) {
      const channelData = validatedData.platforms.map(platform => ({
        campaignId: req.params.campaignId,
        platform,
        enabled: true,
      }));

      await db.insert(campaignChannels).values(channelData);
    }

    // Fetch updated channels
    const updatedChannels = await db.query.campaignChannels.findMany({
      where: eq(campaignChannels.campaignId, req.params.campaignId),
    });

    res.json(updatedChannels);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating campaign channels:', error);
    res.status(500).json({ error: 'Failed to update campaign channels' });
  }
});

export default router;