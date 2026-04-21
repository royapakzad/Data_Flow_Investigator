import { randomUUID } from "crypto";
import { isRedisConfigured, createCountyJob, updateCountyJob } from "@/lib/county-jobs";
import { runCountyAgent } from "@/lib/county-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { countyName, stateName, stateAbbr, fipsCode } = body;

  if (!countyName || !stateName) {
    return Response.json({ error: "countyName and stateName required" }, { status: 400 });
  }

  if (isRedisConfigured) {
    const { waitUntil } = await import("@vercel/functions");
    const id = randomUUID();
    await createCountyJob(id, countyName, stateName);

    waitUntil(
      (async () => {
        await updateCountyJob(id, { status: "running" });
        const progress: string[] = [];
        try {
          const report = await runCountyAgent(countyName, stateName, stateAbbr ?? "", fipsCode ?? "", (msg) => {
            progress.push(msg);
          });
          await updateCountyJob(id, { status: "done", report, progress });
        } catch (err) {
          await updateCountyJob(id, {
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
            progress,
          });
        }
      })()
    );

    return Response.json({ id });
  }

  const progress: string[] = [];
  try {
    const report = await runCountyAgent(countyName, stateName, stateAbbr ?? "", fipsCode ?? "", (msg) => {
      progress.push(msg);
    });
    return Response.json({ status: "done", report, progress });
  } catch (err) {
    return Response.json(
      { status: "error", error: err instanceof Error ? err.message : "Unknown error", progress },
      { status: 500 }
    );
  }
}
