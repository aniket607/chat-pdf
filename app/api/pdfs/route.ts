
import { getAllPdfDocuments } from "@/lib/database";

// GET /api/pdfs - List all uploaded PDFs with their status
export async function GET() {
  try {
    const documents = await getAllPdfDocuments();
    
    const pdfs = documents.map(doc => ({
      docId: doc.docId,
      fileName: doc.originalName,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      progress: { 
        processedPages: doc.processedPages, 
        totalPages: doc.totalPages 
      },
    }));

    return Response.json({ pdfs });
  } catch (error) {
    console.error('Error listing PDFs:', error);
    return Response.json(
      { error: 'Failed to list PDFs' },
      { status: 500 }
    );
  }
}
