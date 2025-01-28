import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminRegisterPage from "@/pages/admin-register";
import AdminDashboard from "@/pages/admin-dashboard";
import PlaceholderApp from "@/pages/placeholder-app";
import MockDashboard from "@/pages/mock-dashboard";
import MockSettings from "@/pages/mock-settings";
import SubscriptionPage from "@/pages/subscriptions";
import SubscriptionManager from "@/pages/subscription-manager";
import { useUser } from "@/hooks/use-user";
import { Loader2, LogOut } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeControls } from "@/components/font-size-controls";
import { NavigationControls } from "@/components/navigation-controls";
import { AdminToggle } from "@/components/admin-toggle";
import { AIAssistant } from "@/components/ai-assistant";
import { AdminProvider } from "@/contexts/admin-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Protected Route Component
function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <AuthPage />;
  }

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
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="container flex h-16 items-center px-4">
          <NavigationControls />
          <div className="flex items-center gap-4 ml-auto">
            <AIAssistant />
            <span className="text-sm text-muted-foreground">
              {user.username}
            </span>
            <FontSizeControls />
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <Switch>
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin/subscription-manager" component={() => <ProtectedAdminRoute component={SubscriptionManager} />} />
        <Route path="/" component={PlaceholderApp} />
        <Route path="/mock-dashboard" component={MockDashboard} />
        <Route path="/mock-settings" component={MockSettings} />
        <Route path="/subscriptions" component={SubscriptionPage} />
        <Route component={NotFound} />
      </Switch>

      <AdminToggle />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AdminProvider>
        <QueryClientProvider client={queryClient}>
          <Router />
          <Toaster />
        </QueryClientProvider>
      </AdminProvider>
    </ThemeProvider>
  );
}

export default App;