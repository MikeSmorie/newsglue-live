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
    setSelectedCampaign(campaign);
    setLocation("/module/1");
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
          <div className="grid gap-4 max-w-2xl mx-auto">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => handleSelectCampaign(campaign)}
                className="cursor-pointer bg-card text-card-foreground px-6 py-4 rounded-lg border-2 hover:border-primary/50 transition-all hover:shadow-md"
              >
                <div className="text-xl font-semibold text-primary">{campaign.name}</div>
                {campaign.targetAudience && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Target: {campaign.targetAudience}
                  </div>
                )}
                {campaign.brandVoice && (
                  <div className="text-sm text-muted-foreground">
                    Voice: {campaign.brandVoice}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}