"use client";

import { FileText } from "lucide-react";

interface CitationButtonProps {
  pageNumber: number;
  onClick: (pageNumber: number) => void;
  className?: string;
  isRange?: boolean;
  endPage?: number;
}

export function CitationButton({ pageNumber, onClick, className = "", isRange = false, endPage }: CitationButtonProps) {
  const displayText = isRange && endPage ? `p.${pageNumber}-${endPage}` : `p.${pageNumber}`;
  const tooltipText = isRange && endPage ? `Go to page ${pageNumber} (range: ${pageNumber}-${endPage})` : `Go to page ${pageNumber}`;
  
  return (
    <button
      onClick={() => onClick(pageNumber)}
      className={`
        inline-flex items-center gap-1 px-2 py-1 ml-1 
        bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300
        rounded-md text-xs font-medium text-blue-700 hover:text-blue-800
        transition-colors duration-150 cursor-pointer
        ${className}
      `}
      title={tooltipText}
    >
      <FileText className="w-3 h-3" />
      <span>{displayText}</span>
    </button>
  );
}
