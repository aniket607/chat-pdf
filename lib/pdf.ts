import { parseWithLlamaParse } from "@/lib/llamaparse";

export type ParsedPage = {
  pageNumber: number;
  text: string;
};

export async function parsePdfToPages(pdfBuffer: Buffer): Promise<ParsedPage[]> {
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    throw new Error("LLAMA_CLOUD_API_KEY not set; LlamaParse is required");
  }
  const pages = await parseWithLlamaParse(pdfBuffer);
  return pages.map((p) => ({ pageNumber: p.pageNumber, text: (p.text || "").replace(/\s+/g, " ").trim() }));
}


