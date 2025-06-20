import { db } from '@db/index';
import { campaigns, newsItems } from '@db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface BackupData {
  timestamp: string;
  campaigns: any[];
  newsItems: any[];
  metadata: {
    version: string;
    totalRecords: number;
    backupReason: string;
  };
}

class DataBackupService {
  private backupDir = path.join(process.cwd(), 'backups');

  constructor() {
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createFullBackup(reason: string = 'scheduled'): Promise<string> {
    try {
      console.log(`[DATA BACKUP] Creating full backup - reason: ${reason}`);
      
      // Fetch all campaigns and news items
      const allCampaigns = await db.query.campaigns.findMany();
      const allNewsItems = await db.query.newsItems.findMany();

      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        campaigns: allCampaigns,
        newsItems: allNewsItems,
        metadata: {
          version: '1.0',
          totalRecords: allCampaigns.length + allNewsItems.length,
          backupReason: reason
        }
      };

      const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.backupDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
      
      console.log(`[DATA BACKUP] Backup created: ${filename} (${backupData.metadata.totalRecords} records)`);
      
      // Keep only last 10 backups
      await this.cleanupOldBackups();
      
      return filepath;
    } catch (error) {
      console.error('[DATA BACKUP] Backup failed:', error);
      throw error;
    }
  }

  async createCampaignBackup(campaignId: string): Promise<string> {
    try {
      console.log(`[DATA BACKUP] Creating campaign backup for: ${campaignId}`);
      
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, campaignId)
      });
      
      const campaignNews = await db.query.newsItems.findMany({
        where: eq(newsItems.campaignId, campaignId)
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const backupData = {
        timestamp: new Date().toISOString(),
        campaignId,
        campaign,
        newsItems: campaignNews,
        metadata: {
          version: '1.0',
          campaignName: campaign.campaignName,
          newsItemsCount: campaignNews.length
        }
      };

      const filename = `campaign_${campaignId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.backupDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
      
      console.log(`[DATA BACKUP] Campaign backup created: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('[DATA BACKUP] Campaign backup failed:', error);
      throw error;
    }
  }

  private async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the 10 most recent backups
      const filesToDelete = files.slice(10);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`[DATA BACKUP] Cleaned up old backup: ${file.name}`);
      }
    } catch (error) {
      console.error('[DATA BACKUP] Cleanup failed:', error);
    }
  }

  async restoreFromBackup(backupPath: string): Promise<boolean> {
    try {
      console.log(`[DATA BACKUP] Restoring from: ${backupPath}`);
      
      const backupData: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      console.log(`[DATA BACKUP] Restoring ${backupData.metadata.totalRecords} records from ${backupData.timestamp}`);
      
      // This would require careful implementation to avoid conflicts
      // For now, just log what would be restored
      console.log(`[DATA BACKUP] Would restore: ${backupData.campaigns.length} campaigns, ${backupData.newsItems.length} news items`);
      
      return true;
    } catch (error) {
      console.error('[DATA BACKUP] Restore failed:', error);
      return false;
    }
  }

  listBackups(): string[] {
    try {
      return fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse();
    } catch (error) {
      console.error('[DATA BACKUP] Failed to list backups:', error);
      return [];
    }
  }
}

// Auto-backup before schema changes
export async function preSchemaChangeBackup(): Promise<void> {
  const backupService = new DataBackupService();
  await backupService.createFullBackup('pre-schema-change');
}

// Scheduled backup service
export async function scheduledBackup(): Promise<void> {
  const backupService = new DataBackupService();
  await backupService.createFullBackup('scheduled');
}

export const dataBackup = new DataBackupService();
export default DataBackupService;