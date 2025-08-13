import { randomUUID } from "crypto";
import { setProcessing, setReady, setError } from "@/lib/status-db";
import { createPdfDocument, initializeDatabase } from "@/lib/database";
import { uploadPdfToBlob } from "@/lib/blob-storage";
import { parsePdfToPages } from "@/lib/pdf";
import { chunkPagesToRag } from "@/lib/chunk";
import { embedBatch } from "@/lib/embeddings";
import { upsertVectors } from "@/lib/vector";

// NOTE: This is a minimal ingestion stub to keep compile-time happy.
// We'll replace the parsing, chunking, and embedding with real logic in Phase 1.

export type IngestResult = {
  docId: string;
  totalPages: number;
};

export async function saveUploadedPdf(file: File): Promise<{ docId: string; blobUrl: string }> {
  // Initialize database (creates table if needed)
  await initializeDatabase();
  
  // Generate a new document id
  const docId = randomUUID();
  
  // Upload PDF to Vercel Blob storage
  const blobUrl = await uploadPdfToBlob(file, docId);
  
  // Create database record
  await createPdfDocument({
    docId,
    originalName: file.name,
    fileSize: file.size,
    blobUrl,
  });

  // Set initial processing status
  await setProcessing(docId, 0, null, {
    originalName: file.name,
    uploadedAt: new Date().toISOString()
  });

  return { docId, blobUrl };
}

export async function parseAndIndex(docId: string, blobUrl: string): Promise<IngestResult> {
  try {
    // Mark processing start
    await setProcessing(docId, 0, null);

    // Download PDF from blob storage for processing
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF from blob storage: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Parse PDF from buffer
    const pages = await parsePdfToPages(Buffer.from(arrayBuffer));
    const totalPages = pages.length;

    // Update progress
    await setProcessing(docId, 0, totalPages);

    // Chunk the pages
    const chunks = chunkPagesToRag(docId, pages);

    // Generate embeddings
    const embeddings = await embedBatch(chunks.map((c) => c.text));

    // Upsert to vector store (Pinecone)
    await upsertVectors(
      chunks.map((c, i) => ({
        id: c.id,
        docId: c.docId,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        chunkIndex: c.chunkIndex,
        text: c.text,
        vector: embeddings[i].vector,
      })),
    );

    // Mark as ready
    await setReady(docId, totalPages, totalPages);
    return { docId, totalPages };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during ingestion";
    await setError(docId, message, 0, null);
    throw err;
  }
}


