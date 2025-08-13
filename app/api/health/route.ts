import { testVectorStoreConnection } from "@/lib/vector";
import { testDatabaseConnection } from "@/lib/database";
import { testBlobStorageConnection } from "@/lib/blob-storage";

export const runtime = "nodejs";

const builtAt = new Date().toISOString();

export async function GET() {
  const [vectorStatus, dbStatus, blobStatus] = await Promise.all([
    testVectorStoreConnection(),
    testDatabaseConnection(),
    testBlobStorageConnection(),
  ]);
  
  return Response.json({
    ok: true,
    builtAt,
    llamaKeyLoaded: Boolean(process.env.LLAMA_CLOUD_API_KEY),
    databaseConnected: dbStatus,
    blobStorageConnected: blobStatus,
    pineconeConnected: vectorStatus.pinecone,
    vectorStore: "pinecone",
    storage: "neondb + vercel-blob",
    productionReady: dbStatus && blobStatus && vectorStatus.pinecone,
  });
}


