import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Trash2, Shield, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Backup {
  id: string;
  name: string;
  createdAt: string;
  campaignName: string;
  itemCount: number;
  hasValidCampaign: boolean;
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignName?: string;
}

export function BackupRestoreModal({ isOpen, onClose, campaignId, campaignName }: BackupRestoreModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [restoreName, setRestoreName] = useState('');
  const [backupName, setBackupName] = useState('');
  const [selectedBackupCampaign, setSelectedBackupCampaign] = useState<string>('');

  // Fetch user backups
  const { data: backupsData, isLoading } = useQuery({
    queryKey: ['/api/backup/list'],
    queryFn: async () => {
      const response = await fetch('/api/backup/list', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch backups');
      return response.json();
    },
    enabled: isOpen
  });

  // Fetch campaigns for backup selection
  const { data: campaignsData } = useQuery({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
    enabled: isOpen
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async ({ campaignId, name }: { campaignId: string; name: string }) => {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId, name })
      });
      if (!response.ok) throw new Error('Failed to create backup');
      return response.json();
    },
    onSuccess: (data) => {
      // Auto-download the backup file
      const filename = `campaign-${data.backup.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(data.downloadData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Backup Created",
        description: `Campaign backup created and downloaded as ${filename}`
      });
      setBackupName('');
    },
    onError: (error: any) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload backup mutation
  const uploadBackupMutation = useMutation({
    mutationFn: async ({ jsonData, restoreName }: { jsonData: any; restoreName: string }) => {
      const response = await fetch('/api/backup/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jsonData, restoreName })
      });
      if (!response.ok) throw new Error('Failed to upload backup');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Backup Restored",
        description: `Campaign "${data.campaign.name}" restored with ${data.campaign.restoredItemCount} items`
      });
      setUploadedFile(null);
      setRestoreName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch(`/api/backup/${backupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete backup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Backup Deleted",
        description: "Backup has been deleted successfully"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setUploadedFile(file);
      setRestoreName(file.name.replace('.json', ''));
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON backup file",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async () => {
    if (!uploadedFile) return;
    
    try {
      const text = await uploadedFile.text();
      const jsonData = JSON.parse(text);
      uploadBackupMutation.mutate({ jsonData, restoreName });
    } catch (error) {
      toast({
        title: "Invalid Backup File",
        description: "The selected file is not a valid backup format",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (backupId: string, backupName: string) => {
    try {
      const response = await fetch(`/api/backup/download/${backupId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to download backup');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${backupName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: "Backup file has been downloaded"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download backup file",
        variant: "destructive"
      });
    }
  };

  const backups = backupsData?.backups || [];
  const campaigns = campaignsData || [];
  
  // Use provided campaignId or selected campaign for backup
  const activeCampaignId = campaignId || selectedBackupCampaign;
  const activeCampaignName = campaignName || campaigns.find((c: any) => c.id === selectedBackupCampaign)?.campaignName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Backup & Restore
          </DialogTitle>
          <DialogDescription>
            Create backups of your campaigns and restore them when needed
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="backups" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="backups">Available Backups</TabsTrigger>
            <TabsTrigger value="upload">Upload Backup</TabsTrigger>
            <TabsTrigger value="auto">Auto Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="backups" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Your Backups</h3>
                <p className="text-sm text-muted-foreground">
                  Manage and download your campaign backups
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!campaignId && (
                  <Select value={selectedBackupCampaign} onValueChange={setSelectedBackupCampaign}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select campaign to backup" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.campaignName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  placeholder="Backup name (optional)"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  className="w-48"
                />
                <Button
                  onClick={() => createBackupMutation.mutate({ 
                    campaignId: activeCampaignId, 
                    name: backupName || `${activeCampaignName} - ${new Date().toLocaleDateString()}` 
                  })}
                  disabled={createBackupMutation.isPending || !activeCampaignId}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : backups.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No backups found</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first backup to get started
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {backups.map((backup: Backup) => (
                  <Card key={backup.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{backup.name}</h4>
                            {backup.hasValidCampaign ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Orphaned
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Campaign: {backup.campaignName} • {backup.itemCount} items
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(backup.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(backup.id, backup.name)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBackupMutation.mutate(backup.id)}
                            disabled={deleteBackupMutation.isPending}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Backup
                </CardTitle>
                <CardDescription>
                  Upload a JSON backup file to restore a campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-file">Select Backup File</Label>
                  <Input
                    id="backup-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                </div>

                {uploadedFile && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="restore-name">Campaign Name (Optional)</Label>
                  <Input
                    id="restore-name"
                    placeholder="Leave empty to use original name"
                    value={restoreName}
                    onChange={(e) => setRestoreName(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleRestore}
                  disabled={!uploadedFile || uploadBackupMutation.isPending}
                  className="w-full"
                >
                  {uploadBackupMutation.isPending ? 'Restoring...' : 'Restore Campaign'}
                </Button>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Restoring a backup will create a new campaign with the backed-up data.
                    Your existing campaigns will not be affected.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auto" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auto Backup Settings</CardTitle>
                <CardDescription>
                  Configure automatic backup preferences (Coming Soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Automatic backup scheduling will be available in a future update.
                    For now, create manual backups before making significant changes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}