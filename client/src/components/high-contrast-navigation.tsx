import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Home, LogOut, Settings } from "lucide-react";
import { useUser } from "@/hooks/use-user";

interface NavigationProps {
  onLogout: () => void;
}

export function HighContrastNavigation({ onLogout }: NavigationProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();

  const buttonStyle = {
    backgroundColor: '#F9FAFB',
    border: '2px solid #007BFF',
    borderRadius: '5px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginRight: '8px'
  };

  const userBadgeStyle = {
    padding: '5px 12px',
    backgroundColor: '#007BFF',
    color: '#FFFFFF',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
    marginLeft: '12px'
  };

  return (
    <div className="flex flex-row justify-between w-full">
      <div className="flex items-center">
        <button
          onClick={() => window.history.back()}
          style={buttonStyle}
          title="Go back"
        >
          <ArrowLeft color="#007BFF" size={20} />
        </button>
        
        <button
          onClick={() => navigate("/")}
          style={buttonStyle}
          title="Home"
        >
          <Home color="#007BFF" size={20} />
        </button>
        
        <button
          onClick={() => window.history.forward()}
          style={buttonStyle}
          title="Go forward"
        >
          <ArrowRight color="#007BFF" size={20} />
        </button>

        {user && <span style={userBadgeStyle}>{user.username}</span>}
      </div>
      
      <div className="flex items-center">
        <button
          onClick={() => navigate("/subscription")}
          style={{
            ...buttonStyle,
            border: '2px solid #007BFF'
          }}
          title="Settings"
        >
          <Settings color="#007BFF" size={20} />
        </button>
        
        <button
          onClick={onLogout}
          style={{
            ...buttonStyle,
            border: '2px solid #FF3333',
          }}
          title="Log out"
        >
          <LogOut color="#FF3333" size={20} />
        </button>
      </div>
    </div>
  );
}