import { randomUUID } from "crypto";
import { createJob, getJob, updateJob } from "@/lib/jobs";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { vendorName } = await req.json();

  if (!vendorName || typeof vendorName !== "string") {
    return Response.json({ error: "vendorName required" }, { status: 400 });
  }

  const id = randomUUID();
  createJob(id, vendorName);

  // Run agent in background — client polls /api/analyze/[id] for status
  (async () => {
    updateJob(id, { status: "running" });
    try {
      const report = await runAgent(vendorName, (message) => {
        const current = getJob(id);
        if (current) updateJob(id, { progress: [...current.progress, message] });
      });
      updateJob(id, { status: "done", report });
    } catch (err) {
      updateJob(id, {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  })();

  return Response.json({ id });
}
