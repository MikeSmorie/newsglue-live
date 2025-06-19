import express from 'express';
import { db } from '../../db/index.js';
import { backups, campaigns, newsItems } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = express.Router();

// POST /api/backup/create - Create campaign backup
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { campaignId, name } = req.body;
    const userId = req.user!.id;

    // Verify user owns the campaign
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, campaignId),
        eq(campaigns.userId, userId)
      )
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Gather all campaign data
    const campaignNewsItems = await db.query.newsItems.findMany({
      where: eq(newsItems.campaignId, campaignId)
    });

    // Create backup payload
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      campaign: campaign,
      newsItems: campaignNewsItems,
      metadata: {
        originalCampaignId: campaignId,
        originalUserId: userId,
        backupName: name,
        itemCount: campaignNewsItems.length
      }
    };

    // Create backup record
    const [backup] = await db.insert(backups).values({
      userId,
      campaignId,
      name: name || `${campaign.campaignName} - ${new Date().toLocaleDateString()}`,
      jsonPayload: JSON.stringify(backupData)
    }).returning();

    res.json({
      success: true,
      backup: {
        id: backup.id,
        name: backup.name,
        createdAt: backup.createdAt,
        campaignName: campaign.campaignName,
        itemCount: campaignNewsItems.length
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
      orderBy: [desc(backups.createdAt)],
      with: {
        campaign: true
      }
    });

    const backupList = userBackups.map(backup => {
      const payload = JSON.parse(backup.jsonPayload);
      return {
        id: backup.id,
        name: backup.name,
        createdAt: backup.createdAt,
        campaignName: backup.campaign?.campaignName || payload.campaign?.campaignName || 'Unknown Campaign',
        itemCount: payload.metadata?.itemCount || 0,
        hasValidCampaign: !!backup.campaign
      };
    });

    res.json({
      success: true,
      backups: backupList
    });

  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// POST /api/backup/upload - Upload and restore backup
router.post('/upload', requireAuth, async (req, res) => {
  try {
    const { jsonData, restoreName } = req.body;
    const userId = req.user!.id;

    // Validate backup format
    const backupSchema = z.object({
      version: z.string(),
      timestamp: z.string(),
      campaign: z.object({
        campaignName: z.string(),
        brandDescription: z.string().optional(),
        targetAudience: z.string().optional(),
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
      })),
      metadata: z.object({
        originalCampaignId: z.string().optional(),
        originalUserId: z.number().optional(),
        backupName: z.string().optional(),
        itemCount: z.number().optional()
      })
    });

    const parsedData = backupSchema.parse(jsonData);

    // Create new campaign with restored data
    const [newCampaign] = await db.insert(campaigns).values({
      userId: userId,
      campaignName: restoreName || `${parsedData.campaign.campaignName} (Restored)`,
      name: restoreName || `${parsedData.campaign.campaignName} (Restored)`,
      tone: parsedData.campaign.brandVoice || '',
      audiencePain: parsedData.campaign.targetAudience || '',
      emotionalObjective: parsedData.campaign.keyMessages || ''
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

    // Create backup record for the upload
    await db.insert(backups).values({
      userId,
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
        eq(backups.userId, userId),
        eq(backups.isDeleted, false)
      )
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found or access denied' });
    }

    const backupData = JSON.parse(backup.jsonPayload);
    const filename = `campaign-${backup.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backupData);

  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

export default router;