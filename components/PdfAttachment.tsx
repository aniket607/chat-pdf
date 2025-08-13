"use client";

import { Plus } from "lucide-react";
import { PdfDropdown, PdfItem } from "./PdfDropdown";

interface PdfAttachmentProps {
  currentPdfId?: string;
  onAddNew: () => void;
  onSelectPdf: (pdf: PdfItem) => void;
  onDeletePdf: (docId: string) => void;
  refreshTrigger?: number;
}

export function PdfAttachment({ currentPdfId, onAddNew, onSelectPdf, onDeletePdf, refreshTrigger }: PdfAttachmentProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">PDF Chat</h1>
        
        {/* PDF Dropdown to show and select uploaded PDFs */}
        <PdfDropdown 
          currentPdfId={currentPdfId}
          onSelectPdf={onSelectPdf}
          onDeletePdf={onDeletePdf}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Add/Upload Button */}
      <button
        onClick={onAddNew}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        title="Upload new PDF"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Upload PDF</span>
      </button>
    </div>
  );
}
