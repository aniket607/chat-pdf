"use client";

import { Response } from "@/components/ai-elements/response";
import { CitationButton } from "./CitationButton";
import { usePdfNavigation } from "@/contexts/PdfNavigationContext";
import { useMemo } from "react";

interface ResponseWithCitationsProps {
  children: string;
}

export function ResponseWithCitations({ children }: ResponseWithCitationsProps) {
  const { goToPage } = usePdfNavigation();

  // Extract citations and clean text for Response component
  const { cleanText, citations } = useMemo(() => {
    const pageNumbers = new Set<number>();
    const citationInfo = new Map<number, { isRange: boolean; endPage?: number }>();
    
    // Standardized citation format: [p.N], [p.N-M], [p.N, M, O], [p.N, M-O, P]
    const citationRegex = /\[p\.\s*[\d\s,\-]+\]/g;
    let match;
    
    // Find all citations and extract page numbers
    while ((match = citationRegex.exec(children)) !== null) {
      const fullCitation = match[0]; // e.g., "[p.15-42, 61-62]"
      
      // Extract the content inside brackets and remove "p." and any following spaces
      const content = fullCitation.replace(/^\[p\.\s*/, '').replace(/\]$/, '');
      
      // Split by comma and process each part
      const parts = content.split(',').map(part => part.trim());
      
      for (const part of parts) {
        if (part.includes('-')) {
          // Handle range like "15-42" - only add the start page
          const [startStr, endStr] = part.split('-').map(s => s.trim());
          const startPage = parseInt(startStr);
          const endPage = parseInt(endStr);
          
          if (!isNaN(startPage) && !isNaN(endPage)) {
            // Only add the start page for ranges, but store range info for display
            pageNumbers.add(startPage);
            citationInfo.set(startPage, { isRange: true, endPage });
          }
        } else {
          // Handle single page like "61"
          const pageNum = parseInt(part);
          if (!isNaN(pageNum)) {
            pageNumbers.add(pageNum);
            citationInfo.set(pageNum, { isRange: false });
          }
        }
      }
    }
    
    // Convert to sorted array of unique citations with range info
    const uniqueCitations = Array.from(pageNumbers)
      .sort((a, b) => a - b)
      .map(pageNumber => {
        const info = citationInfo.get(pageNumber);
        return {
          pageNumber,
          originalText: info?.isRange && info.endPage 
            ? `[p.${pageNumber}-${info.endPage}]` 
            : `[p.${pageNumber}]`,
          isRange: info?.isRange || false,
          endPage: info?.endPage,
          index: 0 
        };
      });
    
    // Remove citations from text for clean markdown rendering
    const cleanedText = children.replace(citationRegex, '');
    
    return {
      cleanText: cleanedText,
      citations: uniqueCitations
    };
  }, [children]);

  // If no citations found, just render normal Response
  if (citations.length === 0) {
    return <Response>{children}</Response>;
  }

  return (
    <div className="space-y-2">
      <Response>{cleanText}</Response>
      {citations.length > 0 && (
        <div className="flex flex-wrap gap-1 text-sm">
          <span className="text-gray-600 mr-1">Sources:</span>
          {citations.map((citation, index) => (
            <CitationButton
              key={`citation-${index}-${citation.pageNumber}`}
              pageNumber={citation.pageNumber}
              onClick={goToPage}
              isRange={citation.isRange}
              endPage={citation.endPage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
