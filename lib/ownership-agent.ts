import type Anthropic from "@anthropic-ai/sdk";
import { runToolLoop } from "./claude-agent";
import { tavilySearch } from "./tavily-search";
import type { CompanyOwnership } from "./types";

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_web",
    description: "Search the web for information.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        count: { type: "number", description: "Number of results (1-10, default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_page",
    description: "Fetch a web page and return its text content. Returns up to 6000 characters.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
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
      const results = await tavilySearch(input.query as string, (input.count as number) ?? 5);
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
  onProgress(`Researching ownership of "${companyName}"…`);

  const text = await runToolLoop({
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    userMessage: `Research the full ownership chain for: "${companyName}". Trace up to the ultimate parent (especially private equity). Find what this company has acquired. Output the JSON.`,
    maxIterations: 25,
    effort: "low",
    executeTool,
    describeCall: (step, name, args) =>
      name === "search_web" ? `[${step}] Searching: "${args.query}"` : `[${step}] Fetching: ${args.url}`,
    onProgress,
  });

  onProgress("Building ownership graph…");
  const ownership = JSON.parse(extractJSON(text)) as CompanyOwnership;
  // Ensure required array fields exist
  ownership.acquisitionHistory = ownership.acquisitionHistory ?? [];
  ownership.pePortfolioCompanies = ownership.pePortfolioCompanies ?? [];
  ownership.vendorAcquisitions = ownership.vendorAcquisitions ?? [];
  ownership.founders = ownership.founders ?? [];
  ownership.isPEOwned = ownership.isPEOwned ?? false;
  return ownership;
}
