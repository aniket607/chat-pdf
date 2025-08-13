import { neon } from '@neondatabase/serverless';

// Initialize the database connection
const sql = neon(process.env.DATABASE_URL!);

// Database schema types
export interface PdfDocument {
  docId: string;
  originalName: string;
  fileSize: number;
  blobUrl: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
  processedPages: number;
  totalPages: number | null;
  uploadedAt: string;
  updatedAt: string;
}

// Create the table if it doesn't exist
export async function initializeDatabase(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS pdf_documents (
        doc_id VARCHAR(255) PRIMARY KEY,
        original_name VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        blob_url TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        error TEXT,
        processed_pages INTEGER DEFAULT 0,
        total_pages INTEGER,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Create an index on status for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pdf_documents_status ON pdf_documents(status);
    `;
    

  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// Insert a new PDF document
export async function createPdfDocument(data: {
  docId: string;
  originalName: string;
  fileSize: number;
  blobUrl: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO pdf_documents (doc_id, original_name, file_size, blob_url, status)
      VALUES (${data.docId}, ${data.originalName}, ${data.fileSize}, ${data.blobUrl}, 'processing')
    `;

  } catch (error) {
    console.error('❌ Failed to create PDF document:', error);
    throw error;
  }
}

// Get a PDF document by ID
export async function getPdfDocument(docId: string): Promise<PdfDocument | null> {
  try {
    const result = await sql`
      SELECT 
        doc_id as "docId",
        original_name as "originalName", 
        file_size as "fileSize",
        blob_url as "blobUrl",
        status,
        error,
        processed_pages as "processedPages",
        total_pages as "totalPages",
        uploaded_at as "uploadedAt",
        updated_at as "updatedAt"
      FROM pdf_documents 
      WHERE doc_id = ${docId}
    `;
    
    return result[0] as PdfDocument || null;
  } catch (error) {
    console.error('❌ Failed to get PDF document:', error);
    throw error;
  }
}

// Get all PDF documents, ordered by upload date (newest first)
export async function getAllPdfDocuments(): Promise<PdfDocument[]> {
  try {
    const result = await sql`
      SELECT 
        doc_id as "docId",
        original_name as "originalName", 
        file_size as "fileSize",
        blob_url as "blobUrl",
        status,
        error,
        processed_pages as "processedPages",
        total_pages as "totalPages",
        uploaded_at as "uploadedAt",
        updated_at as "updatedAt"
      FROM pdf_documents 
      ORDER BY uploaded_at DESC
    `;
    
    return result as PdfDocument[];
  } catch (error) {
    console.error('❌ Failed to get all PDF documents:', error);
    throw error;
  }
}

// Update PDF document status
export async function updatePdfDocumentStatus(
  docId: string, 
  status: 'processing' | 'ready' | 'error',
  updates: {
    error?: string;
    processedPages?: number;
    totalPages?: number;
  } = {}
): Promise<void> {
  try {
    await sql`
      UPDATE pdf_documents 
      SET 
        status = ${status},
        error = ${updates.error || null},
        processed_pages = ${updates.processedPages || 0},
        total_pages = ${updates.totalPages || null},
        updated_at = NOW()
      WHERE doc_id = ${docId}
    `;

  } catch (error) {
    console.error('❌ Failed to update PDF document status:', error);
    throw error;
  }
}

// Delete a PDF document
export async function deletePdfDocument(docId: string): Promise<boolean> {
  try {
    // First check if the document exists
    const existing = await sql`
      SELECT doc_id FROM pdf_documents WHERE doc_id = ${docId}
    `;
    
    if (existing.length === 0) {
      return false; // Document doesn't exist
    }
    
    // Delete the document
    await sql`
      DELETE FROM pdf_documents 
      WHERE doc_id = ${docId}
    `;
    

    return true;
  } catch (error) {
    console.error('❌ Failed to delete PDF document:', error);
    throw error;
  }
}

// Health check - test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
