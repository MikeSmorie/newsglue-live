import express from 'express';
import { z } from 'zod';
import { db } from '../../../db';
import { campaigns, campaignChannels, insertCampaignSchema } from '../../../db/schema';
import { eq, and, like, desc, asc } from 'drizzle-orm';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = express.Router();

// Validation schema for campaign creation/update - NewsJack focused
const campaignCreateSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  website_url: z.string().optional(),
  cta_url: z.string().optional(),
  emotional_objective: z.string().optional(),
  audience_pain: z.string().optional(),
  additional_data: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional().default("draft"),
  platforms: z.array(z.string()).optional(),
});

const campaignUpdateSchema = z.object({
  name: z.string().min(1, "Campaign name is required").optional(),
  website_url: z.string().optional(),
  cta_url: z.string().optional(),
  emotional_objective: z.string().optional(),
  audience_pain: z.string().optional(),
  additional_data: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

// GET /api/campaigns - List all campaigns for authenticated user with search and filter
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, status, sort = 'newest' } = req.query;
    
    // Build where conditions
    const conditions = [eq(campaigns.userId, req.user!.id)];
    if (search) {
      conditions.push(like(campaigns.campaignName, `%${search}%`));
    }
    if (status) {
      conditions.push(eq(campaigns.status, status as string));
    }

    // Determine sort order
    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = [asc(campaigns.createdAt)];
        break;
      case 'a-z':
        orderBy = [asc(campaigns.campaignName)];
        break;
      case 'z-a':
        orderBy = [desc(campaigns.campaignName)];
        break;
      default: // newest
        orderBy = [desc(campaigns.createdAt)];
    }

    const userCampaigns = await db.query.campaigns.findMany({
      where: and(...conditions),
      orderBy,
      with: {
        channels: true,
      },
    });

    res.json(userCampaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id - Get specific campaign
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ),
      with: {
        channels: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', requireAuth, async (req, res) => {
  try {
    const validatedData = campaignCreateSchema.parse(req.body);
    
    const newCampaign = await db.insert(campaigns).values({
      campaignName: validatedData.name,
      name: null, // Set to null to avoid constraint violation
      status: validatedData.status || "draft",
      websiteUrl: validatedData.website_url || null,
      ctaUrl: validatedData.cta_url || null,
      emotionalObjective: validatedData.emotional_objective || null,
      audiencePain: validatedData.audience_pain || null,
      additionalData: validatedData.additional_data || null,
      userId: req.user!.id,
    }).returning();

    res.status(201).json(newCampaign[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const validatedData = campaignCreateSchema.parse(req.body);
    
    // Check if campaign exists and belongs to user
    const existingCampaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ),
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updatedCampaign = await db.update(campaigns)
      .set({
        campaignName: validatedData.name,
        websiteUrl: validatedData.website_url || null,
        ctaUrl: validatedData.cta_url || null,
        emotionalObjective: validatedData.emotional_objective || null,
        audiencePain: validatedData.audience_pain || null,
        additionalData: validatedData.additional_data || null,
        status: validatedData.status || "draft",
        updatedAt: new Date(),
      })
      .where(and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ))
      .returning();

    // Handle platform channels if provided
    if (validatedData.platforms && Array.isArray(validatedData.platforms)) {
      // Delete existing channels for this campaign
      await db.delete(campaignChannels)
        .where(eq(campaignChannels.campaignId, req.params.id));
      
      // Insert new channels
      if (validatedData.platforms.length > 0) {
        for (const platform of validatedData.platforms) {
          await db.insert(campaignChannels).values({
            campaignId: req.params.id,
            platform: platform,
            enabled: true,
          });
        }
      }
    }

    res.json(updatedCampaign[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check if campaign exists and belongs to user
    const existingCampaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ),
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await db.delete(campaigns)
      .where(and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ));

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// POST /api/campaigns/:id/clone - Clone a campaign
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const originalCampaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ),
      with: {
        channels: true,
      },
    });

    if (!originalCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const clonedCampaign = await db.insert(campaigns).values({
      campaignName: `${originalCampaign.campaignName} (Copy)`,
      name: null,
      status: 'draft',
      websiteUrl: originalCampaign.websiteUrl,
      ctaUrl: originalCampaign.ctaUrl,
      emotionalObjective: originalCampaign.emotionalObjective,
      audiencePain: originalCampaign.audiencePain,
      additionalData: originalCampaign.additionalData,
      userId: req.user!.id,
    }).returning();

    if (originalCampaign.channels?.length > 0) {
      const { campaignChannels } = await import('../../../db/schema');
      const channelData = originalCampaign.channels.map(channel => ({
        campaignId: clonedCampaign[0].id,
        platform: channel.platform,
        enabled: channel.enabled,
      }));
      await db.insert(campaignChannels).values(channelData);
    }

    res.status(201).json(clonedCampaign[0]);
  } catch (error) {
    console.error('Error cloning campaign:', error);
    res.status(500).json({ error: 'Failed to clone campaign' });
  }
});

// PATCH /api/campaigns/:id/status - Update campaign status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'active', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedCampaign = await db.update(campaigns)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ))
      .returning();

    if (updatedCampaign.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(updatedCampaign[0]);
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

export default router;