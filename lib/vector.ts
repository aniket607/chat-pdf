import { 
  upsertVectorsToPinecone, 
  queryPineconeTopK, 
  clearVectorsByDocIdFromPinecone,
  testPineconeConnection 
} from "./pinecone";

export type VectorRecord = {
  id: string;
  docId: string;
  pageStart: number;
  pageEnd: number;
  chunkIndex: number;
  text: string;
  vector: number[];
};

export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error("Pinecone is required but not configured. Please set PINECONE_API_KEY and PINECONE_INDEX environment variables.");
  }

  try {
    await upsertVectorsToPinecone(records);

  } catch (error) {
    console.error("❌ Failed to upsert vectors to Pinecone:", error);
    throw new Error(`Vector storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function queryTopKByCosine(docId: string, queryVector: number[], topK = 8): Promise<VectorRecord[]> {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error("Pinecone is required but not configured. Please set PINECONE_API_KEY and PINECONE_INDEX environment variables.");
  }

  try {
    const results = await queryPineconeTopK(docId, queryVector, topK);

    return results;
  } catch (error) {
    console.error("❌ Failed to query Pinecone:", error);
    throw new Error(`Vector query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function clearVectorsByDocId(docId: string): Promise<void> {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error("Pinecone is required but not configured. Please set PINECONE_API_KEY and PINECONE_INDEX environment variables.");
  }

  try {
    await clearVectorsByDocIdFromPinecone(docId);

  } catch (error) {
    console.error("❌ Failed to clear vectors from Pinecone:", error);
    throw new Error(`Vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function testVectorStoreConnection(): Promise<{ pinecone: boolean }> {
  const pineconeStatus = await testPineconeConnection();
  return {
    pinecone: pineconeStatus,
  };
}


