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
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

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
    setSelectedCampaign(campaign);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            NewsJack Campaign Builder
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create emotion-driven content that connects trending news with your brand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowBackupModal(true)} 
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Backup & Restore
          </Button>
          <Button onClick={handleCreateCampaign} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="create">
            {editingCampaign ? 'Edit Campaign' : 'Create New'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active campaigns ready for content generation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently generating NewsJack content
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platforms</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((acc, c) => {
                    const platforms = c.channels?.map(ch => ch.platform) || [];
                    platforms.forEach(p => acc.add(p));
                    return acc;
                  }, new Set()).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique distribution channels
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Campaigns
              </CardTitle>
              <CardDescription>
                Your latest NewsJack campaigns and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create your first NewsJack campaign to start generating emotion-driven content.
                  </p>
                  <Button onClick={handleCreateCampaign}>
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {campaign.campaignName}
                          </h4>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Created {formatDate(campaign.createdAt)}
                          {campaign.channels && campaign.channels.length > 0 && (
                            <span> • {campaign.channels.length} platform{campaign.channels.length !== 1 ? 's' : ''}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCampaign(campaign)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                  {campaigns.length > 5 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={() => setActiveTab('campaigns')}>
                        View All {campaigns.length} Campaigns
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignList
            onEditCampaign={handleEditCampaign}
            onCreateNew={handleCreateCampaign}
            onBackupCampaign={handleBackupCampaign}
          />
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <CampaignForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            editingCampaign={editingCampaign}
          />
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