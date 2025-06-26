import { Sidebar } from "./sidebar";
import { Header } from "./header";
import LoginStatusGuard from "@/components/login-status-guard";
import { SimpleCampaignSelector } from "@/components/SimpleCampaignSelector";
import { CampaignDashboard } from "@/components/CampaignDashboard";
import { useState, useEffect } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [selectedCampaignID, setSelectedCampaignID] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for selected campaign in localStorage
  useEffect(() => {
    const campaignId = localStorage.getItem('selectedCampaignID');
    setSelectedCampaignID(campaignId);
    setIsLoading(false);
  }, []);

  // Show campaign selector if no campaign is selected
  if (!isLoading && !selectedCampaignID) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-background">
            <LoginStatusGuard>
              <SimpleCampaignSelector />
            </LoginStatusGuard>
          </main>
        </div>
      </div>
    );
  }

  // Show normal layout with sidebar when campaign is selected
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-background">
          <LoginStatusGuard>
            <CampaignDashboard />
            {children}
          </LoginStatusGuard>
        </main>
      </div>
    </div>
  );
}