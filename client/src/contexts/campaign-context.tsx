import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Campaign {
  id: string;
  name: string;
  brandVoice?: string;
  targetAudience?: string;
}

interface CampaignContextType {
  selectedCampaignID: string | null;
  selectedCampaign: Campaign | null;
  setSelectedCampaign: (campaign: Campaign | null) => void;
  clearSelectedCampaign: () => void;
  isLoading: boolean;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [selectedCampaignID, setSelectedCampaignID] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaignState] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on app start
  useEffect(() => {
    const storedCampaignId = localStorage.getItem('activeCampaign');
    const storedCampaign = localStorage.getItem('activeCampaignData');
    
    if (storedCampaignId && storedCampaign) {
      try {
        const campaignData = JSON.parse(storedCampaign);
        setSelectedCampaignID(storedCampaignId);
        setSelectedCampaignState(campaignData);
      } catch (error) {
        console.error('Failed to parse stored campaign data:', error);
        localStorage.removeItem('activeCampaign');
        localStorage.removeItem('activeCampaignData');
      }
    }
    setIsLoading(false);
  }, []);

  const setSelectedCampaign = (campaign: Campaign | null) => {
    if (campaign) {
      setSelectedCampaignID(campaign.id);
      setSelectedCampaignState(campaign);
      localStorage.setItem('activeCampaign', campaign.id);
      localStorage.setItem('activeCampaignData', JSON.stringify(campaign));
    } else {
      setSelectedCampaignID(null);
      setSelectedCampaignState(null);
      localStorage.removeItem('activeCampaign');
      localStorage.removeItem('activeCampaignData');
    }
  };

  const clearSelectedCampaign = () => {
    console.log("[CAMPAIGN CONTEXT] Clearing campaign selection");
    setSelectedCampaignID(null);
    setSelectedCampaignState(null);
    localStorage.removeItem('activeCampaign');
    localStorage.removeItem('activeCampaignData');
  };

  return (
    <CampaignContext.Provider value={{
      selectedCampaignID,
      selectedCampaign,
      setSelectedCampaign,
      clearSelectedCampaign,
      isLoading
    }}>
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