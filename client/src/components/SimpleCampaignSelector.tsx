import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Plus } from 'lucide-react';
import { useCampaign } from '@/contexts/campaign-context';
import { useLocation } from 'wouter';

interface Campaign {
  id: string;
  campaignName: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  websiteUrl?: string;
}

interface SimpleCampaignSelectorProps {
  onCreateNew?: () => void;
}

export default function SimpleCampaignSelector({ onCreateNew }: SimpleCampaignSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectCampaign } = useCampaign();
  const [, navigate] = useLocation();

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  const filteredCampaigns = campaigns?.filter((campaign: Campaign) =>
    campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCampaignClick = (campaign: Campaign) => {
    selectCampaign(campaign);
    // Navigate directly to Module 1 after campaign selection
    navigate('/module/1');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Select Campaign</h1>
          <Button onClick={onCreateNew} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </Button>
        </div>
        <div className="text-center py-8">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Select Campaign</h1>
          <Button onClick={onCreateNew} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </Button>
        </div>
        <div className="text-center py-8 text-red-600">Failed to load campaigns</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Select Campaign</h1>
          <p className="text-muted-foreground mt-1">Choose a campaign to work with, or create a new one</p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create New</span>
        </Button>
      </div>

      {campaigns && campaigns.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {campaigns?.length === 0 ? 'No campaigns found. Create your first campaign to get started.' : 'No campaigns match your search.'}
          </div>
        ) : (
          filteredCampaigns.map((campaign: Campaign) => (
            <div
              key={campaign.id}
              onClick={() => handleCampaignClick(campaign)}
              className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {campaign.campaignName || 'Untitled Campaign'}
                  </h3>
                  <div className="flex items-center space-x-3 mt-2">
                    <Badge 
                      variant={campaign.status === 'active' ? 'default' : campaign.status === 'draft' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {campaign.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                    {campaign.websiteUrl && (
                      <span className="text-sm text-muted-foreground">
                        {campaign.websiteUrl}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}