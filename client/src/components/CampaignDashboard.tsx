import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useCampaign } from '@/contexts/campaign-context';
import CampaignList from './CampaignList';
import CampaignForm from './CampaignForm';
import { 
  ArrowLeft,
  Plus,
  Grid3X3,
  Calendar,
  Target,
  BarChart3,
  Settings,
  Megaphone
} from 'lucide-react';
import CampaignPage from './campaigns';

interface Campaign {
  id: string;
  campaignName: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  websiteUrl?: string;
  channels?: any[];
}

const moduleItems = [
  { id: 1, name: 'Campaign Builder', description: 'Set up campaign details and objectives', icon: Target, path: '/module/1' },
  { id: 2, name: 'Brand Voice', description: 'Define your brand personality and messaging', icon: Megaphone, path: '/module/2' },
  { id: 3, name: 'Audience Builder', description: 'Create detailed audience personas', icon: Settings, path: '/module/3' },
  { id: 4, name: 'News Aggregator', description: 'Search and collect relevant news articles', icon: Grid3X3, path: '/module/4' },
  { id: 5, name: 'Article Queue', description: 'Manage your news article pipeline', icon: Calendar, path: '/module/5' },
  { id: 6, name: 'Content Generator', description: 'Generate platform-specific content', icon: BarChart3, path: '/module/6' },
  { id: 7, name: 'Proposal Builder', description: 'Create client proposals and pitches', icon: Settings, path: '/module/7' },
  { id: 8, name: 'Metrics Engine', description: 'Track performance and analytics', icon: BarChart3, path: '/module/8' },
  { id: 9, name: 'AI Discoverability', description: 'Optimize content for discovery', icon: Target, path: '/module/9' },
  { id: 10, name: 'System Audit', description: 'Monitor system health and data', icon: Settings, path: '/module/10' }
];

export default function CampaignDashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [, navigate] = useLocation();
  const { selectedCampaign, setSelectedCampaign, exitCampaign, isInCampaignMode } = useCampaign();

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  const handleCampaignCreated = () => {
    setShowCreateForm(false);
  };

  const handleModuleClick = (modulePath: string) => {
    navigate(modulePath);
  };

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
            <h1 className="text-3xl font-bold">Create New Campaign</h1>
          </div>
        </div>
        <CampaignForm onSuccess={handleCampaignCreated} />
      </div>
    );
  }

  if (!isInCampaignMode || !selectedCampaign) {
    return <CampaignPage />;
  }

  if (isInCampaignMode && selectedCampaign) {
    return (
      <div className="space-y-6">
        {/* Campaign Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={exitCampaign}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Campaigns
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{selectedCampaign.campaignName}</h1>
              <p className="text-foreground">Campaign Modules & Tools</p>
            </div>
          </div>
          <Badge variant={selectedCampaign.status === 'active' ? 'default' : 'secondary'}>
            {selectedCampaign.status.charAt(0).toUpperCase() + selectedCampaign.status.slice(1)}
          </Badge>
        </div>

        {/* Campaign Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Overview</CardTitle>
            <CardDescription>
              Working on "{selectedCampaign.campaignName}" campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created {new Date(selectedCampaign.createdAt).toLocaleDateString()}
              </div>
              {selectedCampaign.websiteUrl && (
                <div className="truncate">
                  Website: {new URL(selectedCampaign.websiteUrl).hostname}
                </div>
              )}
              {selectedCampaign.channels && selectedCampaign.channels.length > 0 && (
                <div>
                  {selectedCampaign.channels.length} platform{selectedCampaign.channels.length !== 1 ? 's' : ''} configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modules Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Modules</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {moduleItems.map((module) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={module.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => handleModuleClick(module.path)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-foreground" />
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm mb-3">
                      {module.description}
                    </CardDescription>
                    <Button className="w-full" variant="outline" size="sm">
                      Open Module
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Show campaign selection interface
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Select Campaign</h1>
          <p className="text-foreground">Choose a campaign to work with, or create a new one</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Campaign
        </Button>
      </div>

      <CampaignList 
        onSelectCampaign={handleSelectCampaign}
        onCreateNew={handleCreateNew}
        showSelectButton={true}
      />
    </div>
  );
}