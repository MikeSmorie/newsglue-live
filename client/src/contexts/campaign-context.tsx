import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Campaign {
  id: string;
  campaignName: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  websiteUrl?: string;
  channels?: any[];
}

interface CampaignContextType {
  selectedCampaign: Campaign | null;
  setSelectedCampaign: (campaign: Campaign | null) => void;
  selectCampaign: (campaign: Campaign) => void;
  isInCampaignMode: boolean;
  exitCampaign: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Restore campaign from localStorage on mount - needed for navigation persistence
  useEffect(() => {
    const saved = localStorage.getItem('selectedCampaign');
    if (saved) {
      try {
        const campaign = JSON.parse(saved);
        setSelectedCampaign(campaign);
        console.log('🔄 [CAMPAIGN CONTEXT] Restored campaign from localStorage:', campaign.campaignName);
      } catch (e) {
        console.error('❌ [CAMPAIGN CONTEXT] Failed to restore campaign from localStorage');
        localStorage.removeItem('selectedCampaign');
      }
    }
  }, []);

  // Save selected campaign to localStorage when it changes
  useEffect(() => {
    if (selectedCampaign) {
      localStorage.setItem('selectedCampaign', JSON.stringify(selectedCampaign));
    } else {
      localStorage.removeItem('selectedCampaign');
    }
  }, [selectedCampaign]);

  const selectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };

  const exitCampaign = () => {
    setSelectedCampaign(null);
    localStorage.removeItem('selectedCampaign');
  };

  const isInCampaignMode = selectedCampaign !== null;

  return (
    <CampaignContext.Provider 
      value={{ 
        selectedCampaign, 
        setSelectedCampaign, 
        selectCampaign,
        isInCampaignMode, 
        exitCampaign 
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}