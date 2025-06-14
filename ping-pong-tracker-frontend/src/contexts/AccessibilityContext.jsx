// src/contexts/AccessibilityContext.jsx
import React, { createContext, useContext } from 'react';
import { announceToScreenReader } from '../utils/accessibility';

const AccessibilityContext = createContext();

export const AccessibilityProvider = ({ children }) => {
  const announce = (message) => {
    announceToScreenReader(message);
  };
  
  return (
    <AccessibilityContext.Provider value={{ announce }}>
      {children}
      <div 
        id="sr-announcer" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
