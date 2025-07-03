import React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import LoginStatusGuard from "@/components/login-status-guard";
import { useCampaign } from "@/contexts/campaign-context";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { selectedCampaign } = useCampaign();
  const [location, setLocation] = useLocation();
  
  // Block module access without valid campaign context
  const isModuleRoute = location.startsWith('/module/');
  const isProtectedRoute = isModuleRoute;
  
  // Enforce campaign context integrity - redirect to campaign selector
  React.useEffect(() => {
    if (isProtectedRoute && (!selectedCampaign || !selectedCampaign.id)) {
      setLocation('/');
    }
  }, [isProtectedRoute, selectedCampaign, setLocation]);
  
  // STEP 2: Enforce sidebar visibility ONLY when campaign is actively selected
  const showSidebar = !!selectedCampaign && !!selectedCampaign.id;
  
  // STEP 6: Enhanced dev logging for campaign state validation
  React.useEffect(() => {
    console.log('🔒 [CAMPAIGN GUARDRAILS]', { 
      selectedCampaign: selectedCampaign?.id || 'NULL', 
      showSidebar,
      location,
      timestamp: new Date().toLocaleTimeString()
    });
    
    if (showSidebar) {
      console.log('✅ SIDEBAR RENDERED - Campaign active:', selectedCampaign?.campaignName);
    } else {
      console.log('❌ SIDEBAR HIDDEN - No campaign selected');
    }
  }, [selectedCampaign, showSidebar, location]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {showSidebar && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          <LoginStatusGuard>
            {children}
          </LoginStatusGuard>
        </main>
      </div>
    </div>
  );
}