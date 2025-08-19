"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, FileText, X, Loader2, Search } from "lucide-react";

import type { PdfItem } from "@/types";

export type { PdfItem };

interface PdfDropdownProps {
  currentPdfId?: string;
  onSelectPdf: (pdf: PdfItem) => void;
  onDeletePdf: (docId: string) => void;
  refreshTrigger?: number; // Add a trigger to force refresh
}

export function PdfDropdown({ currentPdfId, onSelectPdf, onDeletePdf, refreshTrigger }: PdfDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch PDFs when dropdown opens or when refresh is triggered
  useEffect(() => {
    if (isOpen && pdfs.length === 0) {
      fetchPdfs();
    }
  }, [isOpen, pdfs.length]);

  // Refresh PDFs when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchPdfs();
    }
  }, [refreshTrigger]);

  async function fetchPdfs() {
    setLoading(true);
    try {
      const response = await fetch("/api/pdfs");
      const data = await response.json();
      setPdfs(data.pdfs || []);
    } catch (error) {
      console.error("Failed to fetch PDFs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePdf(docId: string, event: React.MouseEvent) {
    event.stopPropagation(); // Prevent dropdown from closing
    
    if (deletingId) return; // Prevent multiple deletes
    
    setDeletingId(docId);
    try {
      const response = await fetch(`/api/pdfs/${docId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        // Remove from local state
        setPdfs(prev => prev.filter(pdf => pdf.docId !== docId));
        // Notify parent component
        onDeletePdf(docId);
      } else {

      }
    } catch (error) {
      console.error("Error deleting PDF:", error);
    } finally {
      setDeletingId(null);
    }
  }

  function handleSelectPdf(pdf: PdfItem) {
    onSelectPdf(pdf);
    setIsOpen(false);
  }

  function formatFileSize(bytes: number): string {
    return Math.round(bytes / 1024) + " KB";
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "ready": return "text-green-600";
      case "processing": return "text-blue-600";
      case "error": return "text-red-600";
      default: return "text-gray-600";
    }
  }

  function getStatusText(pdf: PdfItem): string {
    if (pdf.status === "processing" && pdf.progress) {
      const { processedPages, totalPages } = pdf.progress;
      return `Processing... ${processedPages}/${totalPages || "?"}`;
    }
    return pdf.status;
  }

  // Fuzzy subsequence highlighter: highlights characters in order of the query
  function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query) return text;
    let textIndex = 0;
    let queryIndex = 0;
    const parts: (string | React.JSX.Element)[] = [];
    let buffer = "";

    while (textIndex < text.length) {
      const ch = text[textIndex];
      if (
        queryIndex < query.length &&
        ch.toLowerCase() === query[queryIndex].toLowerCase()
      ) {
        if (buffer) {
          parts.push(buffer);
          buffer = "";
        }
        parts.push(<b key={textIndex}>{ch}</b>);
        queryIndex++;
      } else {
        buffer += ch;
      }
      textIndex++;
    }
    if (buffer) parts.push(buffer);
    return <>{parts}</>;
  }

  // Fuzzy subsequence matcher used for filtering
  function isFuzzyMatch(text: string, query: string): boolean {
    if (!query) return true;
    let textIndex = 0;
    let queryIndex = 0;
    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex].toLowerCase() === query[queryIndex].toLowerCase()) {
        queryIndex++;
      }
      textIndex++;
    }
    return queryIndex === query.length;
  }


  const currentPdf = pdfs.find(pdf => pdf.docId === currentPdfId);
  // Compute filtered results based on search query; default to all when empty
  const filteredPdfs = (searchQuery.trim()
    ? pdfs.filter((pdf) => isFuzzyMatch(pdf.fileName, searchQuery))
    : pdfs);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors w-80">
        <FileText className="w-4 h-4 text-gray-600" />
        {isSearching ? (
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                setIsSearching(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder={"Search documents…"}
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        ) : (
          <div className="flex-1 min-w-0" onClick={() => setIsOpen(!isOpen)}>
            {(() => {
              const display = currentPdf
                ? `${currentPdf.fileName} (${formatFileSize(currentPdf.fileSize)})`
                : "No PDF selected";
              return (
                <span
                  className="block truncate whitespace-nowrap font-medium text-gray-700"
                  title={display}
                >
                  {display}
                </span>
              );
            })()}
          </div>
        )}
        {/* Search toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSearching(true);
            setIsOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="p-1 rounded hover:bg-gray-100 cursor-pointer flex-none"
          title="Search"
        >
          <Search className="w-4 h-4 text-gray-500" />
        </button>
        {/* Open/close dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded hover:bg-gray-100 cursor-pointer flex-none"
          title={isOpen ? "Hide" : "Show"}
        >
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading PDFs...
            </div>
          ) : pdfs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No PDFs uploaded yet
            </div>
          ) : (
            <div className="py-1">
              {filteredPdfs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No results</div>
              ) : (
                filteredPdfs.map((pdf) => (
                  <div
                    key={pdf.docId}
                    className={`px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      pdf.docId === currentPdfId ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      handleSelectPdf(pdf);
                      setSearchQuery("");
                      setIsSearching(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">
                            {highlightMatch(pdf.fileName, searchQuery)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{formatFileSize(pdf.fileSize)}</span>
                          <span>{formatDate(pdf.uploadedAt)}</span>
                          <span className={getStatusColor(pdf.status)}>
                            {getStatusText(pdf)}
                          </span>
                        </div>
                      </div>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeletePdf(pdf.docId, e)}
                        disabled={deletingId === pdf.docId}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        title="Delete PDF"
                      >
                        {deletingId === pdf.docId ? (
                          <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                        ) : (
                          <X className="w-3 h-3 text-red-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
