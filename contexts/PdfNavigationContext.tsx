"use client";

import { createContext, useContext } from "react";

interface PdfNavigationContextType {
  goToPage: (pageNumber: number) => void;
}

const PdfNavigationContext = createContext<PdfNavigationContextType | null>(null);

export function PdfNavigationProvider({ 
  children, 
  goToPage 
}: { 
  children: React.ReactNode;
  goToPage: (pageNumber: number) => void;
}) {
  return (
    <PdfNavigationContext.Provider value={{ goToPage }}>
      {children}
    </PdfNavigationContext.Provider>
  );
}

export function usePdfNavigation() {
  const context = useContext(PdfNavigationContext);
  if (!context) {
    throw new Error('usePdfNavigation must be used within a PdfNavigationProvider');
  }
  return context;
}
