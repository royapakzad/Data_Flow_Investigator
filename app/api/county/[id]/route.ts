import { getCountyJob } from "@/lib/county-jobs";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = await getCountyJob(params.id);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json(job);
}
