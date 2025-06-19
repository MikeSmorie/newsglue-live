import React, { useState } from 'react';
import { Button } from '../../client/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../client/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../client/src/components/ui/tabs';
import { Badge } from '../../client/src/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Target, 
  Plus, 
  TrendingUp,
  Users,
  FileText,
  Lightbulb
} from 'lucide-react';
import CampaignList from '../../client/src/components/CampaignList';
import CampaignForm from '../../client/src/components/CampaignForm';

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
        <Button onClick={handleCreateCampaign} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
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
                  {[...new Set(campaigns.flatMap(c => c.channels?.map(ch => ch.platform) || []))].length}
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
    </div>
  );
}
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{campaign.name}</span>
                  {campaign.emotionalObjective && (
                    <Badge variant="secondary" className="ml-2">
                      {campaign.emotionalObjective.slice(0, 12)}...
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaign.ctaUrl && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{campaign.ctaUrl}</span>
                  </div>
                )}
                
                {campaign.websiteUrl && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Globe className="h-3 w-3 text-green-400" />
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Source URL</div>
                      <span className="truncate text-green-300">{campaign.websiteUrl}</span>
                    </div>
                  </div>
                )}
                
                {campaign.audiencePain && (
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="h-3 w-3 mt-1 text-blue-400" />
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Pain-Focused Audience</div>
                      <div className="text-gray-300 line-clamp-2">{campaign.audiencePain}</div>
                    </div>
                  </div>
                )}

                {campaign.emotionalObjective && (
                  <div className="text-sm">
                    <div className="text-xs text-gray-500 uppercase mb-1">Emotional Objective</div>
                    <div className="text-gray-300 line-clamp-2">{campaign.emotionalObjective}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-400 space-y-2">
              <PlusCircle className="h-12 w-12 mx-auto opacity-50" />
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-sm">Create your first campaign to get started with strategic content planning</p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}