import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CampaignForm from '../../client/src/components/CampaignForm';
import { Button } from '../../client/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../client/src/components/ui/card';
import { Badge } from '../../client/src/components/ui/badge';
import { PlusCircle, Calendar, Globe, Target } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  websiteUrl?: string;
  ctaUrl?: string;
  emotionalObjective?: string;
  audiencePain?: string;
  additionalData?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignBuilder() {
  const [showForm, setShowForm] = useState(false);

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns');
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      return response.json() as Promise<Campaign[]>;
    },
  });

  const handleCampaignCreated = () => {
    setShowForm(false);
    refetch();
  };

  if (showForm) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Campaign Builder</h1>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Back to Campaigns
          </Button>
        </div>
        <CampaignForm onSuccess={handleCampaignCreated} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Builder</h1>
          <p className="text-sm text-gray-400">
            Create and manage marketing campaigns with strategic objectives and brand voice definitions
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
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
                  <span className="truncate">{campaign.campaignName}</span>
                  {campaign.tone && (
                    <Badge variant="secondary" className="ml-2">
                      {campaign.tone}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaign.campaignUrl && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{campaign.campaignUrl}</span>
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
                
                {campaign.strategy_q2 && (
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="h-3 w-3 mt-1 text-blue-400" />
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Pain-Focused Audience</div>
                      <div className="text-gray-300 line-clamp-2">{campaign.strategy_q2}</div>
                    </div>
                  </div>
                )}

                {campaign.strategy_q1 && (
                  <div className="text-sm">
                    <div className="text-xs text-gray-500 uppercase mb-1">Emotional Objective</div>
                    <div className="text-gray-300 line-clamp-2">{campaign.strategy_q1}</div>
                  </div>
                )}

                {campaign.strategy_q4 && (
                  <div className="text-sm">
                    <div className="text-xs text-gray-500 uppercase mb-1">Target Emotion</div>
                    <div className="text-gray-300 line-clamp-2">{campaign.strategy_q4}</div>
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