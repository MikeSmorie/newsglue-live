import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/campaign-context";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Plus } from "lucide-react";
import { useLocation } from "wouter";

interface Campaign {
  id: string;
  name: string;
  brandVoice?: string;
  targetAudience?: string;
  createdAt?: string;
}

export function SimpleCampaignSelector() {
  const { setSelectedCampaign } = useCampaign();
  const [, setLocation] = useLocation();

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/campaigns");
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }
      return response.json() as Promise<Campaign[]>;
    },
  });

  const handleSelectCampaign = (campaign: Campaign) => {
    console.log("[CAMPAIGN SELECTOR] Selecting campaign:", campaign);
    // Clear any existing campaign data first
    localStorage.removeItem('activeCampaign');
    localStorage.removeItem('activeCampaignData');
    
    // Set the new campaign
    setSelectedCampaign(campaign);
    
    // Small delay to ensure state updates, then redirect
    setTimeout(() => {
      setLocation("/module/1");
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Campaigns</CardTitle>
            <CardDescription>
              Failed to load your campaigns. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Select a Campaign
          </h1>
          <p className="text-muted-foreground">
            Choose a campaign to access NewsJack modules and start creating content.
          </p>
        </div>

        {!campaigns || campaigns.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>No Campaigns Found</CardTitle>
              <CardDescription>
                Create your first campaign to get started with NewsJack content generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Card 
                key={campaign.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
                onClick={() => handleSelectCampaign(campaign)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-primary hover:text-primary/80">
                      {campaign.name}
                    </CardTitle>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.targetAudience && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground mb-1">Target Audience:</p>
                      <p className="text-sm text-foreground">{campaign.targetAudience}</p>
                    </div>
                  )}
                  {campaign.brandVoice && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground mb-1">Brand Voice:</p>
                      <p className="text-sm text-foreground">{campaign.brandVoice}</p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCampaign(campaign);
                    }}
                  >
                    Enter Campaign
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}