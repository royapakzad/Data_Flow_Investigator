import { runOwnershipAgent } from "@/lib/ownership-agent";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { companyName } = body;

  if (!companyName || typeof companyName !== "string") {
    return Response.json({ error: "companyName required" }, { status: 400 });
  }

  const progress: string[] = [];
  try {
    const ownership = await runOwnershipAgent(companyName.trim(), (msg) => { progress.push(msg); });
    return Response.json({ status: "done", companyName: companyName.trim(), ownership, progress });
  } catch (err) {
    return Response.json(
      { status: "error", error: err instanceof Error ? err.message : "Unknown error", progress },
      { status: 500 }
    );
  }
}
