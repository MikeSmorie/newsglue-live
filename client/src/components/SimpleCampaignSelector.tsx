import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface Campaign {
  id: string;
  name: string;
  brandVoice?: string;
  targetAudience?: string;
  createdAt?: string;
}

export function SimpleCampaignSelector() {
  const [, setLocation] = useLocation();

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns');
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      return response.json() as Promise<Campaign[]>;
    },
  });

  // Check if campaign already selected and redirect
  useEffect(() => {
    const selected = localStorage.getItem('selectedCampaignID');
    if (selected) {
      setLocation('/module/1');
    }
  }, [setLocation]);

  const selectCampaign = (id: string, name: string) => {
    localStorage.setItem('selectedCampaignID', id);
    localStorage.setItem('selectedCampaignName', name);
    setLocation('/module/1');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Campaigns</h2>
          <p className="text-muted-foreground">Failed to load your campaigns. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-10 bg-background text-foreground">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">🎯 Select a Campaign</h1>
        <button
          onClick={() => setLocation('/module/1')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          + Create New Campaign
        </button>
      </div>
      
      {!campaigns || campaigns.length === 0 ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Campaigns Found</h2>
          <p className="text-muted-foreground">Create your first campaign to get started with NewsJack content generation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {campaigns.map((campaign) => {
            const campaignName = campaign.campaignName || campaign.name || 'Unnamed Campaign';
            const createdDate = campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Jun 26, 2025';
            
            return (
              <button
                key={campaign.id}
                onClick={() => selectCampaign(campaign.id, campaignName)}
                className="p-6 rounded bg-card hover:bg-muted/50 cursor-pointer transition-all border-2 hover:border-primary/50 text-left w-full"
              >
                <h2 className="text-xl font-bold text-primary mb-2">{campaignName}</h2>
                <p className="text-sm text-muted-foreground">Created {createdDate}</p>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}