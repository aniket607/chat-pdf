import { Pinecone } from "@pinecone-database/pinecone";
import type { VectorRecord } from "./vector";

// Initialize Pinecone client
let pinecone: Pinecone | null = null;
let indexName: string | null = null;

function initializePinecone() {
  if (pinecone) return pinecone;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY environment variable is required");
  }

  indexName = process.env.PINECONE_INDEX || null;
  if (!indexName) {
    throw new Error("PINECONE_INDEX environment variable is required");
  }

  pinecone = new Pinecone({ apiKey });
  return pinecone;
}

async function getIndex() {
  const pc = initializePinecone();
  if (!indexName) {
    throw new Error("Pinecone index name not configured");
  }
  return pc.index(indexName);
}

export async function upsertVectorsToPinecone(records: VectorRecord[]): Promise<void> {
  try {
    const index = await getIndex();
    
    // Convert our VectorRecord format to Pinecone format
    const vectors = records.map(record => ({
      id: record.id,
      values: record.vector,
      metadata: {
        docId: record.docId,
        pageStart: record.pageStart,
        pageEnd: record.pageEnd,
        chunkIndex: record.chunkIndex,
        text: record.text,
      },
    }));

    // Upsert vectors in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      

    }


  } catch (error) {
    console.error("Error upserting vectors to Pinecone:", error);
    throw error;
  }
}

export async function queryPineconeTopK(
  docId: string,
  queryVector: number[],
  topK: number = 8
): Promise<VectorRecord[]> {
  try {
    const index = await getIndex();
    
    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: {
        docId: { $eq: docId }
      }
    });

    // Convert Pinecone response back to our VectorRecord format
    const results: VectorRecord[] = [];
    
    for (const match of queryResponse.matches || []) {
      
      if (match.metadata && match.score && match.score > 0.3) { 
        results.push({
          id: match.id,
          docId: match.metadata.docId as string,
          pageStart: match.metadata.pageStart as number,
          pageEnd: match.metadata.pageEnd as number,
          chunkIndex: match.metadata.chunkIndex as number,
          text: match.metadata.text as string,
          vector: [], 
        });
      }
    }


    return results;
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw error;
  }
}

export async function clearVectorsByDocIdFromPinecone(docId: string): Promise<void> {
  try {
    const index = await getIndex();
    
    // First, query to get all vector IDs for this document
    const queryResponse = await index.query({
      vector: new Array(768).fill(0), 
      topK: 10000, 
      includeMetadata: false,
      includeValues: false,
      filter: {
        docId: { $eq: docId }
      }
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const idsToDelete = queryResponse.matches.map(match => match.id);
      
      // Delete vectors in batches
      const batchSize = 1000; // Pinecone delete batch limit
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        await index.deleteMany(batch);
      }
      
    } else {
    }
  } catch (error) {
    console.error("Error deleting vectors from Pinecone:", error);
    throw error;
  }
}

export async function testPineconeConnection(): Promise<boolean> {
  try {
    const pc = initializePinecone();
    const indexes = await pc.listIndexes();
    
    if (!indexName) {
      console.error("Pinecone index name not configured");
      return false;
    }
    
    const indexExists = indexes.indexes?.some(index => index.name === indexName);
    if (!indexExists) {
      console.error(`Pinecone index '${indexName}' not found`);
      return false;
    }
    

    return true;
  } catch (error) {
    console.error("Pinecone connection test failed:", error);
    return false;
  }
}
