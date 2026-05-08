import { getSharedReport } from "@/lib/share-store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const shared = await getSharedReport(params.id);
  if (!shared) return Response.json({ error: "Report not found or expired" }, { status: 404 });
  return Response.json(shared);
}
