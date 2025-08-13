import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
import { withRetry } from "./retry-utils";

export type EmbeddingResult = {
  vector: number[];
};

export async function embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
  const result = await withRetry(
    async () => embedMany({
      model: google.textEmbedding("text-embedding-004"), 
      values: texts,
    }),
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    }
  );
  
  return result.embeddings.map((vec: number[]) => ({ vector: vec }));
}


