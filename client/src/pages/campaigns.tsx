import React, { useState } from 'react';
import SimpleCampaignSelector from '@/components/SimpleCampaignSelector';
import CampaignForm from '@/components/CampaignForm';
import { Button } from '@/components/ui/button';
import { useCampaign } from '@/contexts/campaign-context';

export default function CampaignPage() {
  const { selectedCampaign, exitCampaign } = useCampaign();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // CRITICAL FIX: Always clear campaign state on landing at /
  React.useEffect(() => {
    console.log('🔄 [CAMPAIGN RESET] Forcing campaign reset on landing');
    localStorage.removeItem('selectedCampaign');
    exitCampaign();
    console.log('✅ [CAMPAIGN RESET] All campaign state cleared');
  }, []);

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  if (showCreateForm) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Create New Campaign</h1>
          <Button variant="outline" onClick={() => setShowCreateForm(false)}>
            Back to Campaigns
          </Button>
        </div>
        <CampaignForm onCancel={() => setShowCreateForm(false)} />
      </div>
    );
  }

  // If no campaign is selected, show the simple selector
  if (!selectedCampaign) {
    return (
      <div className="p-6">
        <SimpleCampaignSelector onCreateNew={handleCreateNew} />
      </div>
    );
  }

  // If a campaign is selected, redirect away from campaign selection
  // This prevents the logical contradiction of showing both campaign selection and modules
  return (
    <div className="p-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Campaign Active</h2>
        <p className="text-muted-foreground">
          You are working with campaign: <strong>{selectedCampaign.campaignName}</strong>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Use the sidebar to access modules, or click "Exit" to change campaigns.
        </p>
      </div>
    </div>
  );
}