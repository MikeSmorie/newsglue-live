import React, { useState } from 'react';
import SimpleCampaignSelector from '@/components/SimpleCampaignSelector';
import CampaignForm from '@/components/CampaignForm';
import { useCampaign } from '@/contexts/campaign-context';

export default function CampaignPage() {
  const { selectedCampaign } = useCampaign();
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  // If a campaign is selected, the main App component will handle module routing
  return null;
}