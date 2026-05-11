import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, type FunctionDeclaration } from "@google/generative-ai";
import { braveSearch } from "./brave-search";
import type { CompanyOwnership } from "./types";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseMs = 2000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1) await sleep(baseMs * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_web",
    description: "Search the web for information.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Search query" },
        count: { type: SchemaType.NUMBER, description: "Number of results (1-10, default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_page",
    description: "Fetch a web page and return its text content. Returns up to 6000 characters.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
];

const SYSTEM_PROMPT = `You are a corporate ownership researcher. Given a company name, trace its full ownership chain — from the company itself up through every acquirer to the ultimate parent, especially if that parent is a private equity or investment firm.

RESEARCH PLAN (10-16 tool calls):

1. Search "[company] parent company acquired by" — find who owns it
2. Search "[company] Wikipedia" — fetch the page for acquisition history
3. Search "[company] founded year founders" — founding context
4. For each acquirer found: search "[acquirer] acquires [company] [year]" — find the source article or press release, then fetch it
5. Search "[ultimate parent] private equity investment fund portfolio" — is it PE-owned?
6. If PE-owned: fetch the PE firm's portfolio/companies page — list every edtech or education company they own
7. If the PE firm has a Wikipedia page, fetch it too for portfolio completeness
8. Search "[company] acquisitions acquired companies subsidiaries" — what has this company itself bought?
9. For any company the vendor acquired: search "[company] acquires [subsidiary] [year]" — fetch the announcement URL

ANTI-HALLUCINATION RULES:
- acquisitionHistory: ONLY include events with a verified source URL you actually found. Empty array is correct when none verified.
- pePortfolioCompanies: ONLY include companies you found on the PE firm's actual portfolio page or in verified news. Empty array when not PE-owned or portfolio not found.
- vendorAcquisitions: ONLY include with a real source URL. Empty array when none found.
- isPEOwned: true ONLY if confirmed by a reliable source. Default false.
- currentParentUrl: must be a real URL found in research, not constructed.
- NEVER invent acquisition years, prices, acquirer names, or portfolio companies.

Output ONLY this JSON object — no markdown, no explanation:

{
  "currentParentCompany": string | null,
  "currentParentUrl": string | null,
  "currentParentDescription": string | null,
  "foundedYear": number | null,
  "founders": string[],
  "acquisitionHistory": [
    {
      "year": number,
      "acquirer": string,
      "acquired": string,
      "description": string,
      "sourceUrl": string,
      "sourceLabel": string
    }
  ],
  "ownershipNotes": string,
  "isPEOwned": boolean,
  "pePortfolioCompanies": [
    {
      "name": string,
      "url": string | null,
      "description": string | null
    }
  ],
  "vendorAcquisitions": [
    {
      "name": string,
      "url": string | null,
      "year": number | null,
      "description": string,
      "sourceUrl": string | null,
      "sourceLabel": string | null
    }
  ]
}`;

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    if (name === "search_web") {
      const results = await braveSearch(input.query as string, (input.count as number) ?? 5);
      return JSON.stringify(results, null, 2);
    }
    if (name === "fetch_page") {
      const res = await fetch(input.url as string, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; VendorAuditBot/1.0)" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return `Error: HTTP ${res.status}`;
      const html = await res.text();
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
    }
    return `Unknown tool: ${name}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (name === "search_web") return `Search unavailable (${msg}). Continue with next step.`;
    if (name === "fetch_page") return `Page could not be fetched (${msg}). Continue with next step.`;
    return `Tool unavailable (${msg}). Continue.`;
  }
}

export async function runOwnershipAgent(
  companyName: string,
  onProgress: (msg: string) => void,
): Promise<CompanyOwnership> {
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    generationConfig: { maxOutputTokens: 8000 },
  });

  const chat = model.startChat();
  onProgress(`Researching ownership of "${companyName}"…`);

  let result = await withRetry(() =>
    chat.sendMessage(`Research the full ownership chain for: "${companyName}". Trace up to the ultimate parent (especially private equity). Find what this company has acquired. Output the JSON.`)
  );

  const MAX_ITERATIONS = 25;
  let stepCount = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls?.length) {
      onProgress("Building ownership graph…");
      const jsonStr = extractJSON(response.text());
      const ownership = JSON.parse(jsonStr) as CompanyOwnership;
      // Ensure required array fields exist
      ownership.acquisitionHistory = ownership.acquisitionHistory ?? [];
      ownership.pePortfolioCompanies = ownership.pePortfolioCompanies ?? [];
      ownership.vendorAcquisitions = ownership.vendorAcquisitions ?? [];
      ownership.founders = ownership.founders ?? [];
      ownership.isPEOwned = ownership.isPEOwned ?? false;
      return ownership;
    }

    const toolResponses: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];
    for (const call of functionCalls) {
      stepCount++;
      const args = call.args as Record<string, unknown>;
      const msg = call.name === "search_web"
        ? `[${stepCount}] Searching: "${args.query}"`
        : `[${stepCount}] Fetching: ${args.url}`;
      onProgress(msg);
      const output = await executeTool(call.name, call.args as Record<string, unknown>);
      toolResponses.push({ functionResponse: { name: call.name, response: { result: output } } });
    }
    result = await withRetry(() => chat.sendMessage(toolResponses));
  }

  throw new Error("Ownership agent exceeded maximum iterations");
}
