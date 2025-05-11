import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { HighContrastModule } from "@/components/high-contrast-module";
import { getLayoutStyles } from "@/lib/layout-utils";

export default function AppCentral() {
  const [, setLocation] = useLocation();
  const layoutStyles = getLayoutStyles();
  
  // Create 10 empty modules
  const modules = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Module ${i + 1}`
  }));

  const pageStyles = {
    container: {
      padding: `${layoutStyles.section.paddingTop} ${layoutStyles.content.paddingRight} ${layoutStyles.section.paddingBottom} ${layoutStyles.content.paddingLeft}`,
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      paddingTop: layoutStyles.header.paddingTop,
      paddingBottom: layoutStyles.header.paddingBottom,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#FFFFFF'
    },
    moduleSection: {
      marginBottom: layoutStyles.section.marginBottom
    },
    moduleList: {
      width: '280px'
    }
  };

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.header}>
        <h1 style={pageStyles.title}>Omega Module System</h1>
        <Button 
          variant="outline" 
          onClick={() => setLocation("/subscription")}
          className="text-sm"
        >
          Manage Subscription
        </Button>
      </div>

      <div style={pageStyles.moduleSection}>
        <div style={pageStyles.moduleList}>
          {modules.map((module) => (
            <HighContrastModule 
              key={module.id}
              id={module.id}
              name={module.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}