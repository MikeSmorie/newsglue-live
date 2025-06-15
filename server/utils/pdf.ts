export interface AuditLogEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string | null;
  data: any;
  ipAddress: string | null;
}

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  subscriptionPlan?: string;
  twoFactorEnabled?: boolean;
}

export async function generateAuditPdf(data: AuditLogEntry[]): Promise<Buffer> {
  // Generate audit log content as structured text report
  let content = `OMEGA-8 AUDIT LOGS EXPORT\n`;
  content += `Generated: ${new Date().toISOString()}\n`;
  content += `Total Records: ${data.length}\n\n`;
  content += `${'='.repeat(120)}\n`;
  content += `${'Timestamp'.padEnd(20)} | ${'Actor'.padEnd(15)} | ${'Action'.padEnd(20)} | ${'Target'.padEnd(15)} | ${'Data'.padEnd(30)} | ${'IP Address'.padEnd(15)}\n`;
  content += `${'='.repeat(120)}\n`;
  
  data.forEach(log => {
    const timestamp = new Date(log.timestamp).toLocaleString().padEnd(20);
    const actor = (log.actor || 'System').padEnd(15);
    const action = log.action.padEnd(20);
    const target = (log.target || '-').padEnd(15);
    const dataStr = (typeof log.data === 'object' ? JSON.stringify(log.data).substring(0, 28) + '..' : (log.data || '-')).padEnd(30);
    const ip = (log.ipAddress || '-').padEnd(15);
    
    content += `${timestamp} | ${actor} | ${action} | ${target} | ${dataStr} | ${ip}\n`;
  });
  
  content += `${'='.repeat(120)}\n`;
  content += `\nExport completed at ${new Date().toLocaleString()}`;
  
  return Buffer.from(content, 'utf-8');
}

export async function generateUserPdf(user: UserRecord): Promise<Buffer> {
  // Generate user profile content as structured text report
  let content = `OMEGA-8 USER PROFILE EXPORT\n`;
  content += `Generated: ${new Date().toISOString()}\n\n`;
  content += `${'='.repeat(60)}\n`;
  content += `USER INFORMATION\n`;
  content += `${'='.repeat(60)}\n`;
  content += `Username: ${user.username}\n`;
  content += `Email: ${user.email || 'Not provided'}\n`;
  content += `Role: ${user.role.toUpperCase()}\n`;
  content += `Account Created: ${new Date(user.createdAt).toLocaleDateString()}\n`;
  content += `Last Updated: ${new Date(user.updatedAt).toLocaleDateString()}\n`;
  content += `User ID: ${user.id}\n\n`;
  
  content += `${'='.repeat(60)}\n`;
  content += `SUBSCRIPTION & SECURITY\n`;
  content += `${'='.repeat(60)}\n`;
  content += `Subscription Plan: ${(user.subscriptionPlan || 'Free').toUpperCase()}\n`;
  content += `Two-Factor Auth: ${user.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}\n`;
  content += `Security Level: ${user.role === 'supergod' ? 'MAXIMUM' : user.role === 'admin' ? 'HIGH' : 'STANDARD'}\n\n`;
  
  content += `${'='.repeat(60)}\n`;
  content += `EXPORT INFORMATION\n`;
  content += `${'='.repeat(60)}\n`;
  content += `This document contains a complete export of user profile data as of ${new Date().toLocaleDateString()}.\n`;
  content += `For security purposes, sensitive information such as passwords and session tokens are not included.\n\n`;
  content += `Export completed at ${new Date().toLocaleString()}`;
  
  return Buffer.from(content, 'utf-8');
}