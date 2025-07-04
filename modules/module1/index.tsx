import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Target, 
  Plus, 
  TrendingUp,
  Users,
  FileText,
  Lightbulb,
  Shield
} from 'lucide-react';
import CampaignList from '@/components/CampaignList';
import CampaignForm from '@/components/CampaignForm';
import { BackupRestoreModal } from '@/components/backup/BackupRestoreModal';
import { useCampaign } from '@/contexts/campaign-context';

interface Campaign {
  id: string;
  campaignName: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  websiteUrl?: string;
  channels?: any[];
}

export default function Module1() {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const { selectedCampaign } = useCampaign();
  
  // Campaign context provides the selected campaign
  console.log('🎯 [MODULE 1] Loading with campaign:', selectedCampaign?.campaignName || 'none');

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setActiveTab('create');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setActiveTab('create');
  };

  const handleFormSuccess = () => {
    setActiveTab('campaigns');
    setEditingCampaign(null);
  };

  const handleFormCancel = () => {
    setActiveTab('campaigns');
    setEditingCampaign(null);
  };

  const handleBackupCampaign = (campaign: Campaign) => {
    setShowBackupModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      archived: 'outline',
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="text-lg">Loading campaigns...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Campaign-Specific Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">
            Campaign Builder
          </h1>
          <p className="text-foreground dark:text-foreground mt-2">
            Campaign: <strong>{selectedCampaign?.campaignName}</strong> - Configure your campaign settings and brand voice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowBackupModal(true)} 
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Backup Campaign
          </Button>
          <Button onClick={() => setEditingCampaign(selectedCampaign)} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Edit Campaign
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Campaign Overview</TabsTrigger>
          <TabsTrigger value="settings">Campaign Settings</TabsTrigger>
          <TabsTrigger value="brandvoice">Brand Voice</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Campaign-Specific Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campaign Status</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{selectedCampaign?.status || 'Unknown'}</div>
                <p className="text-xs text-muted-foreground">
                  Current campaign state
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Content Channels</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCampaign?.channels?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Distribution channels configured
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Website</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {selectedCampaign?.websiteUrl ? 'Configured' : 'Not Set'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Brand website integration
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Campaign Information
              </CardTitle>
              <CardDescription>
                Details and configuration for {selectedCampaign?.campaignName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Campaign Name</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      {selectedCampaign?.campaignName}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      <span className="capitalize">{selectedCampaign?.status}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      {selectedCampaign?.createdAt ? formatDate(selectedCampaign.createdAt) : 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Updated</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      {selectedCampaign?.updatedAt ? formatDate(selectedCampaign.updatedAt) : 'Unknown'}
                    </div>
                  </div>
                </div>
                {selectedCampaign?.websiteUrl && (
                  <div>
                    <label className="text-sm font-medium">Website URL</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      <a 
                        href={selectedCampaign.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {selectedCampaign.websiteUrl}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>
                Configure settings for {selectedCampaign?.campaignName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Campaign settings interface will be available here to modify campaign configuration,
                  target audience, and content generation parameters.
                </p>
                <Button onClick={() => setEditingCampaign(selectedCampaign)}>
                  Edit Campaign Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brandvoice" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Voice Configuration</CardTitle>
              <CardDescription>
                Define the brand voice and tone for {selectedCampaign?.campaignName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Brand voice settings will allow you to configure tone, style, and messaging 
                  guidelines for content generation within this campaign.
                </p>
                <Button variant="outline">
                  Configure Brand Voice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        campaignId={selectedCampaign?.id}
        campaignName={selectedCampaign?.campaignName}
      />
    </div>
  );
}