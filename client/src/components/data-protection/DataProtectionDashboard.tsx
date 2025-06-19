import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, Download, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Backup {
  id: number;
  table_name: string;
  record_id: string;
  timestamp: string;
  operation: string;
  user_id: number;
  restored_at?: string;
}

export function DataProtectionDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch backups
  const { data: backupsData, isLoading, error } = useQuery({
    queryKey: ['/api/data-protection/backups'],
    queryFn: async () => {
      const response = await fetch('/api/data-protection/backups', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }
      return response.json();
    }
  });

  // Create manual backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async ({ tableName, recordId }: { tableName: string; recordId: string }) => {
      const response = await fetch('/api/data-protection/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ tableName, recordId })
      });
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-protection/backups'] });
      toast({
        title: "Backup Created",
        description: "Manual backup has been created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: number) => {
      const response = await fetch(`/api/data-protection/restore/${backupId}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-protection/backups'] });
      toast({
        title: "Data Restored",
        description: "Backup has been restored successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const backups = backupsData?.backups || [];
  const totalBackups = backups.length;
  const recentBackups = backups.slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getOperationBadge = (operation: string) => {
    const variants = {
      CREATE: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[operation as keyof typeof variants] || 'default'}>
        {operation}
      </Badge>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load data protection dashboard. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">Data Protection Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your data backups</p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBackups}</div>
            <p className="text-xs text-muted-foreground">
              Automatic and manual backups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protection Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Continuous monitoring enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backups.length > 0 ? 'Recent' : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {backups.length > 0 
                ? formatDate(backups[0].timestamp)
                : 'No backups yet'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Create manual backups or restore from existing backups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => createBackupMutation.mutate({ 
              tableName: 'news_items', 
              recordId: 'manual_backup' 
            })}
            disabled={createBackupMutation.isPending}
            className="w-full sm:w-auto"
          >
            {createBackupMutation.isPending ? 'Creating...' : 'Create Manual Backup'}
          </Button>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Automatic backups are created daily and before any destructive operations.
              Manual backups can be created anytime for additional safety.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>
            Your most recent data backups and restore options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : recentBackups.length > 0 ? (
            <div className="space-y-4">
              {recentBackups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {backup.table_name.replace('_', ' ').toUpperCase()}
                      </span>
                      {getOperationBadge(backup.operation)}
                      {backup.restored_at && (
                        <Badge variant="outline">Restored</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(backup.timestamp)} • Record: {backup.record_id}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreBackupMutation.mutate(backup.id)}
                      disabled={restoreBackupMutation.isPending || !!backup.restored_at}
                    >
                      {restoreBackupMutation.isPending ? 'Restoring...' : 'Restore'}
                    </Button>
                  </div>
                </div>
              ))}
              
              {totalBackups > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    View All {totalBackups} Backups
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No backups yet</h3>
              <p className="text-muted-foreground">
                Backups will appear here as they are created automatically or manually.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}