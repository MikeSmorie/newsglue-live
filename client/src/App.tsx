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
import { Loader2, LogOut, ArrowLeft, ArrowRight, Home, Settings } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeControls } from "@/components/font-size-controls";
import { AdminToggle } from "@/components/admin-toggle";
import { AIAssistant } from "@/components/ai-assistant";
import { AdminProvider } from "@/contexts/admin-context";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-black">
      <nav className="border-b border-blue-600">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.history.back()}
              className="h-8 w-8 border-blue-600"
            >
              <ArrowLeft className="h-4 w-4 text-blue-600" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
              className="h-8 w-8 border-blue-600"
            >
              <Home className="h-4 w-4 text-blue-600" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.history.forward()}
              className="h-8 w-8 border-blue-600"
            >
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </Button>
            
            <span className="ml-4 text-white font-bold">
              {user?.username || "User1#*User1$"}
            </span>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <Button variant="outline" size="icon" className="h-8 w-8 border-blue-600">
              <Settings className="h-4 w-4 text-blue-600" />
            </Button>
            
            <Button variant="outline" size="icon" className="h-8 w-8 border-red-600">
              <LogOut className="h-4 w-4 text-red-600" />
            </Button>
            
            <AIAssistant />
            
            {user?.role === "supergod" && (
              <span className="text-sm font-bold text-red-500">
                👑 Super-God Mode Active
              </span>
            )}
            
            <FontSizeControls />
            <ThemeToggle />
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