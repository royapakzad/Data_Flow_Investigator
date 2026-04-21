import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, type FunctionDeclaration } from "@google/generative-ai";
import { braveSearch } from "./brave-search";
import type { CountyReport } from "./types";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseMs = 3000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
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
    description: "Search the web for information. Use targeted, specific queries.",
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
    description: "Fetch a web page and return its text content. Returns up to 10000 characters.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
];

const SYSTEM_PROMPT = `You are a public education data systems researcher helping communities understand what data integration infrastructure their schools operate within.

Given a county name and US state, research the public education data integration systems serving that county — from early childhood through K-12 — and the cross-sector connections beyond education.

IMPORTANT CONTEXT:
Education data integration systems in the US are primarily operated at the STATE level, not county level. County schools participate in state-mandated systems. Research the state's systems and note that they apply to all counties in the state. If the county corresponds to a large urban district (e.g., Los Angeles County → Los Angeles USD, Cook County IL → Chicago Public Schools, New York City → NYC DOE), also research district-specific implementations.

RESEARCH PLAN (20-30 tool calls):

PART 1 — STATE LONGITUDINAL DATA SYSTEM (SLDS / P-20W):
1. Search "STATE statewide longitudinal data system SLDS"
2. Search "STATE P-20W education data system"
3. Fetch the NCES SLDS state info page: https://nces.ed.gov/programs/slds/stateInfo.asp
4. Search "site:nces.ed.gov STATE SLDS" for NCES survey data
5. Search "STATE department of education longitudinal data vendor contract"
6. Search "STATE SLDS vendor [year]" to find the technology vendor
7. Fetch the state DOE's data page if found

PART 2 — EARLY CHILDHOOD INTEGRATED DATA SYSTEM (ECIDS):
8. Search "STATE early childhood integrated data system ECIDS"
9. Search "STATE preschool data system" and "STATE Head Start data"
10. Check Data Quality Campaign state profile if available

PART 3 — KINDERGARTEN ENTRY ASSESSMENT (KEA):
11. Search "STATE kindergarten entry assessment KEA policy"
12. Search "STATE kindergarten readiness assessment instrument" (TS GOLD, BRIGANCE, CLASS, ASQ, DIAL, Devereux, WaKIDS, etc.)
13. Fetch the state DOE's early childhood or kindergarten assessment page if found

PART 4 — CROSS-SECTOR LINKAGES:
14. Search "STATE education workforce data linkage" and "STATE learning employment record LER"
15. Search "STATE education health data linkage" or "STATE Medicaid education data"
16. Search "STATE juvenile justice education data sharing"
17. Search "STATE migrant education data MSIX"
18. Search "STATE military families education data"
19. Fetch any relevant state data governance or cross-agency data sharing pages

PART 5 — FEDERAL CONNECTIONS:
20. Search "STATE EdFacts reporting" and federal education data collection
21. Note NAEP (National Assessment of Educational Progress) participation
22. Search "STATE Head Start federal reporting"

PART 6 — VENDORS & CONTRACTS:
23. Search "STATE [system name] vendor contract awarded"
24. Search state procurement database for education data contracts if available
25. Look for vendors: Tyler Technologies, Infinite Campus, PowerSchool, eScholar, Oracle, Pearson, DXC Technology, Deloitte, Accenture

PART 7 — SAFEGUARDS:
26. Search "STATE student data privacy law" (find the law name, year, statute number)
27. Note federal protections: FERPA, COPPA, PPRA, Every Student Succeeds Act (ESSA)
28. Search "STATE education data governance policy"
29. Identify any GAPS where protections are absent or weak

AUTHORITATIVE SOURCES TO PRIORITIZE:
- ed.gov, nces.ed.gov (federal)
- State .gov DOE websites
- dataqualitycampaign.org (has state-by-state SLDS data)
- studentprivacy.ed.gov (FERPA info)
- dol.gov (workforce LER)
- buildinitiative.org (ECIDS)
- Government procurement/contract databases
- Official state legislative pages for privacy laws

After gathering data, output a JSON object matching this schema EXACTLY:

{
  "countyName": string,
  "stateName": string,
  "stateAbbr": string,
  "fipsCode": string,
  "analysisDate": "ISO date string",
  "dataAvailabilityNote": string,

  "educationSystems": [
    {
      "name": string,
      "type": "SLDS" | "ECIDS" | "KEA" | "SIS" | "federal" | "cross-sector" | "other",
      "scope": "county-district" | "state" | "federal",
      "description": string,
      "status": "active" | "planned" | "discontinued" | "unknown",
      "dataElements": string[],
      "vendors": [
        {
          "name": string,
          "role": string,
          "website": string | null,
          "contractType": "awarded" | "in-house" | "partnership" | "unknown",
          "notes": string | null
        }
      ],
      "url": string | null,
      "citationNumbers": number[],
      "source": "declared" | "inferred"
    }
  ],

  "crossSectorLinkages": [
    {
      "sector": "workforce-LER" | "health" | "justice" | "military" | "migration" | "other",
      "sectorLabel": string,
      "systemName": string,
      "description": string,
      "dataShared": string[],
      "legalBasis": string | null,
      "safeguards": string[],
      "vendors": [...same vendor schema...],
      "url": string | null,
      "citationNumbers": number[]
    }
  ],

  "safeguards": [
    {
      "category": "federal-law" | "state-law" | "policy" | "technical" | "gap",
      "name": string,
      "description": string,
      "url": string | null,
      "scope": "federal" | "state" | "county-district",
      "citationNumbers": number[]
    }
  ],

  "keyFindings": string[],
  "questionsToAsk": string[],

  "citations": [
    {
      "number": number,
      "label": string,
      "url": string,
      "context": string
    }
  ],

  "rawNotes": string
}

ANTI-HALLUCINATION RULES — strictly enforced:
- Only include vendors you found verified in a real URL (news article, government contract, official announcement). If a vendor is rumored but unverified, omit it.
- Every citation URL must be a URL you actually retrieved or found in search results during this session.
- For dataElements, only list data types explicitly mentioned in sources you found. Do not infer what "probably" is collected.
- For crossSectorLinkages: only include linkages you found evidence for. Use source: "inferred" if the linkage is known to exist in the state generally but you found no specific URL.
- For safeguards: ALWAYS include relevant gaps as category "gap" when protections are known to be absent. Gaps are as important as protections.
- If a system exists in the state but you found no vendor information, set vendors to [].
- dataAvailabilityNote must honestly explain what is and isn't known at the county vs state level.

For keyFindings: 4-6 specific, substantive findings about what data is collected, shared, and with whom.
For questionsToAsk: 5-8 specific questions for a school board member, parent advocate, or journalist based on actual gaps.
For citations: 8-20 entries — all major findings must cite a source URL you actually visited.

Output ONLY the JSON object. No markdown fences, no explanation.`;

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    if (name === "search_web") {
      const results = await braveSearch(
        input.query as string,
        (input.count as number) ?? 5
      );
      return JSON.stringify(results, null, 2);
    }

    if (name === "fetch_page") {
      const res = await fetch(input.url as string, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EduDataResearchBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return `Error: HTTP ${res.status}`;
      const text = await res.text();
      const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return cleaned.slice(0, 10000);
    }

    return `Unknown tool: ${name}`;
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function runCountyAgent(
  countyName: string,
  stateName: string,
  stateAbbr: string,
  fipsCode: string,
  onProgress: (msg: string) => void
): Promise<CountyReport> {
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    generationConfig: { maxOutputTokens: 20000 },
  });

  const chat = model.startChat();
  onProgress(`Starting investigation of ${countyName} County, ${stateName}…`);

  let result = await withRetry(() =>
    chat.sendMessage(
      `Investigate the public education data integration systems serving ${countyName} County, ${stateName} (${stateAbbr}), FIPS code ${fipsCode}. ` +
      `Research the state's SLDS/P-20W system, ECIDS, Kindergarten Entry Assessment policy, cross-sector data linkages (workforce/LER, health, justice, military, migration), ` +
      `and applicable data safeguards. Find and verify the vendors and technology companies that built or operate these systems. ` +
      `Output the full JSON report.`
    )
  );

  const MAX_ITERATIONS = 35;
  let stepCount = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls?.length) {
      onProgress("Compiling final report…");
      const jsonStr = extractJSON(response.text());
      const report = JSON.parse(jsonStr) as CountyReport;
      report.analysisDate = new Date().toISOString();
      return report;
    }

    const toolResponses: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];
    for (const call of functionCalls) {
      stepCount++;
      const toolName = call.name;
      const toolInput = call.args as Record<string, unknown>;
      const progressMsg =
        toolName === "search_web" ? `[${stepCount}] Searching: "${toolInput.query}"` :
        toolName === "fetch_page" ? `[${stepCount}] Fetching: ${toolInput.url}` :
        `[${stepCount}] Running ${toolName}`;
      onProgress(progressMsg);
      const output = await executeTool(toolName, toolInput);
      toolResponses.push({ functionResponse: { name: toolName, response: { result: output } } });
    }
    result = await withRetry(() => chat.sendMessage(toolResponses));
  }

  throw new Error("Agent exceeded maximum iterations");
}
