import { Router } from 'express';
import { db } from '../../db';
import { campaigns, newsItems, backups, campaignChannels } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

// Backup data structure validation schema
const backupSchema = z.object({
  campaign: z.object({
    campaignName: z.string(),
    targetAudience: z.string().optional(),
    brandDescription: z.string().optional(),
    keyMessages: z.string().optional(),
    brandVoice: z.string().optional(),
    contentGuidelines: z.string().optional()
  }),
  newsItems: z.array(z.object({
    headline: z.string(),
    sourceUrl: z.string(),
    content: z.string(),
    contentType: z.string(),
    status: z.string(),
    platformOutputs: z.any().optional(),
    generationMetrics: z.any().optional()
  })).default([]),
  channels: z.array(z.object({
    platform: z.string(),
    enabled: z.boolean()
  })).default([]),
  metadata: z.object({
    version: z.string(),
    createdAt: z.string(),
    exportedBy: z.string().optional()
  })
});

// POST /api/backup/create - Create and download backup
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { campaignId, name } = req.body;
    const userId = req.user!.id;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Verify campaign ownership
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, campaignId),
        eq(campaigns.userId, userId)
      ),
      with: {
        channels: true
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Get news items for this campaign
    const campaignNewsItems = await db.query.newsItems.findMany({
      where: eq(newsItems.campaignId, campaignId)
    });

    // Prepare backup data
    const backupData = {
      campaign: {
        campaignName: campaign.campaignName,
        targetAudience: campaign.audiencePain || '',
        brandDescription: campaign.websiteUrl || '',
        keyMessages: campaign.emotionalObjective || '',
        brandVoice: campaign.additionalData || '',
        contentGuidelines: campaign.additionalData || ''
      },
      newsItems: campaignNewsItems.map(item => ({
        headline: item.headline,
        sourceUrl: item.sourceUrl,
        content: item.content,
        contentType: item.contentType,
        status: item.status,
        platformOutputs: item.platformOutputs,
        generationMetrics: item.generationMetrics
      })),
      channels: campaign.channels?.map(channel => ({
        platform: channel.platform,
        enabled: channel.enabled
      })) || [],
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        exportedBy: userId.toString()
      }
    };

    // Create backup record
    const [backup] = await db.insert(backups).values({
      userId: userId,
      campaignId: campaignId,
      name: name || `${campaign.campaignName} - ${new Date().toLocaleDateString()}`,
      jsonPayload: JSON.stringify(backupData)
    }).returning();

    res.json({
      success: true,
      backup: {
        id: backup.id,
        name: backup.name,
        createdAt: backup.createdAt
      },
      downloadData: backupData
    });

  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// GET /api/backup/list - List user backups
router.get('/list', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const userBackups = await db.query.backups.findMany({
      where: and(
        eq(backups.userId, userId),
        eq(backups.isDeleted, false)
      ),
      with: {
        campaign: true
      },
      orderBy: (backups, { desc }) => [desc(backups.createdAt)]
    });

    const formattedBackups = userBackups.map(backup => {
      const jsonData = JSON.parse(backup.jsonPayload);
      return {
        id: backup.id,
        name: backup.name,
        createdAt: backup.createdAt,
        campaignName: backup.campaign?.campaignName || 'Unknown Campaign',
        itemCount: jsonData.newsItems?.length || 0,
        hasValidCampaign: backup.campaign !== null
      };
    });

    res.json({
      success: true,
      backups: formattedBackups
    });

  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

// POST /api/backup/upload - Upload and restore backup
router.post('/upload', requireAuth, async (req, res) => {
  try {
    const { jsonData, restoreName } = req.body;
    const userId = req.user!.id;

    if (!jsonData) {
      return res.status(400).json({ error: 'JSON data is required' });
    }

    const parsedData = backupSchema.parse(jsonData);

    // Create new campaign with restored data
    const [newCampaign] = await db.insert(campaigns).values({
      userId: userId,
      campaignName: restoreName || `${parsedData.campaign.campaignName} (Restored)`,
      name: restoreName || `${parsedData.campaign.campaignName} (Restored)`,
      status: 'draft',
      websiteUrl: parsedData.campaign.brandDescription || null,
      ctaUrl: null,
      emotionalObjective: parsedData.campaign.keyMessages || null,
      audiencePain: parsedData.campaign.targetAudience || null,
      additionalData: parsedData.campaign.contentGuidelines || null,
      websiteAnalysis: null,
      socialSettings: {}
    }).returning();

    // Restore news items
    if (parsedData.newsItems.length > 0) {
      const newsItemsToInsert = parsedData.newsItems.map(item => ({
        campaignId: newCampaign.id,
        headline: item.headline,
        sourceUrl: item.sourceUrl,
        content: item.content,
        contentType: item.contentType,
        status: item.status,
        platformOutputs: item.platformOutputs,
        generationMetrics: item.generationMetrics
      }));

      await db.insert(newsItems).values(newsItemsToInsert);
    }

    // Restore channels
    if (parsedData.channels.length > 0) {
      const channelsToInsert = parsedData.channels.map(channel => ({
        campaignId: newCampaign.id,
        platform: channel.platform,
        enabled: channel.enabled
      }));

      await db.insert(campaignChannels).values(channelsToInsert);
    }

    // Create backup record for the upload
    await db.insert(backups).values({
      userId: userId,
      campaignId: newCampaign.id,
      name: `Uploaded: ${restoreName || parsedData.campaign.campaignName}`,
      jsonPayload: JSON.stringify(parsedData)
    });

    res.json({
      success: true,
      campaign: {
        id: newCampaign.id,
        name: newCampaign.campaignName,
        restoredItemCount: parsedData.newsItems.length
      }
    });

  } catch (error) {
    console.error('Error uploading backup:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid backup format', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Failed to upload backup' });
  }
});

// DELETE /api/backup/:id - Soft delete backup
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const backupId = req.params.id;
    const userId = req.user!.id;

    // Verify ownership
    const backup = await db.query.backups.findFirst({
      where: and(
        eq(backups.id, backupId),
        eq(backups.userId, userId)
      )
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found or access denied' });
    }

    // Soft delete
    await db.update(backups)
      .set({ isDeleted: true })
      .where(eq(backups.id, backupId));

    res.json({ success: true, message: 'Backup deleted successfully' });

  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// GET /api/backup/download/:id - Download backup file
router.get('/download/:id', requireAuth, async (req, res) => {
  try {
    const backupId = req.params.id;
    const userId = req.user!.id;

    // Verify ownership
    const backup = await db.query.backups.findFirst({
      where: and(
        eq(backups.id, backupId),
        eq(backups.userId, userId)
      )
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found or access denied' });
    }

    const jsonData = JSON.parse(backup.jsonPayload);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${backup.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json"`);
    res.send(JSON.stringify(jsonData, null, 2));

  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

export default router;