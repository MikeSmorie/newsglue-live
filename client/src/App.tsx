import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminRegisterPage from "@/pages/admin-register";
import SupergodRegisterPage from "@/pages/supergod-register";
import SupergodDashboard from "@/pages/supergod-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminCommunications from "@/pages/admin-communications";
import LogsDashboard from "@/pages/admin/logs-dashboard";
import AppCentral from "@/pages/app-central";
import ModuleView from "@/pages/module-view";
import MockDashboard from "@/pages/mock-dashboard";
import MockSettings from "@/pages/mock-settings";
import SubscriptionPage from "@/pages/subscriptions";
import SubscriptionManager from "@/pages/subscription-manager";
import SubscriptionFeatures from "@/pages/subscription-features";
import SubscriptionManagement from "@/pages/subscription-management";

import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { HighContrastThemeToggle } from "@/components/high-contrast-theme-toggle";
import { HighContrastFontControls } from "@/components/high-contrast-font-controls";
import { HighContrastAIButton } from "@/components/high-contrast-ai-button";
import { AdminToggle } from "@/components/admin-toggle";
import { HighContrastNavigation } from "@/components/high-contrast-navigation";
import { AdminProvider } from "@/contexts/admin-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import SubscriptionPlans from "@/pages/subscription-plans";

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "supergod")) {
    return <AuthPage />;
  }
  
  // Log role information
  console.log("[DEBUG] Current user role:", user.role);
  if (user.role === "supergod") {
    console.log("[DEBUG] Super-God privileges unlocked");
  }

  return <Component />;
}

function ProtectedSupergodRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || user.role !== "supergod") {
    // For security, don't even show this route exists to non-supergods
    toast({
      title: "Access Denied",
      description: "This area requires Super-God privileges.",
      variant: "destructive"
    });
    
    return <NotFound />;
  }
  
  console.log("[DEBUG] Super-God exclusive route accessed");
  
  return <Component />;
}

function Router() {
  const { user, isLoading, logout } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        throw new Error(result.message);
      }
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (!user) {
    return (
      <Switch>
        <Route path="/admin-register" component={AdminRegisterPage} />
        <Route path="/supergod-register" component={SupergodRegisterPage} />
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      <nav className="border-b" style={{ 
        backgroundColor: '#000000', 
        borderBottom: '2px solid #007BFF',
        padding: '8px 0'
      }}>
        <div className="container flex h-16 items-center px-4">
          <HighContrastNavigation onLogout={handleLogout} />
          
          <div className="flex items-center gap-4 ml-auto">
            <HighContrastAIButton />
            {user.role === "supergod" && (
              <span style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#FF0000',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #FF0000'
              }}>
                👑 Super-God Mode Active
              </span>
            )}
            <HighContrastFontControls />
            <HighContrastThemeToggle />
          </div>
        </div>
      </nav>

      <Switch>
        {/* Admin routes */}
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin/logs" component={() => <ProtectedAdminRoute component={LogsDashboard} />} />
        <Route path="/admin/subscription-manager" component={() => <ProtectedAdminRoute component={SubscriptionManager} />} />
        <Route path="/admin/communications" component={() => <ProtectedAdminRoute component={AdminCommunications} />} />
        
        {/* Supergod exclusive routes (high-security) */}
        <Route path="/supergod" component={() => <ProtectedSupergodRoute component={SupergodDashboard} />} />
        
        {/* Normal routes */}
        <Route path="/" component={AppCentral} />
        <Route path="/module/:id">
          {(params) => <ModuleView moduleId={params.id} />}
        </Route>
        <Route path="/mock-dashboard" component={MockDashboard} />
        <Route path="/mock-settings" component={MockSettings} />
        <Route path="/subscription" component={SubscriptionManagement} />
        <Route path="/subscription/plans" component={SubscriptionPlans} />
        <Route path="/subscription/features" component={SubscriptionFeatures} />
        <Route component={NotFound} />
      </Switch>

      <AdminToggle />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AdminProvider>
          <Router />
          <Toaster />
        </AdminProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;