import { useState } from "react";
import { useLocation } from "wouter";
import { HighContrastModule } from "@/components/high-contrast-module";
import { getLayoutStyles, textStyles } from "@/lib/layout-utils";
import { ExplanatoryText } from "@/components/explanatory-text";
import { StyledHeading } from "@/components/styled-heading";
import { StyledButton } from "@/components/styled-button";
import { Settings } from "lucide-react";

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
        <StyledHeading level="h1" customColor="#FFFFFF">Omega Module System</StyledHeading>
        <Button 
          variant="outline" 
          onClick={() => setLocation("/subscription")}
          className="text-sm"
        >
          Manage Subscription
        </Button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <ExplanatoryText isDark={true}>
          Welcome to the Omega Module System. This foundational framework provides 10 empty module slots 
          that can be customized and populated when forking this project. Select any module to view or edit its details.
        </ExplanatoryText>
      </div>

      <div style={pageStyles.moduleSection}>
        <StyledHeading level="h3" customColor="#FFFFFF">Available Modules</StyledHeading>
        
        <ExplanatoryText isDark={true}>
          The following modules are ready for customization. Each module serves as an independent container for your code.
        </ExplanatoryText>
        
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