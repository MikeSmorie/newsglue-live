import { db } from '../../db';
import { newsItems } from '../../db/schema';
import { sql } from 'drizzle-orm';
import { createBackup } from './dataProtection';

// Monitor data integrity and create automatic backups
export class DataIntegrityMonitor {
  private static instance: DataIntegrityMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): DataIntegrityMonitor {
    if (!DataIntegrityMonitor.instance) {
      DataIntegrityMonitor.instance = new DataIntegrityMonitor();
    }
    return DataIntegrityMonitor.instance;
  }

  // Start continuous monitoring
  startMonitoring() {
    console.log('[DATA INTEGRITY] Starting continuous data monitoring...');
    
    // Check every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.performIntegrityCheck();
    }, 5 * 60 * 1000);
    
    // Perform initial check
    this.performIntegrityCheck();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[DATA INTEGRITY] Monitoring stopped');
    }
  }

  // Perform comprehensive integrity check
  private async performIntegrityCheck() {
    try {
      const newsItemCount = await this.getNewsItemCount();
      const lastBackupTime = await this.getLastBackupTime();
      
      console.log(`[DATA INTEGRITY] News items: ${newsItemCount}, Last backup: ${lastBackupTime}`);
      
      // Create daily backups of all news items
      if (this.shouldCreateDailyBackup(lastBackupTime)) {
        await this.createDailyBackup();
      }
      
      // Validate data structure
      await this.validateDataStructure();
      
    } catch (error) {
      console.error('[DATA INTEGRITY] Monitoring check failed:', error);
    }
  }

  private async getNewsItemCount(): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM news_items`);
    return parseInt(result.rows[0]?.count as string || '0');
  }

  private async getLastBackupTime(): Promise<Date | null> {
    const result = await db.execute(sql`
      SELECT MAX(timestamp) as last_backup 
      FROM data_backups 
      WHERE table_name = 'news_items'
    `);
    
    const lastBackup = result.rows[0]?.last_backup;
    return lastBackup ? new Date(lastBackup as string) : null;
  }

  private shouldCreateDailyBackup(lastBackupTime: Date | null): boolean {
    if (!lastBackupTime) return true;
    
    const now = new Date();
    const timeDiff = now.getTime() - lastBackupTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 24; // Create backup every 24 hours
  }

  private async createDailyBackup() {
    try {
      console.log('[DATA INTEGRITY] Creating daily backup...');
      
      const allNewsItems = await db.query.newsItems.findMany({
        orderBy: (newsItems, { desc }) => [desc(newsItems.createdAt)]
      });
      
      // Create a consolidated backup of all news items
      const backupData = {
        timestamp: new Date().toISOString(),
        totalItems: allNewsItems.length,
        items: allNewsItems
      };
      
      await createBackup('news_items', 'daily_backup', backupData, 'CREATE', 0);
      console.log(`[DATA INTEGRITY] Daily backup created for ${allNewsItems.length} items`);
      
    } catch (error) {
      console.error('[DATA INTEGRITY] Daily backup failed:', error);
    }
  }

  private async validateDataStructure() {
    try {
      // Check for any news items with missing essential fields
      const corruptedItems = await db.execute(sql`
        SELECT id, title, campaign_id 
        FROM news_items 
        WHERE title IS NULL OR campaign_id IS NULL OR title = '' OR campaign_id = ''
      `);
      
      if (corruptedItems.rows.length > 0) {
        console.error(`[DATA INTEGRITY] ❌ Found ${corruptedItems.rows.length} corrupted news items`);
        
        // Create emergency backup of corrupted items
        for (const item of corruptedItems.rows) {
          await createBackup('news_items', `corrupted_${item.id}`, item, 'CREATE', 0);
        }
      }
      
    } catch (error) {
      console.error('[DATA INTEGRITY] Structure validation failed:', error);
    }
  }

  // Emergency recovery function
  async emergencyRestore(backupId: number) {
    try {
      console.log(`[DATA INTEGRITY] Performing emergency restore from backup ${backupId}`);
      
      const backupResult = await db.execute(sql`
        SELECT * FROM data_backups WHERE id = ${backupId}
      `);
      
      const backup = backupResult.rows[0];
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }
      
      const backupData = JSON.parse(backup.backup_data as string);
      
      if (backup.table_name === 'news_items' && Array.isArray(backupData.items)) {
        // Restore multiple items from daily backup
        for (const item of backupData.items) {
          await db.insert(newsItems).values(item).onConflictDoNothing();
        }
        console.log(`[DATA INTEGRITY] Restored ${backupData.items.length} items from backup`);
      }
      
      return true;
    } catch (error) {
      console.error('[DATA INTEGRITY] Emergency restore failed:', error);
      return false;
    }
  }
}

// Initialize monitoring on server start
export function initializeDataIntegrityMonitoring() {
  const monitor = DataIntegrityMonitor.getInstance();
  monitor.startMonitoring();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    monitor.stopMonitoring();
  });
  
  process.on('SIGINT', () => {
    monitor.stopMonitoring();
  });
}