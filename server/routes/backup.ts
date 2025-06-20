import { Router } from 'express';
import { dataBackup } from '../middleware/dataBackup';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = Router();

// Create manual backup
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { reason = 'manual' } = req.body;
    const backupPath = await dataBackup.createFullBackup(reason);
    res.json({ 
      success: true, 
      message: 'Backup created successfully',
      backupPath: backupPath.split('/').pop() // Only filename for security
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Create campaign-specific backup
router.post('/campaign/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const backupPath = await dataBackup.createCampaignBackup(campaignId);
    res.json({ 
      success: true, 
      message: 'Campaign backup created successfully',
      backupPath: backupPath.split('/').pop()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign backup' });
  }
});

// List available backups
router.get('/list', requireAuth, async (req, res) => {
  try {
    const backups = dataBackup.listBackups();
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Get backup status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const backups = dataBackup.listBackups();
    const latestBackup = backups[0];
    res.json({
      totalBackups: backups.length,
      latestBackup,
      protectionActive: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

export { router as backupRoutes };