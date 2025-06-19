import { db } from '@db/index';
import { newsItems } from '@db/schema';
import { eq } from 'drizzle-orm';

export interface DataBackup {
  id: string;
  tableName: string;
  recordId: string;
  backupData: any;
  timestamp: Date;
  operation: 'UPDATE' | 'DELETE';
}

// In-memory backup store (should be replaced with persistent storage in production)
const dataBackups: Map<string, DataBackup> = new Map();

export const createBackup = async (tableName: string, recordId: string, data: any, operation: 'UPDATE' | 'DELETE') => {
  const backupId = `${tableName}_${recordId}_${Date.now()}`;
  const backup: DataBackup = {
    id: backupId,
    tableName,
    recordId,
    backupData: JSON.parse(JSON.stringify(data)), // Deep clone
    timestamp: new Date(),
    operation
  };
  
  dataBackups.set(backupId, backup);
  console.log(`[DATA PROTECTION] Created backup ${backupId} for ${tableName}:${recordId}`);
  
  // Keep only last 100 backups per table
  const tableBackups = Array.from(dataBackups.values())
    .filter(b => b.tableName === tableName)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
  if (tableBackups.length > 100) {
    const oldBackups = tableBackups.slice(100);
    oldBackups.forEach(backup => dataBackups.delete(backup.id));
  }
  
  return backupId;
};

export const restoreBackup = async (backupId: string) => {
  const backup = dataBackups.get(backupId);
  if (!backup) {
    throw new Error(`Backup ${backupId} not found`);
  }
  
  console.log(`[DATA PROTECTION] Restoring backup ${backupId}`);
  
  if (backup.tableName === 'news_items') {
    await db.insert(newsItems).values(backup.backupData);
    console.log(`[DATA PROTECTION] Restored news item ${backup.recordId}`);
  }
  
  return backup;
};

export const listBackups = (tableName?: string) => {
  const backups = Array.from(dataBackups.values());
  return tableName ? backups.filter(b => b.tableName === tableName) : backups;
};

// Middleware to automatically create backups before destructive operations
export const protectNewsItems = async (req: any, res: any, next: any) => {
  if (req.method === 'DELETE' || req.method === 'PUT') {
    const itemId = req.params.id;
    if (itemId) {
      try {
        const existingItem = await db.query.newsItems.findFirst({
          where: eq(newsItems.id, parseInt(itemId))
        });
        
        if (existingItem) {
          await createBackup('news_items', itemId, existingItem, req.method === 'DELETE' ? 'DELETE' : 'UPDATE');
        }
      } catch (error) {
        console.error('[DATA PROTECTION] Failed to create backup:', error);
        // Continue anyway - don't block the operation
      }
    }
  }
  next();
};