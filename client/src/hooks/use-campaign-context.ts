import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Campaign {
  id: string;
  campaignName: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  websiteUrl?: string;
  ctaUrl?: string;
  emotionalObjective?: string;
  audiencePain?: string;
  socialSettings?: any;
}

export function useCampaignContext() {
  const [activeCampaignId, setActiveCampaignId] = useState<string>('');

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    }
  });

  // Auto-select the first active campaign, or first draft if no active campaigns
  useEffect(() => {
    if (campaigns.length > 0 && !activeCampaignId) {
      const activeCampaign = campaigns.find(c => c.status === 'active') || campaigns[0];
      setActiveCampaignId(activeCampaign.id);
    }
  }, [campaigns, activeCampaignId]);

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  return {
    activeCampaignId,
    activeCampaign,
    campaigns,
    setActiveCampaignId
  };
}