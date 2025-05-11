import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HighContrastModule } from "@/components/high-contrast-module";
import { HighContrastContent } from "@/components/high-contrast-content";
import { getLayoutStyles } from "@/lib/layout-utils";
import { ExplanatoryText } from "@/components/explanatory-text";
import { StyledHeading } from "@/components/styled-heading";

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = moduleId || params.id;
  const [moduleName, setModuleName] = useState(`Module ${id}`);
  const layoutStyles = getLayoutStyles();

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
      fontWeight: 'bold'
    },
    moduleSection: {
      marginBottom: layoutStyles.section.marginBottom
    },
    contentArea: {
      marginTop: '2rem'
    },
    formSection: {
      marginBottom: '2rem'
    },
    inputContainer: {
      marginBottom: '1.5rem'
    },
    inputLabel: {
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      display: 'block'
    },
    backButton: {
      marginBottom: '2rem'
    }
  };

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.header}>
        <StyledHeading level="h1">{moduleName}</StyledHeading>
        
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
        >
          Back to Modules
        </Button>
      </div>

      <div style={pageStyles.formSection}>
        <div style={pageStyles.inputContainer}>
          <label style={pageStyles.inputLabel}>Module Name:</label>
          <Input
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="max-w-xs"
            placeholder="Enter module name"
          />
        </div>
      </div>

      <HighContrastContent>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            backgroundColor: '#007BFF', 
            marginRight: '12px' 
          }}></div>
          <span style={{ 
            color: '#FFFFFF', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}>
            Module {id} Details
          </span>
        </div>
        
        <ExplanatoryText isDark={true}>
          This is Module {id}. Add your custom functionality here when forking this project.
        </ExplanatoryText>
        
        <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <ExplanatoryText isDark={true}>
            <span style={{ fontStyle: 'italic' }}>
              Module placeholder area - Ready for customization.
            </span>
          </ExplanatoryText>
        </div>
      </HighContrastContent>
    </div>
  );
}