import { 
  getPdfDocument, 
  updatePdfDocumentStatus
} from './database';

// Status types to match the original interface
export type DocumentStatusValue = 
  | {
      status: "processing";
      progress: { processedPages: number; totalPages: number | null };
      meta?: {
        parser?: string;
        sample?: string;
        originalName?: string;
        uploadedAt?: string;
      };
    }
  | {
      status: "ready";
      progress: { processedPages: number; totalPages: number };
      meta?: {
        parser?: string;
        sample?: string;
        originalName?: string;
        uploadedAt?: string;
      };
    }
  | {
      status: "error";
      progress: { processedPages: number; totalPages: number | null };
      error: string;
      meta?: {
        parser?: string;
        sample?: string;
        originalName?: string;
        uploadedAt?: string;
      };
    };

// Get document status from database
export async function getStatus(docId: string): Promise<DocumentStatusValue> {
  try {
    const doc = await getPdfDocument(docId);
    
    if (!doc) {
      return { 
        status: "error", 
        error: "Document not found", 
        progress: { processedPages: 0, totalPages: null } 
      };
    }

    const meta = {
      originalName: doc.originalName,
      uploadedAt: doc.uploadedAt,
    };

    // Convert database document to status format
    if (doc.status === "ready") {
      return {
        status: "ready",
        progress: {
          processedPages: doc.processedPages,
          totalPages: doc.totalPages || 0,
        },
        meta,
      };
    } else if (doc.status === "error") {
      return {
        status: "error",
        progress: {
          processedPages: doc.processedPages,
          totalPages: doc.totalPages,
        },
        error: doc.error || "Unknown error",
        meta,
      };
    } else {
      return {
        status: "processing",
        progress: {
          processedPages: doc.processedPages,
          totalPages: doc.totalPages,
        },
        meta,
      };
    }
  } catch (error) {
    console.error('❌ Failed to get status:', error);
    return { 
      status: "error", 
      error: "Failed to retrieve status", 
      progress: { processedPages: 0, totalPages: null } 
    };
  }
}

// Set document status in database
export async function setStatus(docId: string, value: DocumentStatusValue): Promise<void> {
  try {
    const updates: {
      error?: string;
      processedPages?: number;
      totalPages?: number;
    } = {
      processedPages: value.progress.processedPages,
      totalPages: value.progress.totalPages || undefined,
    };

    if (value.status === "error") {
      updates.error = value.error;
    }

    await updatePdfDocumentStatus(docId, value.status, updates);
  } catch (error) {
    console.error('❌ Failed to set status:', error);
    throw error;
  }
}

// Convenience functions for common status updates
export async function setProcessing(
  docId: string, 
  processedPages = 0, 
  totalPages: number | null = null,
  meta?: { parser?: string; sample?: string; originalName?: string; uploadedAt?: string }
): Promise<void> {
  await setStatus(docId, {
    status: "processing",
    progress: { processedPages, totalPages },
    meta,
  });
}

export async function setReady(
  docId: string, 
  processedPages: number, 
  totalPages: number,
  meta?: { parser?: string; sample?: string; originalName?: string; uploadedAt?: string }
): Promise<void> {
  await setStatus(docId, {
    status: "ready",
    progress: { processedPages, totalPages },
    meta,
  });
}

export async function setError(
  docId: string, 
  error: string, 
  processedPages = 0, 
  totalPages: number | null = null,
  meta?: { parser?: string; sample?: string; originalName?: string; uploadedAt?: string }
): Promise<void> {
  await setStatus(docId, {
    status: "error",
    progress: { processedPages, totalPages },
    error,
    meta,
  });
}

// Clear status (delete document from database)
export async function clearStatus(docId: string): Promise<void> {
  try {
    const { deletePdfDocument } = await import('./database');
    await deletePdfDocument(docId);
    console.log(`✅ Cleared status for docId: ${docId}`);
  } catch (error) {
    console.error('❌ Failed to clear status:', error);
    throw error;
  }
}
