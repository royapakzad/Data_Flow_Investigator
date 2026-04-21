import { randomUUID } from "crypto";
import { waitUntil } from "@vercel/functions";
import { createJob, updateJob } from "@/lib/jobs";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { vendorName } = await req.json();

  if (!vendorName || typeof vendorName !== "string") {
    return Response.json({ error: "vendorName required" }, { status: 400 });
  }

  const id = randomUUID();
  await createJob(id, vendorName);

  waitUntil(
    (async () => {
      await updateJob(id, { status: "running" });
      const progress: string[] = [];
      try {
        const report = await runAgent(vendorName, (message) => {
          progress.push(message);
        });
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
