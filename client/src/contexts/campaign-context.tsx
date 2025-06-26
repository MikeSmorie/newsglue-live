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

  // Load selected campaign from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedCampaign');
    if (stored) {
      try {
        const campaign = JSON.parse(stored);
        setSelectedCampaign(campaign);
      } catch (error) {
        console.error('Failed to parse stored campaign:', error);
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