import { createContext, useContext, useState, ReactNode } from "react";

interface AdminContextType {
  godMode: boolean;
  setGodMode: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [godMode, setGodMode] = useState(false);

  return (
    <AdminContext.Provider value={{ godMode, setGodMode }}>
      {children}
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
