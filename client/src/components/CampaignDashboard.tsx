import { useCampaign } from "@/contexts/campaign-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CampaignDashboard() {
  const { selectedCampaign, clearSelectedCampaign } = useCampaign();

  if (!selectedCampaign) {
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
              <CardTitle className="text-xl">{selectedCampaign.name}</CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {selectedCampaign.targetAudience && (
              <div>
                <p className="text-muted-foreground mb-1">Target Audience:</p>
                <p className="text-foreground">{selectedCampaign.targetAudience}</p>
              </div>
            )}
            {selectedCampaign.brandVoice && (
              <div>
                <p className="text-muted-foreground mb-1">Brand Voice:</p>
                <p className="text-foreground">{selectedCampaign.brandVoice}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}