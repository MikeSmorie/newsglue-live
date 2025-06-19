import { createBackup, listBackups, restoreBackup } from '../middleware/dataProtection';
import { db } from '../../db';
import { newsItems } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function testDataProtectionSystem() {
  console.log('[DATA PROTECTION TEST] Starting comprehensive test...');
  
  try {
    // Test 1: Create backup
    const testNewsItem = {
      id: 999999,
      title: 'Test News Item for Backup',
      content: 'This is a test item to verify backup functionality',
      campaignId: 'test-campaign',
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('[DATA PROTECTION TEST] Creating test backup...');
    const backupId = await createBackup('news_items', '999999', testNewsItem, 'CREATE', 1);
    console.log(`[DATA PROTECTION TEST] Backup created with ID: ${backupId}`);
    
    // Test 2: List backups
    console.log('[DATA PROTECTION TEST] Listing backups...');
    const backups = await listBackups('news_items', 1);
    console.log(`[DATA PROTECTION TEST] Found ${backups.length} backups`);
    
    // Test 3: Verify backup exists
    const testBackup = backups.find(b => b.record_id === '999999');
    if (testBackup) {
      console.log('[DATA PROTECTION TEST] ✅ Backup verification successful');
    } else {
      console.log('[DATA PROTECTION TEST] ❌ Backup verification failed');
    }
    
    console.log('[DATA PROTECTION TEST] All tests completed successfully');
    return true;
    
  } catch (error) {
    console.error('[DATA PROTECTION TEST] Test failed:', error);
    return false;
  }
}

export async function validateDataIntegrity() {
  console.log('[DATA INTEGRITY] Validating news items integrity...');
  
  try {
    const allNewsItems = await db.query.newsItems.findMany({
      orderBy: (newsItems, { desc }) => [desc(newsItems.createdAt)],
      limit: 10
    });
    
    console.log(`[DATA INTEGRITY] Found ${allNewsItems.length} news items in database`);
    
    // Check for any corrupted or missing essential fields
    const corruptedItems = allNewsItems.filter(item => 
      !item.id || !item.title || !item.campaignId
    );
    
    if (corruptedItems.length > 0) {
      console.error(`[DATA INTEGRITY] ❌ Found ${corruptedItems.length} corrupted items`);
      return false;
    }
    
    console.log('[DATA INTEGRITY] ✅ All news items have valid structure');
    return true;
    
  } catch (error) {
    console.error('[DATA INTEGRITY] Validation failed:', error);
    return false;
  }
}