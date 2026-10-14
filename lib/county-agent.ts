import type Anthropic from "@anthropic-ai/sdk";
import { runToolLoop, runSearches, selectPagesToFetch, readPages, assertKeys } from "./claude-agent";
import { extractPage } from "./extract";
import { tavilySearch } from "./tavily-search";
import type { CountyReport } from "./types";

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
    description: "Search the web for information. Use targeted, specific queries.",
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
    description: "Fetch a web page and return its text content. Returns the page text.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
];

const SYSTEM_PROMPT = `You are a public education data systems researcher helping communities understand what data integration infrastructure their schools operate within.

Given a county name and US state, research the public education data integration systems serving that county — from early childhood through K-12 — and the cross-sector connections beyond education.

This is the "Administrative layer" of student data: the district student information system (SIS), the state longitudinal data system (SLDS / P-20W), early childhood data (ECIDS, Kindergarten Entry Assessment), and the agreements that link education records to other agencies. Districts submit defined records (enrollment, attendance, demographics, program participation such as free lunch, English learner and special education status, assessments) to the state on fixed dates; the state links them across years and sometimes to workforce, health/Medicaid, child welfare/foster care, juvenile justice, migrant education (MSIX), and military recruitment (ESEA recruiter-access provisions). Follow the money as well as the data: which private vendors built or run these systems, what states pay (e.g. per-child KEA licenses), and whether payment includes access to children's data for research. Your readers are parents, teachers, advocates, journalists, and school board members.

IMPORTANT CONTEXT:
Education data integration systems in the US are primarily operated at the STATE level, not county level. County schools participate in state-mandated systems. Research the state's systems and note that they apply to all counties in the state. If the county corresponds to a large urban district (e.g., Los Angeles County → Los Angeles USD, Cook County IL → Chicago Public Schools, New York City → NYC DOE), also research district-specific implementations.

HOW THIS RUN WORKS:
The research plan below has already been run for you: the user message contains the results of every planned search and the full text of the most relevant pages. Treat the plan as a checklist. Work from that evidence first; use search_web / fetch_page only to fill important gaps (e.g. finding a vendor contract or a state privacy statute that wasn't covered). When you need more than one lookup, request them all in the same turn so they run in parallel. Keep follow-ups to a few turns, then write the report.

RESEARCH PLAN:

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
18. Search "STATE military families education data" and military recruiter access to student directory information
18b. Search "STATE foster care child welfare education data sharing"
18c. Search "STATE student data immigration enforcement policy" (2025: DHS rescinded sensitive-locations protections for schools; note any state or district response)
18d. Search "STATE education research data center student data research access"
19. Fetch any relevant state data governance or cross-agency data sharing pages

PART 5 — FEDERAL CONNECTIONS:
20. Search "STATE EdFacts reporting" and federal education data collection
21. Note NAEP (National Assessment of Educational Progress) participation
22. Search "STATE Head Start federal reporting"

PART 6 — VENDORS & CONTRACTS:
23. Search "STATE [system name] vendor contract awarded"
24. Search state procurement database for education data contracts if available
25. Look for vendors: Tyler Technologies, Infinite Campus, PowerSchool, eScholar, Oracle, Pearson, DXC Technology, Deloitte, Accenture, Teaching Strategies (GOLD), Ed-Fi based implementations
25b. Search "STATE Teaching Strategies GOLD statewide contract per child" and note any price and data-use terms

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
      "sector": "workforce-LER" | "health" | "child-welfare" | "justice" | "military" | "migration" | "other",
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

For keyFindings: 4-6 specific, substantive findings about what data is collected, shared, with whom, and which companies are paid to run it. Plain language a parent could follow.
For questionsToAsk: 5-8 specific questions for a school board member, parent advocate, or journalist based on actual gaps (e.g. which agencies can link to children's records, how immigration-enforcement or law-enforcement requests are handled, what vendors may do with the data, how long records are kept).
For citations: 8-20 entries — all major findings must cite a source URL you actually visited.

TOOL FAILURE HANDLING — critical:
- If search_web returns "Search temporarily unavailable", immediately move to the next research step. Never stop researching because one search failed.
- If fetch_page returns "Page could not be fetched", try a different URL or skip and continue.
- Tool failures are common. Always output the complete JSON at the end regardless of how many tools failed.
- After a tool failure, continue with the very next numbered step in the research plan.

Output ONLY the JSON object. No markdown fences, no explanation.`;

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    if (name === "search_web") {
      const results = await tavilySearch(
        input.query as string,
        (input.count as number) ?? 5
      );
      return JSON.stringify(results, null, 2);
    }

    if (name === "fetch_page") {
      const page = await extractPage(input.url as string, 20000);
      if (page.error) return `Page could not be fetched (${page.error}). Try a different URL.`;
      return page.text!;
    }

    return `Unknown tool: ${name}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (name === "search_web") {
      return `Search temporarily unavailable (${msg}). Skip this search and continue with the next research step.`;
    }
    if (name === "fetch_page") {
      return `Page could not be fetched (${msg}). Skip this URL and continue with other research steps.`;
    }
    return `Tool unavailable (${msg}). Continue with remaining research steps.`;
  }
}

function countyQueries(st: string, stateAbbr: string): string[] {
  return [
    `${st} statewide longitudinal data system SLDS`,
    `${st} P-20W education data system`,
    `site:nces.ed.gov ${st} SLDS`,
    `${st} department of education longitudinal data vendor contract`,
    `${st} SLDS vendor`,
    `${st} early childhood integrated data system ECIDS`,
    `${st} preschool data system Head Start data`,
    `Data Quality Campaign ${st} state profile`,
    `${st} kindergarten entry assessment KEA policy`,
    `${st} kindergarten readiness assessment instrument`,
    `${st} education workforce data linkage learning employment record`,
    `${st} education health data linkage Medicaid`,
    `${st} juvenile justice education data sharing`,
    `${st} migrant education data MSIX`,
    `${st} military families education data`,
    `${st} foster care child welfare education data sharing`,
    `${st} student data immigration enforcement policy schools`,
    `${st} education research data center student data access`,
    `${st} Teaching Strategies GOLD statewide contract per child`,
    `${st} Ed-Fi data standard state reporting`,
    `${st} EdFacts reporting federal education data`,
    `${st} Head Start federal reporting`,
    `${st} education data system vendor contract awarded`,
    `${st} ${stateAbbr} education data Tyler Technologies Infinite Campus PowerSchool eScholar`,
    `${st} student data privacy law`,
    `${st} education data governance policy`,
  ];
}

export async function runCountyAgent(
  countyName: string,
  stateName: string,
  stateAbbr: string,
  fipsCode: string,
  onProgress: (msg: string) => void
): Promise<CountyReport> {
  const task =
    `Investigate the public education data integration systems serving ${countyName} County, ${stateName} (${stateAbbr}), FIPS code ${fipsCode}. ` +
    `Research the state's SLDS/P-20W system, ECIDS, Kindergarten Entry Assessment policy, cross-sector data linkages (workforce/LER, health, justice, military, migration), ` +
    `and applicable data safeguards. Find and verify the vendors and technology companies that built or operate these systems.`;

  assertKeys();
  onProgress(`Starting investigation of ${countyName} County, ${stateName}…`);

  // Step 1 — run every planned search in parallel
  const searches = await runSearches(
    [...countyQueries(stateName, stateAbbr), `${countyName} County ${stateName} school district student data system`],
    onProgress,
  );

  // Step 2 — Claude picks the pages worth reading; fetch them in parallel (NCES state page always included)
  onProgress("Choosing which pages to read…");
  const picked = await selectPagesToFetch(task, searches, 14);
  const urls = Array.from(new Set(["https://nces.ed.gov/programs/slds/stateInfo.asp", ...picked]));
  const pages = await readPages(urls, 20000, onProgress);

  // Step 3 — Claude writes the report, with a few turns of follow-up lookups if needed
  onProgress("Analyzing evidence…");
  const text = await runToolLoop({
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    userMessage: `${task} Use the evidence below, fill important gaps with tools if needed, then output the full JSON report.\n\nEVIDENCE:\n${JSON.stringify({ searches, fetchedPages: pages })}`,
    maxIterations: 6,
    effort: "medium",
    executeTool,
    describeCall: (step, toolName, toolInput) =>
      toolName === "search_web" ? `[follow-up ${step}] Searching: "${toolInput.query}"` :
      toolName === "fetch_page" ? `[follow-up ${step}] Fetching: ${toolInput.url}` :
      `[follow-up ${step}] Running ${toolName}`,
    onProgress,
  });

  onProgress("Compiling final report…");
  const report = JSON.parse(extractJSON(text)) as CountyReport;
  report.analysisDate = new Date().toISOString();
  return report;
}
