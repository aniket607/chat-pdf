import { LlamaParseReader } from "llama-cloud-services";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export type LlamaParsedPage = {
  pageNumber: number;
  text: string;
};

export async function parseWithLlamaParse(pdfBuffer: Buffer): Promise<LlamaParsedPage[]> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_CLOUD_API_KEY not set");
  }

  // Create a temporary file for LlamaParse
  const tempFileName = `temp-${randomUUID()}.pdf`;
  const tempFilePath = join("/tmp", tempFileName);

  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, pdfBuffer);
    //create new reader instance
    const reader = new LlamaParseReader({ apiKey, resultType: "markdown" });
    const docs = await reader.loadData(tempFilePath);
    if (Array.isArray(docs) && docs.length > 0) {
      const candidates = docs.map((d, i) => {
        const text = String((d as { text?: unknown }).text ?? "");
        const md = (d as { metadata?: Record<string, unknown> }).metadata || {};
        const pageFromMeta = ["page", "page_number", "page_num"]
          .map((k) => (md as Record<string, unknown>)[k])
          .find((v) => typeof v === "number");
        const pageNumber = (pageFromMeta as number | undefined) ?? i + 1;
        return { pageNumber, text } as LlamaParsedPage;
      });

      if (candidates.length === 1) {
        // Heuristic: split markdown by "# Page N" sections if present
        const single = candidates[0].text;
        const sections: LlamaParsedPage[] = [];
        const pattern = /\n+#{1,6}\s*Page\s+(\d+)\b([\s\S]*?)(?=\n+#{1,6}\s*Page\s+\d+\b|$)/gi;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(single))) {
          const page = Number(match[1]);
          const body = String(match[2] ?? "").trim();
          if (body) sections.push({ pageNumber: page, text: body });
        }
        if (sections.length > 0) return sections;

        // Fallback: chunk into approximate pages by character length
        const approxSize = 2500;
        const normalized = single.replace(/\s+/g, " ").trim();
        if (normalized.length > approxSize) {
          const pages: LlamaParsedPage[] = [];
          for (let i = 0; i < normalized.length; i += approxSize) {
            pages.push({ pageNumber: pages.length + 1, text: normalized.slice(i, i + approxSize) });
          }
          return pages;
        }
      }

      return candidates;
    }
  } catch (error) {
    console.error("LlamaParse error:", error);
  } finally {
    // Clean up temporary file
    try {
      await unlink(tempFilePath);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp file:", cleanupError);
    }
  }
  throw new Error("LlamaParse SDK did not return content");
}


