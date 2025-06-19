import express from 'express';
import { z } from 'zod';
import { db } from '../../../db';
import { campaigns, insertCampaignSchema } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

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
});

// GET /api/campaigns - List all campaigns for authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userCampaigns = await db.query.campaigns.findMany({
      where: eq(campaigns.userId, req.user!.id),
      orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
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
        name: validatedData.name,
        websiteUrl: validatedData.website_url || null,
        ctaUrl: validatedData.cta_url || null,
        emotionalObjective: validatedData.emotional_objective || null,
        audiencePain: validatedData.audience_pain || null,
        additionalData: validatedData.additional_data || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(campaigns.id, req.params.id),
        eq(campaigns.userId, req.user!.id)
      ))
      .returning();

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

export default router;