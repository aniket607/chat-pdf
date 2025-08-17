import { randomUUID } from "crypto";
import { setProcessing, setReady, setError } from "@/lib/status-db";
import { createPdfDocument, initializeDatabase } from "@/lib/database";
import { uploadPdfToBlob } from "@/lib/blob-storage";
import { parsePdfToPages } from "@/lib/pdf";
import { chunkPagesToRag } from "@/lib/chunk";
import { embedBatch } from "@/lib/embeddings";
import { upsertVectors } from "@/lib/vector";

export type IngestResult = {
  docId: string;
  totalPages: number;
};

export async function saveUploadedPdf(file: File): Promise<{ docId: string; blobUrl: string }> {
  await initializeDatabase();
  
  const docId = randomUUID();
  
  const blobUrl = await uploadPdfToBlob(file, docId);
  
  await createPdfDocument({
    docId,
    originalName: file.name,
    fileSize: file.size,
    blobUrl,
  });

  return { docId, blobUrl };
}

export async function parseAndIndex(docId: string, blobUrl: string): Promise<IngestResult> {
  try {
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


