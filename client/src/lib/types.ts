export type AuditLogEntry = {
  id: number;
  actor: string;
  action: string;
  target: string;
  data: any;
  ip_address: string;
  created_at: string;
};