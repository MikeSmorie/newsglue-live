import { db } from '@db/index';
import { newsItems } from '@db/schema';
import { eq, sql } from 'drizzle-orm';

export interface DataBackup {
  id: string;
  tableName: string;
  recordId: string;
  backupData: any;
  timestamp: Date;
  operation: 'UPDATE' | 'DELETE' | 'CREATE';
}

// Enhanced backup system with database persistence

export const createBackup = async (tableName: string, recordId: string, data: any, operation: 'UPDATE' | 'DELETE' | 'CREATE', userId?: number) => {
  try {
    // Store backup in database for permanent protection
    const backupResult = await db.execute(sql`
      INSERT INTO data_backups (user_id, table_name, record_id, backup_data, operation, description)
      VALUES (${userId || null}, ${tableName}, ${recordId}, ${JSON.stringify(data)}, ${operation}, 
              'Automatic backup before ' || ${operation} || ' operation')
      RETURNING id
    `);
    
    const backupId = backupResult.rows[0]?.id;
    console.log(`[DATA PROTECTION] Created permanent backup ${backupId} for ${tableName}:${recordId}`);
    
    // Auto-cleanup old backups (keep last 90 days)
    await db.execute(sql`
      DELETE FROM data_backups 
      WHERE timestamp < NOW() - INTERVAL '90 days' 
      AND table_name = ${tableName}
    `);
    
    return backupId;
  } catch (error) {
    console.error(`[DATA PROTECTION] Failed to create backup:`, error);
    throw error;
  }
};

export const restoreBackup = async (backupId: number) => {
  try {
    const backupResult = await db.execute(sql`
      SELECT * FROM data_backups WHERE id = ${backupId}
    `);
    
    const backup = backupResult.rows[0];
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    console.log(`[DATA PROTECTION] Restoring backup ${backupId}`);
    
    if (backup.table_name === 'news_items') {
      const backupData = JSON.parse(backup.backup_data as string);
      await db.insert(newsItems).values(backupData);
      console.log(`[DATA PROTECTION] Restored news item ${backup.record_id}`);
    }
    
    // Mark backup as restored
    await db.execute(sql`
      UPDATE data_backups SET restored_at = NOW() WHERE id = ${backupId}
    `);
    
    return backup;
  } catch (error) {
    console.error(`[DATA PROTECTION] Failed to restore backup:`, error);
    throw error;
  }
};

export const listBackups = async (tableName?: string, userId?: number) => {
  try {
    let query = sql`SELECT * FROM data_backups WHERE 1=1`;
    
    if (tableName) {
      query = sql`${query} AND table_name = ${tableName}`;
    }
    if (userId) {
      query = sql`${query} AND user_id = ${userId}`;
    }
    
    query = sql`${query} ORDER BY timestamp DESC LIMIT 100`;
    
    const result = await db.execute(query);
    return result.rows;
  } catch (error) {
    console.error(`[DATA PROTECTION] Failed to list backups:`, error);
    return [];
  }
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
          await createBackup('news_items', itemId, existingItem, req.method === 'DELETE' ? 'DELETE' : 'UPDATE', req.user?.id);
        }
      } catch (error) {
        console.error('[DATA PROTECTION] Failed to create backup:', error);
        // Continue anyway - don't block the operation
      }
    }
  }
  next();
};

// Create backup route for manual backups
export const createManualBackup = async (req: any, res: any) => {
  try {
    const { tableName, recordId } = req.body;
    
    if (tableName === 'news_items') {
      const item = await db.query.newsItems.findFirst({
        where: eq(newsItems.id, parseInt(recordId))
      });
      
      if (item) {
        const backupId = await createBackup('news_items', recordId, item, 'CREATE', req.user?.id);
        res.json({ success: true, backupId });
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } else {
      res.status(400).json({ error: 'Unsupported table' });
    }
  } catch (error) {
    console.error('[DATA PROTECTION] Manual backup failed:', error);
    res.status(500).json({ error: 'Backup failed' });
  }
};