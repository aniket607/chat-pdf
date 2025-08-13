import { getStatus } from "@/lib/status-db";

export const runtime = "nodejs";

// GET /api/doc/:docId/status
// Returns: { status, progress?, error? }
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getStatus(id);
  return Response.json(s, { status: 200 });
}


