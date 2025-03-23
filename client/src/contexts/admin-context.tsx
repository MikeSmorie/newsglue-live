import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "../hooks/use-user";
import { useToast } from "../hooks/use-toast";

interface AdminContextType {
  godMode: boolean;
  setGodMode: (value: boolean) => void;
  isSupergod: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [godMode, setGodMode] = useState(false);
  const [isSupergod, setIsSupergod] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  
  // Check if user has supergod role
  useEffect(() => {
    if (user?.role === "supergod") {
      setIsSupergod(true);
      // Show toast message for supergod users
      toast({
        title: "👑 Super-God Mode Access",
        description: "You have the highest level privileges in the system.",
        variant: "destructive"
      });
      console.log("[DEBUG] Super-God privileges detected on client");
    } else {
      setIsSupergod(false);
    }
  }, [user, toast]);

  return (
    <AdminContext.Provider value={{ godMode, setGodMode, isSupergod }}>
      {children}
      {isSupergod && (
        <div className="fixed top-0 left-0 w-full bg-destructive text-destructive-foreground py-1 text-center z-50">
          👑 Super-God Mode Active
        </div>
      )}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
