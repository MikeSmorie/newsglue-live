import React from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

export function HighContrastFontControls() {
  const decreaseFontSize = () => {
    const htmlElement = document.documentElement;
    const currentSize = parseFloat(window.getComputedStyle(htmlElement).fontSize);
    const newSize = Math.max(currentSize - 2, 12); // Don't go below 12px
    htmlElement.style.fontSize = `${newSize}px`;
  };

  const increaseFontSize = () => {
    const htmlElement = document.documentElement;
    const currentSize = parseFloat(window.getComputedStyle(htmlElement).fontSize);
    const newSize = Math.min(currentSize + 2, 24); // Don't go above 24px
    htmlElement.style.fontSize = `${newSize}px`;
  };

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

  return (
    <div className="flex items-center">
      <button
        onClick={decreaseFontSize}
        style={buttonStyle}
        title="Decrease font size"
      >
        <ZoomOut color="#007BFF" size={20} />
      </button>
      
      <button
        onClick={increaseFontSize}
        style={buttonStyle}
        title="Increase font size"
      >
        <ZoomIn color="#007BFF" size={20} />
      </button>
    </div>
  );
}