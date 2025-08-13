"use client";
import { useEffect, useState, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - production-ready with multiple fallbacks
if (typeof window !== 'undefined') {
  const setupWorker = async () => {
    const workerSources = [
      // Primary: Local worker file (always available)
      '/pdf.worker.min.mjs',
      // Fallback 1: Cloudflare CDN (fast, reliable)
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`,
      // Fallback 2: jsDelivr CDN
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
      // Fallback 3: unpkg CDN
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    ];

    // Use the first available source
    pdfjs.GlobalWorkerOptions.workerSrc = workerSources[0];
  };

  setupWorker();
}

type PdfViewerProps = {
  docId: string;
};

export interface PdfViewerRef {
  goToPage: (pageNumber: number) => void;
  getCurrentPage: () => number;
  getTotalPages: () => number;
}

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(({ docId }, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [currentVisiblePage, setCurrentVisiblePage] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Expose methods via ref for citation navigation
  useImperativeHandle(ref, () => ({
    goToPage: (pageNumber: number) => {
      if (pageNumber >= 1 && pageNumber <= numPages && containerRef.current) {
        // Scroll to the specific page element
        const pageElement = containerRef.current.querySelector(`[data-page-number="${pageNumber}"]`);
        if (pageElement) {
          pageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }
    },
    getCurrentPage: () => {
      return currentVisiblePage;
    },
    getTotalPages: () => numPages,
  }));

  // Fetch PDF URL when docId changes
  useEffect(() => {
    if (docId) {
      setIsLoading(true);
      setError(null);
      setNumPages(0);
      setPdfUrl(`/api/doc/${docId}/file`);
    }
  }, [docId]);

  // Set up intersection observer to track current visible page
  useEffect(() => {
    if (numPages > 0 && containerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '1');
              setCurrentVisiblePage(pageNumber);
            }
          });
        },
        {
          root: containerRef.current,
          rootMargin: '-50% 0px -50% 0px',
          threshold: 0
        }
      );

      // Observe all page elements
      const pageElements = containerRef.current.querySelectorAll('[data-page-number]');
      pageElements.forEach((element) => {
        observerRef.current?.observe(element);
      });

      return () => {
        observerRef.current?.disconnect();
      };
    }
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    setCurrentVisiblePage(1);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  }, []);

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  if (error) {
    return (
      <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">⚠️ Error Loading PDF</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow relative flex flex-col">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {numPages > 0 ? `Page ${currentVisiblePage} of ${numPages}` : 'Loading...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-1 rounded hover:bg-gray-200"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button
            onClick={resetZoom}
            className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-200 min-w-[40px]"
            title="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          
          <button
            onClick={zoomIn}
            className="p-1 rounded hover:bg-gray-200"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={rotate}
            className="p-1 rounded hover:bg-gray-200"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Content - Vertical Scrolling */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center gap-2 text-gray-600 h-32">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading PDF...</span>
              </div>
            }
            className="flex flex-col items-center"
          >
            {numPages > 0 && (
              <div className="space-y-4">
                {Array.from(new Array(numPages), (el, index) => (
                  <div 
                    key={`page_${index + 1}`}
                    data-page-number={index + 1}
                    className="relative"
                  >
                    {/* Page number indicator */}
                    <div className="absolute -top-6 left-0 text-xs text-gray-500 font-medium">
                      Page {index + 1}
                    </div>
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      rotate={rotation}
                      className="bg-white shadow-md"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div className="bg-gray-200 animate-pulse h-96 w-72 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Loading page {index + 1}...</span>
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </Document>
        )}
      </div>
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';

export default PdfViewer;


