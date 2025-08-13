import { google } from "@ai-sdk/google";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { embedBatch } from "@/lib/embeddings";
import { queryTopKByCosine } from "@/lib/vector";
import { withRetry } from "@/lib/retry-utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, docId }: { messages: UIMessage[]; docId?: string } = await req.json();
    if (!docId) return Response.json({ error: "Missing docId" }, { status: 400 });
    if (!Array.isArray(messages) || messages.length === 0) return Response.json({ error: "Missing messages" }, { status: 400 });

    // Extract last user text from UI messages
    const last = [...messages].reverse().find((m) => m.role === "user");
    const parts: Array<{ type: string; text?: string }> | undefined = (last as unknown as { parts?: Array<{ type: string; text?: string }> })?.parts;
    const lastText = Array.isArray(parts)
      ? parts.map((p) => (p && p.type === "text" ? String(p.text ?? "") : "")).join(" ").trim()
      : "";
    if (!lastText) return Response.json({ error: "Missing user text" }, { status: 400 });

    const [{ vector: queryVector }] = await embedBatch([lastText]);
    const records = await queryTopKByCosine(docId, queryVector, 8);
    const context = records.map((r) => `\n[p.${r.pageStart}]\n${r.text}`).join("\n\n");

    // Build a fresh conversation with system + user that includes context
    const uiMessages: UIMessage[] = [
      {
        id: "sys-ctx",
        role: "system",
        parts: [
          {
            type: "text",
            text:
              [
                "You are a document-grounded assistant for PDF Q&A.",
                "Rules:",
                "- Use ONLY the provided context. Do NOT rely on external knowledge.",
                "- Prefer exact matches; quote short snippets when helpful.",
                "- Append a page citation [p.N] to every claim, number, or quoted snippet.",
                "- If the exact information is NOT present, begin with: 'Note: The exact information is not present in the document.'",
                "  Then provide the closest relevant information you can find, clearly labeled as 'Closest match', with citations.",
                "- If nothing relevant is found, say: 'I don't know based on the provided document.'",
                "- Be concise and use bullet points when helpful.",
                "- Preserve names, dates, and numbers exactly as they appear in the document.",
                "- If multiple pages support the answer, group logically and cite all relevant pages.",
                "- Never fabricate content or citations.",
                "Output structure (guideline):",
                "- Brief answer (1–3 bullets) with citations.",
                "- Optional details section with additional cited bullets.",
              ].join("\n"),
          },
        ],
      },
      {
        id: "usr-q",
        role: "user",
        parts: [{ type: "text", text: `Context:\n${context}\n\nQuestion: ${lastText}` }],
      },
    ];

    // Use retry logic for Gemini API calls
    const result = await withRetry(
      async () => streamText({
        model: google("gemini-1.5-flash"),
        messages: convertToModelMessages(uiMessages),
      }),
      {
        maxAttempts: 4,
        initialDelayMs: 2000,
        maxDelayMs: 15000,
        backoffMultiplier: 2,
      }
    );

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return Response.json({ error: message }, { status: 500 });
  }
}


