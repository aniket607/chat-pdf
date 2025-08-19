"use client";
import { useEffect, useRef, useState } from "react";
import PdfViewerWrapper, { PdfViewerRef } from "@/components/PdfViewerWrapper";
import ChatWindow from "@/components/ChatWindow";
import { UploadDialog } from "@/components/UploadDialog";
import { PdfAttachment } from "@/components/PdfAttachment";
import { PdfNavigationProvider } from "@/contexts/PdfNavigationContext";
import type { PdfItem, UploadProgress } from "@/types";

export default function Home() {
  const [docId, setDocId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);



  async function onUpload(uploadFile: File) {
    setIsUploadDialogOpen(false); // Close the dialog
    setIsUploading(true);
    
    try {
      // Stage 1: Upload file (10% of total progress)
      setUploadProgress({
        stage: 'uploading',
        progress: 0,
        message: `Uploading ${uploadFile.name}...`
      });

      const form = new FormData();
      form.append("file", uploadFile);
      
      // Simulate upload progress
      for (let i = 0; i <= 10; i++) {
        setUploadProgress({
          stage: 'uploading',
          progress: i,
          message: `Uploading ${uploadFile.name}...`
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      setDocId(json.docId);
      
      // Stage 2-4: Wait for processing with detailed progress
      await waitForProcessingComplete(json.docId);
      
      // Stage 5: Complete
      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'PDF ready for chat!'
      });
      
      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setRefreshTrigger(prev => prev + 1);
    }
  }

  // Helper function to wait for PDF processing to complete
  async function waitForProcessingComplete(docId: string): Promise<void> {

    
    while (true) {
      try {
        const res = await fetch(`/api/doc/${docId}/status`);
        const json = await res.json();
        
        if (json.status === "ready") {
          // Final stage - indexing complete
          setUploadProgress({
            stage: 'indexing',
            progress: 90,
            message: 'Finalizing PDF indexing...'
          });
          break;
        }
        
        if (json.status === "error") {
          setUploadProgress({
            stage: 'complete',
            progress: 100,
            message: 'Error processing PDF'
          });
          break;
        }
        
        // Update progress based on processing stage
        const totalPages = json.progress?.totalPages || 0;
        const processedPages = json.progress?.processedPages || 0;
        
        if (totalPages > 0) {
          // We know total pages - parsing is done, now embedding/indexing
          const processingProgress = Math.min((processedPages / totalPages) * 100, 100);
          
          if (processingProgress < 30) {
            setUploadProgress({
              stage: 'parsing',
              progress: 10 + (processingProgress / 30) * 20, // 10-30%
              message: `Parsing PDF content... (${processedPages}/${totalPages} pages)`
            });
          } else if (processingProgress < 80) {
            setUploadProgress({
              stage: 'embedding',
              progress: 30 + ((processingProgress - 30) / 50) * 40, // 30-70%
              message: `Generating embeddings... (${processedPages}/${totalPages} pages)`
            });
          } else {
            setUploadProgress({
              stage: 'indexing',
              progress: 70 + ((processingProgress - 80) / 20) * 20, // 70-90%
              message: `Indexing to vector database... (${processedPages}/${totalPages} pages)`
            });
          }
        } else {
          // Don't know total pages yet - still parsing
          setUploadProgress({
            stage: 'parsing',
            progress: Math.min(15 + Math.random() * 10, 25), // 15-25%
            message: 'Parsing PDF content...'
          });
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error checking status:", error);
        }
        break;
      }
    }
  }

  function handleOpenUploadDialog() {
    setIsUploadDialogOpen(true);
  }

  function handleSelectPdf(pdf: PdfItem) {
    setDocId(pdf.docId);
  }

  function handleDeletePdf(deletedDocId: string) {
    if (deletedDocId === docId) {
      setDocId(null);
    }
    setRefreshTrigger(prev => prev + 1);
  }

  // Function to navigate to a specific page in the PDF viewer
  const handleGoToPage = (pageNumber: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.goToPage(pageNumber);
    }
  };

  // Split-pane (left chat 40%, right pdf 60%)
  const [leftPct, setLeftPct] = useState<number>(40);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewerRef | null>(null);
  const draggingRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  function onPointerDownResizer(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    setIsResizing(true);
    document.body.style.userSelect = "none";
    try {
      resizerRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
  }
  function onPointerMove(e: PointerEvent) {
    if (!draggingRef.current || !containerRef.current) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(20, Math.min(80, (x / rect.width) * 100));
      setLeftPct(pct);
    });
  }
  function onPointerUp(e?: PointerEvent) {
    draggingRef.current = false;
    setIsResizing(false);
    document.body.style.userSelect = "";
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    window.removeEventListener("pointermove", onPointerMove as unknown as (e: Event) => void);
    window.removeEventListener("pointerup", onPointerUp as unknown as (e: Event) => void);
    try {
      if (e && resizerRef.current) resizerRef.current.releasePointerCapture(e.pointerId);
    } catch {}
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="mx-auto max-w-[1400px] h-full flex flex-col">
        <div className="shrink-0 p-4 border-b bg-background">
          <PdfAttachment 
            currentPdfId={docId || undefined}
            onAddNew={handleOpenUploadDialog}
            onSelectPdf={handleSelectPdf}
            onDeletePdf={handleDeletePdf}
            refreshTrigger={refreshTrigger}
          />
        </div>

        <div ref={containerRef} className={`flex-1 min-h-0 flex relative ${isResizing ? "cursor-col-resize" : ""}`}>
          <div style={{ width: `${leftPct}%` }} className="h-full border-r bg-background p-3 min-h-0">
            {docId ? (
              <PdfNavigationProvider goToPage={handleGoToPage}>
                <ChatWindow docId={docId} />
              </PdfNavigationProvider>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Upload a PDF to start chatting</div>
            )}
          </div>
          <div
            ref={resizerRef}
            onPointerDown={onPointerDownResizer}
            className="w-2 bg-transparent hover:bg-muted-foreground/20 active:bg-muted-foreground/30 cursor-col-resize touch-none select-none"
            aria-label="Resize"
            role="separator"
          />
          <div style={{ width: `${100 - leftPct}%` }} className="h-full bg-white">
            {docId ? <PdfViewerWrapper ref={pdfViewerRef} docId={docId} /> : <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Preview will appear here</div>}
          </div>
        </div>
      </div>

      {/* Upload progress overlay */}
      {uploadProgress && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-xl px-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-purple-700 font-medium">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                <span>{uploadProgress.message}</span>
              </div>
              <div className="text-purple-700 font-semibold">
                {Math.round(uploadProgress.progress)}%
              </div>
            </div>
            <div className="h-2 rounded-full bg-purple-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-purple-600 text-center">
              {uploadProgress.stage === 'uploading' && '📤 Uploading file to server'}
              {uploadProgress.stage === 'parsing' && '📄 Extracting text content'}
              {uploadProgress.stage === 'embedding' && '🧠 Generating AI embeddings'}
              {uploadProgress.stage === 'indexing' && '🔍 Building search index'}
              {uploadProgress.stage === 'complete' && '✅ Ready to chat!'}
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUpload={onUpload}
        isUploading={isUploading}
      />
    </div>
  );
}
