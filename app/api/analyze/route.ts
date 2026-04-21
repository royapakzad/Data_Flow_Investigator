import { randomUUID } from "crypto";
import { isRedisConfigured, createJob, updateJob } from "@/lib/jobs";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { vendorName } = body;

  if (!vendorName || typeof vendorName !== "string") {
    return Response.json({ error: "vendorName required" }, { status: 400 });
  }

  // ── Mode A: Redis configured → background job, return ID for polling ────────
  if (isRedisConfigured) {
    const { waitUntil } = await import("@vercel/functions");
    const id = randomUUID();
    await createJob(id, vendorName);

    waitUntil(
      (async () => {
        await updateJob(id, { status: "running" });
        const progress: string[] = [];
        try {
          const report = await runAgent(vendorName, (msg) => { progress.push(msg); });
          await updateJob(id, { status: "done", report, progress });
        } catch (err) {
          await updateJob(id, {
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
            progress,
          });
        }
      })()
    );

    return Response.json({ id });
  }

  // ── Mode B: No Redis → run synchronously, return full result directly ───────
  // The client checks for `status` in the response and skips polling.
  const progress: string[] = [];
  try {
    const report = await runAgent(vendorName, (msg) => { progress.push(msg); });
    return Response.json({ status: "done", report, progress });
  } catch (err) {
    return Response.json(
      { status: "error", error: err instanceof Error ? err.message : "Unknown error", progress },
      { status: 500 }
    );
  }
}
