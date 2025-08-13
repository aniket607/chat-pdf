// Shared types for the PDF Chat application

export interface PdfDocument {
  docId: string;
  originalName: string;
  fileSize: number;
  blobUrl: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
  processedPages: number;
  totalPages?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PdfItem {
  docId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'error';
  progress?: {
    processedPages: number;
    totalPages: number | null;
  };
}

export interface UploadProgress {
  stage: 'uploading' | 'parsing' | 'embedding' | 'indexing' | 'complete';
  progress: number;
  message: string;
}

export interface VectorRecord {
  id: string;
  docId: string;
  pageStart: number;
  pageEnd: number;
  chunkIndex: number;
  text: string;
  vector: number[];
}

export interface DocumentStatus {
  status: 'processing' | 'ready' | 'error';
  progress?: {
    processedPages: number;
    totalPages: number | null;
  };
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IngestResult {
  docId: string;
  totalPages: number;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}
