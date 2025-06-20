import { dataBackup } from './dataBackup';

// Middleware to automatically backup before any database schema changes
export async function protectBeforeChanges(req: any, res: any, next: any) {
  // Check if this is a potentially destructive operation
  const destructivePatterns = [
    'DROP',
    'ALTER TABLE',
    'DELETE FROM',
    'TRUNCATE',
    'UPDATE'
  ];

  const isDestructive = destructivePatterns.some(pattern => 
    req.body?.sql?.toUpperCase().includes(pattern) ||
    req.url.includes('migrate') ||
    req.url.includes('schema')
  );

  if (isDestructive) {
    try {
      await dataBackup.createFullBackup('pre-destructive-operation');
      console.log('[DATA PROTECTION] Auto-backup completed before operation');
    } catch (error) {
      console.error('[DATA PROTECTION] Auto-backup failed:', error);
      return res.status(500).json({ 
        error: 'Failed to create protective backup',
        message: 'Operation blocked for data safety'
      });
    }
  }

  next();
}

// Hook into campaign and news item operations
export async function protectCampaignData(campaignId: string) {
  try {
    await dataBackup.createCampaignBackup(campaignId);
    console.log(`[DATA PROTECTION] Campaign backup created for: ${campaignId}`);
  } catch (error) {
    console.error('[DATA PROTECTION] Campaign backup failed:', error);
  }
}