import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeControls } from "@/components/font-size-controls";
import { NavigationControls } from "@/components/navigation-controls";
import { AdminToggle } from "@/components/admin-toggle";
import { AdminProvider, useAdmin } from "@/contexts/admin-context";

function MainContent() {
  const { user } = useUser();
  const { godMode } = useAdmin();

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center">
      {godMode ? (
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            God Mode Activated
          </h1>
          <p className="text-muted-foreground">
            Welcome Administrator {user?.username}
          </p>
          {/* Add more admin features here */}
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold">Welcome {user?.username}!</h1>
          <p className="text-muted-foreground">
            You're in regular user mode
          </p>
        </div>
      )}
    </div>
  );
}

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="container flex h-16 items-center px-4">
          <NavigationControls />
          <div className="flex items-center gap-4 ml-auto">
            <FontSizeControls />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <Switch>
        <Route path="/" component={MainContent} />
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