import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function CampaignDashboard() {
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const campaignName = localStorage.getItem('selectedCampaignName');
    if (campaignName) {
      setSelectedCampaignName(campaignName);
    }
  }, []);

  const clearSelectedCampaign = () => {
    localStorage.removeItem('selectedCampaignID');
    localStorage.removeItem('selectedCampaignName');
    setLocation('/');
  };

  if (!selectedCampaignName) {
    return null;
  }

  return (
    <div className="mb-6">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Active Campaign
              </Badge>
              <CardTitle className="text-xl">{selectedCampaignName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelectedCampaign}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Campaign
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            Campaign active and ready for content generation
          </div>
        </CardContent>
      </Card>
    </div>
  );
}