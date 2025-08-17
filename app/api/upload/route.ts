import { saveUploadedPdf, parseAndIndex } from "@/lib/ingest";

// POST /api/upload
// Accepts multipart/form-data with field name `file` (application/pdf)
// Returns: { docId }
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const fileLike = file as unknown as { type?: string };
    if (fileLike.type !== "application/pdf") {
      return Response.json({ error: "Invalid file type. Only application/pdf is allowed." }, { status: 400 });
    }

    let docId: string;
    let blobUrl: string;
    try {
      const saved = await saveUploadedPdf(file as File);
      docId = saved.docId;
      blobUrl = saved.blobUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error while saving file";
      return Response.json({ error: "SAVE_FAILED", message: msg }, { status: 500 });
    }

    parseAndIndex(docId, blobUrl).catch((e) => {
      console.error("parseAndIndex error", e);
    });

    return Response.json({ docId }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("/api/upload error", err);
    return Response.json({ error: "UNHANDLED", message }, { status: 500 });
  }
}


