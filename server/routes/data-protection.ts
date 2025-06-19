import express from 'express';
import { listBackups, restoreBackup, createManualBackup } from '../middleware/dataProtection';

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = express.Router();

// GET /api/data-protection/backups - List all backups for user
router.get('/backups', requireAuth, async (req, res) => {
  try {
    const { table } = req.query;
    const backups = await listBackups(table as string, req.user?.id);
    res.json({ success: true, backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// POST /api/data-protection/backup - Create manual backup
router.post('/backup', requireAuth, createManualBackup);

// POST /api/data-protection/restore/:backupId - Restore from backup
router.post('/restore/:backupId', requireAuth, async (req, res) => {
  try {
    const backupId = parseInt(req.params.backupId);
    const restored = await restoreBackup(backupId);
    res.json({ success: true, restored });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;