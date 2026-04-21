import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { vendorName } = await req.json();

  if (!vendorName || typeof vendorName !== "string") {
    return Response.json({ error: "vendorName required" }, { status: 400 });
  }

  const progress: string[] = [];

  try {
    const report = await runAgent(vendorName, (message) => {
      progress.push(message);
    });
    return Response.json({ status: "done", report, progress });
  } catch (err) {
    return Response.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        progress,
      },
      { status: 500 }
    );
  }
}
