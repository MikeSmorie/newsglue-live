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
        <h1 className="text-2xl font-bold">Create New Campaign</h1>
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