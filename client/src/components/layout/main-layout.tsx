import { Sidebar } from "./sidebar";
import { Header } from "./header";
import LoginStatusGuard from "@/components/login-status-guard";
import { useCampaign } from "@/contexts/campaign-context";
import { SimpleCampaignSelector } from "@/components/SimpleCampaignSelector";
import { CampaignDashboard } from "@/components/CampaignDashboard";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { selectedCampaignID, isLoading } = useCampaign();

  // Debug logging
  console.log("[MAIN LAYOUT DEBUG] selectedCampaignID:", selectedCampaignID, "isLoading:", isLoading);

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