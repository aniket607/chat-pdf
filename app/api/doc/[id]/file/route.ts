import { getPdfDocument } from "@/lib/database";

export const runtime = "nodejs";

// GET /api/doc/:id/file
// Returns: Redirect to blob URL or PDF file content
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  
  try {
    const doc = await getPdfDocument(id);
    
    if (!doc) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // Redirect to the blob URL for direct PDF access
    return Response.redirect(doc.blobUrl, 302);
  } catch (error) {
    console.error("Error retrieving document:", error);
    return Response.json({ error: "Failed to retrieve document" }, { status: 500 });
  }
}


