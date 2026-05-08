import { randomUUID } from "crypto";
import { saveSharedReport } from "@/lib/share-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { type, report } = body;

  if (!type || !report || !["vendor", "county"].includes(type)) {
    return Response.json({ error: "type ('vendor'|'county') and report required" }, { status: 400 });
  }

  const id = randomUUID();
  await saveSharedReport(id, { id, type, report, createdAt: Date.now() });
  return Response.json({ id });
}
