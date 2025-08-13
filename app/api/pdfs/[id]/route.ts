import { NextRequest } from "next/server";
import { getPdfDocument, deletePdfDocument } from "@/lib/database";
import { deletePdfFromBlob } from "@/lib/blob-storage";
import { clearVectorsByDocId } from "@/lib/vector";

// DELETE /api/pdfs/[id] - Delete a PDF and its associated data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    
    if (!docId) {
      return Response.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document info before deletion
    const doc = await getPdfDocument(docId);
    
    if (!doc) {
      return Response.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    try {
      // Delete from blob storage
      await deletePdfFromBlob(doc.blobUrl);
      
      // Delete from database
      await deletePdfDocument(docId);
      
      // Clear vector embeddings
      await clearVectorsByDocId(docId);
      
      return Response.json({ success: true });
    } catch (error) {
      console.error('Error during deletion process:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return Response.json(
      { error: 'Failed to delete PDF' },
      { status: 500 }
    );
  }
}
