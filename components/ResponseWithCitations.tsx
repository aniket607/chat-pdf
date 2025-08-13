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
    
    // Enhanced regex to match various citation formats:
    // [p.3], [p.3-5], [p.3, p.4, p.5], [p.3,p.4,p.5]
    const citationRegex = /\[p\.\d+(?:(?:\s*,\s*p\.\d+)*|(?:\s*-\s*\d+)?)\]/g;
    let match;
    
    // Find all citations and extract page numbers
    while ((match = citationRegex.exec(children)) !== null) {
      const fullCitation = match[0]; // e.g., "[p.1, p.3, p.4, p.5]"
      
      // Extract individual page numbers from the citation
      const pageMatches = fullCitation.match(/p\.(\d+)/g);
      if (pageMatches) {
        for (const pageMatch of pageMatches) {
          const pageNum = parseInt(pageMatch.replace('p.', ''));
          if (!isNaN(pageNum)) {
            pageNumbers.add(pageNum);
          }
        }
      }
      
      // Handle ranges like [p.3-5]
      const rangeMatch = fullCitation.match(/p\.(\d+)\s*-\s*(\d+)/);
      if (rangeMatch) {
        const startPage = parseInt(rangeMatch[1]);
        const endPage = parseInt(rangeMatch[2]);
        
        if (!isNaN(startPage) && !isNaN(endPage)) {
          for (let page = startPage; page <= endPage; page++) {
            pageNumbers.add(page);
          }
        }
      }
    }
    
    // Convert to sorted array of unique citations
    const uniqueCitations = Array.from(pageNumbers)
      .sort((a, b) => a - b)
      .map(pageNumber => ({
        pageNumber,
        originalText: `[p.${pageNumber}]`,
        index: 0 
      }));
    
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
