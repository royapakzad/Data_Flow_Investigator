import type Anthropic from "@anthropic-ai/sdk";
import { runToolLoop, runSearches, selectPagesToFetch, readPages, assertKeys, type SearchQuery } from "./claude-agent";
import { extractPage } from "./extract";
import { tavilySearch } from "./tavily-search";
import { lookupExodus } from "./exodus";
import { lookupAppStore, type AppStoreResult } from "./appstore";
import { buildMermaidDiagram } from "./diagram";
import type { VendorReport } from "./types";

// ── Shared utilities ──────────────────────────────────────────────────────────

// Extract the outermost JSON object from a model response that may contain
// markdown fences, preamble text, or trailing explanation.
function extractJSON(text: string): string {
  // Strip ```json ... ``` or ``` ... ``` blocks
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Find the outermost { ... } as a fallback
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);

  return text.trim();
}

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_web",
    description:
      "Search the web for information. Use targeted queries like 'ClassDojo privacy policy site:classdojo.com' or 'ClassDojo subprocessor list'.",
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
    description:
      "Fetch a web page and return its text content. Use for privacy policies, DPAs, subprocessor lists, news articles.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
];

const SYSTEM_PROMPT = `You are a research assistant for an open investigation tool that helps parents, teachers, school officials, advocates, journalists, and researchers understand edtech vendors: where student data goes, who profits from it, who owns the company, and what people have said and done about it.

FRAMING — "follow the data, follow the money":
Student data moves through two overlapping layers:
- The Classroom layer: learning apps and the companies behind them (and their own vendors). Granular, continuous data: answers, time on task, voice recordings, taps, behavior flags.
- The Administrative layer: the district's student information system (SIS), the state longitudinal data system, and agreements linking education records to other agencies (workforce, health, child welfare, justice, migration, military recruitment). Slower, summarized data.
Five flows connect the two layers. Use them to structure what you look for:
1. Provisioning — the district roster (via SIS, Clever, ClassLink, OneRoster, Ed-Fi) creates the student's account in the app, usually without a consent screen (FERPA school-official exception).
2. Activity — the app records the child's interactions, sometimes biometrics such as voiceprints (COPPA; 2025 COPPA amendments cover biometric identifiers and require separate consent for third-party disclosure).
3. Subprocessors — the vendor's own vendors: cloud, analytics, email, speech recognition, generative AI. Often disclosed only "by category" ("our partners"), so the chain must be reconstructed.
4. Write-back — scores, risk flags, and predictions sent back into the LMS/SIS gradebook (LTI, OneRoster gradebook), where a private company's output becomes part of the child's official record.
5. Reporting & linkage — SIS records go to the state system and may be linked to other agencies.
Money matters as much as data: per-pupil licensing, freemium and paid upgrades sold to families, data-derived analytics sold back to schools ("we don't sell student data" while using it to build other products), marketing mapped to federal funding streams (ESSA Title I/II/III/IV, IDEA, Head Start, Preschool Development Grants), government contracts (including DoD/DoDEA and Bureau of Indian Education), and private-equity "buy-and-build" consolidation where the company holding the data is no longer the one the district signed with.

Be balanced and evidence-based. Record criticism AND support: breaches, investigations, community concerns, and advocacy campaigns against the vendor, but also endorsements, independent research, and positive evaluations. Never editorialize beyond what sources say.

HOW THIS RUN WORKS:
The research plan below has already been run for you: the user message contains the results of every planned search, the App Store and Exodus Privacy lookups, and the full text of the most relevant pages. Treat the plan as a checklist. Work from that evidence first; use search_web / fetch_page only to fill important gaps (e.g. verifying an acquisition or lawsuit source, reading a subprocessor list that wasn't fetched). When you need more than one lookup, request them all in the same turn so they run in parallel. Keep follow-ups to a few turns, then write the report.

RESEARCH PLAN:

PART 1 — OFFICIAL THIRD-PARTY DISCLOSURE DOCUMENTS (start here — these are ground truth):
1. Search "[vendor] privacy policy" — fetch the privacy policy page, note all third parties mentioned
2. Search "[vendor] subprocessors list" OR "[vendor] data processing agreement" — fetch if found
3. Search "[vendor] trust center" OR "trust.[vendor].com" OR "[vendor].com/trust" — fetch if found
4. Search "[vendor] App Store privacy" — fetch the App Store page (shows Apple's privacy nutrition label: data linked to you, data used to track you)
5. App Store lookup (provided) — get the privacyPolicyUrl and declared data practices
6. Search "[vendor] Google Play Data Safety" — fetch the Play Store page (shows Data Safety section with declared data types and sharing)
7. Exodus Privacy lookup (provided) — get detected SDK trackers and permissions

PART 2 — INFRASTRUCTURE & HOSTING:
8. Search "[vendor] AWS Azure Google Cloud infrastructure hosting" — identify cloud provider
9. Search "[vendor] CDN Cloudflare Fastly Akamai" — identify CDN/edge providers
10. Search "[vendor] SOC 2 compliance security" — find any public security certifications

PART 3 — ANALYTICS, TRACKING & AI/ML TOOLS (critical — these often handle student data):
11. Search "[vendor] analytics SDK Firebase Amplitude Mixpanel Segment Heap" — identify analytics tools
12. Search "[vendor] error tracking Sentry Bugsnag Crashlytics Datadog" — identify monitoring tools
13. Search "[vendor] AI machine learning OpenAI ChatGPT GPT generative AI" — CRITICAL for edtech: AI tools that process student work/data
14. Search "[vendor] BuiltWith technology stack" OR "[vendor] Wappalyzer" — fetch tech detection results if available
15. Search "[vendor] engineering blog technology stack" — fetch any engineering posts listing tech dependencies
16. Search "[vendor] job listings software engineer" — fetch job posts to find tech stack clues (job listings often reveal hidden dependencies)

PART 4 — COMMUNICATION & VIDEO TOOLS:
17. Search "[vendor] video Vimeo YouTube Kaltura Brightcove Wistia" — identify video hosting
18. Search "[vendor] customer support Zendesk Intercom Freshdesk" — identify support tools
19. Search "[vendor] email Twilio SendGrid Mailchimp" — identify communication providers

PART 5 — DOWNSTREAM RESEARCH (critical — most tools skip this):
20. Search "[vendor] Clever integration" and "[vendor] ClassLink integration" — rostering/SSO connections
21. Search "[vendor] Google Classroom Canvas LMS integration" — LMS connections
22. Search "[vendor] PowerSchool Infinite Campus SIS integration" — Student Information System connections
23. Search "[vendor] student data rostering OneRoster" — data standard connections
24. Search "[vendor] state education data FERPA" — state/federal data system connections
25. Fetch any integration/partners page you find

PART 6 — COMPANY OWNERSHIP RESEARCH (always do this — schools must know who really owns the data):
26. Search "[vendor] parent company" and "[vendor] acquired by" and "[vendor] acquisition"
27. Search "[vendor] Wikipedia" — fetch the Wikipedia page if found (has acquisition history)
28. Search "[vendor] founded year founder CEO" — for founding context
29. For any acquisition found, search "[acquirer] acquires [vendor] [year]" to find the original news article or press release
30. If a major acquisition is found, fetch the original announcement URL to verify details

PART 7 — CONTROVERSIES, ADVOCACY & INDEPENDENT EVALUATIONS:
- Data breaches or security incidents; investigative journalism (e.g. The Markup, EdSurge, Chalkbeat, The 74, local news); parent, teacher, or union concerns; advocacy campaigns for or against the product; independent evaluations (Common Sense Privacy Program, Internet Safety Labs, Student Privacy Pledge); independent research on effectiveness.

PART 8 — BUSINESS MODEL & PUBLIC MONEY:
- Pricing (per-pupil licenses, statewide agreements), free/freemium tiers and paid upgrades for families, data-derived analytics or benchmarking products, marketing tied to federal funding streams (ESSA Titles, IDEA, Head Start), public contracts (SAM.gov, USAspending, HigherGov, state procurement), pilots that bypass procurement.

PART 9 — AI FEATURES, SCORES & PREDICTIONS:
- Generative AI features and which AI providers process student data (zero data retention terms?); speech recognition or voice data; scores, risk flags, early-warning or predictive outputs, and whether they are written back into the SIS/LMS.

PART 10 — LAWSUITS & LEGAL ACTIONS (important for schools — helps identify past privacy violations):
31. Search "[vendor] lawsuit" and "[vendor] legal action" and "[vendor] FTC complaint" and "[vendor] privacy lawsuit"
32. Search "[vendor] settlement" and "[vendor] class action" and "[vendor] FERPA violation"
33. If a parent company was found: search "[parent company] lawsuit student data" and "[parent company] privacy settlement"
34. For any significant lawsuit or settlement found, fetch the source URL to verify details and outcome

After gathering data, output a JSON object matching this schema EXACTLY:

{
  "vendorName": string,
  "appName": string,
  "analysisDate": "ISO date string",
  "riskLevel": "elevated" | "standard" | "low-concern",
  "overview": string,          // 2-3 plain-language sentences: what the product is, who uses it (grades/ages), and the single most important thing to know about its data practices
  "keyFindings": string[],      // 3-5 one-sentence findings a parent or school board member most needs to know, most important first. Concrete and specific (name companies, numbers, dates). No hedging filler.
  "layer": "classroom" | "administrative" | "both",   // which data layer(s) the vendor operates in (e.g. a learning app = classroom; an SIS = administrative; PowerSchool = both)
  "summary": {
    "directSubprocessors": number,
    "estimatedDownstreamVendors": number,
    "detectedTrackers": number,
    "discrepanciesFound": number
  },
  "privacyDocuments": {
    "privacyPolicyUrl": string | null,
    "dpaUrl": string | null,
    "subprocessorListUrl": string | null,
    "appStoreUrl": string | null,
    "playStoreUrl": string | null,
    "lastUpdated": string | null
  },
  "subprocessors": [
    {
      "name": string,
      "purpose": string,
      "category": "analytics" | "infrastructure" | "payments" | "auth" | "ads" | "support" | "ai-ml" | "video" | "communication" | "other",
      "dataTypes": string[],
      "country": string | null,
      "privacyUrl": string | null,
      "disclosedIn": string | null,   // where you found this dependency: "App Store privacy label" | "Play Store Data Safety" | "Privacy policy" | "Subprocessor list" | "DPA" | "Trust center" | "Exodus Privacy" | "BuiltWith" | "Engineering blog" | "Job listing" | "Search result"
      "source": "declared" | "detected" | "inferred"
    }
  ],
  "trackers": [
    {
      "name": string,
      "category": string,
      "website": string | null,
      "detectedBy": "exodus" | "manual"
    }
  ],
  "discrepancies": [
    {
      "severity": "high" | "medium" | "low",
      "description": string,
      "declaredIn": string | null,
      "detectedBy": string | null
    }
  ],
  "vendorQuestions": string[],
  "humanInLoopSteps": string[],

  "companyOwnership": {
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
    "isPEOwned": false,
    "pePortfolioCompanies": [],
    "vendorAcquisitions": []
  },

  "lawsuits": [
    {
      "caseName": string,         // case or action name e.g. "Smith v. ClassDojo Inc." or "FTC v. [vendor]"
      "year": number | null,      // year filed or settled
      "court": string | null,     // e.g. "N.D. Cal." or "FTC" or "New York AG"
      "plaintiff": string | null, // who brought the suit (individuals, class, regulator)
      "description": string,      // one-paragraph summary of what was alleged
      "outcome": string | null,   // e.g. "Settled for $X", "Dismissed", "Ongoing", "Consent decree"
      "sourceUrl": string,        // MUST be a real URL you found: news article, court filing, FTC complaint, AG press release
      "sourceLabel": string       // e.g. "FTC Press Release", "NYT", "CourtListener", "State AG Office"
    }
  ],

  "dataFlowNodes": [
    {
      "id": string,
      "name": string,
      "layer": "upstream-infra" | "upstream-analytics" | "upstream-ads" | "upstream-auth" | "app" | "integration-rostering" | "integration-lms" | "downstream-sis" | "downstream-state",
      "description": string,
      "dataTypes": string[],
      "url": string | null,  // source evidence URL — meaning depends on source field:
                             //   "declared": URL of the document where the vendor named this third party (privacy policy, DPA, subprocessor list, App Store page)
                             //   "detected": URL of the detection source (Exodus Privacy result page, BuiltWith page, App Store privacy label page) — NOT the vendor's homepage
                             //   "inferred": URL of a relevant integration page if available, otherwise null
      "country": string | null,
      "source": "declared" | "detected" | "inferred"
    }
  ],

  "citations": [
    {
      "number": number,
      "label": string,
      "url": string,
      "context": string
    }
  ],

  "businessModel": {
    "summary": string,         // how the company makes money, in 1-3 sentences
    "models": [
      {
        "type": "per-pupil-license" | "freemium" | "direct-to-parent" | "data-derived-products" | "advertising" | "government-contract" | "pe-buy-and-build" | "other",
        "description": string,
        "sourceUrl": string | null
      }
    ],
    "fundingStreamsMarketed": [   // federal/state funding streams the vendor says its product qualifies for
      { "stream": string, "claim": string, "sourceUrl": string | null }   // e.g. "ESSA Title III", "Supports English learners"
    ],
    "publicContracts": [
      { "agency": string, "amount": string | null, "year": number | null, "description": string, "sourceUrl": string }
    ]
  },

  "aiFeatures": [
    {
      "name": string,
      "description": string,
      "aiProvider": string | null,          // e.g. "OpenAI", "Anthropic", "in-house", null if not disclosed
      "zeroDataRetention": "yes" | "no" | "unknown",
      "sourceUrl": string | null
    }
  ],

  "scoresAndPredictions": [    // scores, risk flags, benchmarks, early-warning or predictive outputs the product generates
    {
      "name": string,
      "description": string,
      "writesToOfficialRecord": "yes" | "no" | "unknown",   // sent back to the SIS/LMS/gradebook?
      "sourceUrl": string | null
    }
  ],

  "controversies": [           // breaches, investigations, community concerns, advocacy for/against, evaluations, research
    {
      "type": "data-breach" | "investigative-report" | "regulatory" | "advocacy-campaign" | "community-concern" | "independent-evaluation" | "research" | "endorsement",
      "stance": "critical" | "supportive" | "mixed",
      "title": string,
      "year": number | null,
      "actor": string | null,        // who: e.g. "The Markup", "Parent Coalition for Student Privacy", "Common Sense Media", "teachers union"
      "description": string,
      "sourceUrl": string,           // MUST be a real URL you found
      "sourceLabel": string
    }
  ],

  "rawNotes": string
}

LAYER DEFINITIONS for dataFlowNodes:
- "upstream-infra"        : Cloud hosting, CDN, databases (AWS, GCP, Azure, Cloudflare, Fastly)
- "upstream-analytics"    : Analytics, session recording, error tracking (Google Analytics, Amplitude, Mixpanel, Segment, Firebase, Sentry, Datadog)
- "upstream-ads"          : Advertising, marketing (Facebook SDK, Meta Pixel, Google Ads, DoubleClick, AppsFlyer)
- "upstream-auth"         : Authentication, identity (Google OAuth, Apple Sign-In, Auth0, Okta)
- "app"                   : The vendor/app itself — ALWAYS include exactly one node here
- "integration-rostering" : Rostering, SSO, provisioning (Clever, ClassLink, OneRoster, LTI)
- "integration-lms"       : Learning Management Systems (Google Classroom, Canvas, Schoology, Blackboard, Moodle)
- "downstream-sis"        : Student Information Systems (PowerSchool, Infinite Campus, Skyward, Aeries, Aspen/X2, Synergy, Frontline)
- "downstream-state"      : State/federal education data systems (State DOE data warehouse, Ed-Fi Alliance, CEDS, ESSA reporting)

ANTI-HALLUCINATION RULES — strictly enforced:
- companyOwnership.acquisitionHistory: ONLY include events where you found and verified a real URL (news article, press release, SEC filing, Wikipedia with citation). If you cannot find a verifiable source URL, omit the event entirely. An empty array is correct when no verified acquisition is found.
- companyOwnership.currentParentUrl: must be a real URL you fetched or found in search results, not constructed
- Every citation URL must be a URL you actually retrieved or found in search results during this session
- dataFlowNodes source "detected": ONLY use this when you have an actual detection tool result (Exodus, BuiltWith, App Store label). Set url to the detection source page URL. Never use "detected" for something you only found in a search result snippet.
- dataFlowNodes source "declared": ONLY use this when you read the actual document and found the vendor named in it. Set url to that document URL.
- dataFlowNodes source "inferred": acceptable for downstream SIS/state nodes based on known industry patterns. Set url to null or an integration page if found. Never mark inferred as declared or detected.
- NEVER invent acquisition years, prices, or acquirer names — only report what you verified from a source URL
- controversies, publicContracts, fundingStreamsMarketed: ONLY include entries backed by a real URL from this session. Empty arrays are correct when nothing was found.
- aiFeatures.zeroDataRetention and scoresAndPredictions.writesToOfficialRecord: use "unknown" unless a source states it explicitly.
- lawsuits: ONLY include entries where you found and verified a real source URL (court filing, news article, FTC/AG press release). If you cannot find a verifiable source URL for a lawsuit, omit it. An empty array is correct when no verified lawsuit is found. Never invent case names, outcomes, or settlement amounts.

For overview: plain language a parent could understand. No jargon without explanation.
For vendorQuestions: 5-8 specific questions a district official, school board member, or parent could put to this vendor, grounded in gaps you actually found (unnamed subprocessors, AI providers and retention terms, scores written back to the record, data use in other products, ownership changes, pilots, law-enforcement or immigration data requests). Name the specific document, feature, or company each question is about. Do not repeat generic questions that would apply to any vendor.
For humanInLoopSteps: 3-5 steps requiring human verification (dynamic traffic capture, DPA legal review, contractual audit rights, etc.).
For citations: 10-20 entries — every major finding (subprocessor, integration, acquisition, tracker, AI tool, disclosure document) must cite a source URL you actually visited.

TOOL FAILURE HANDLING — critical:
- If search_web returns "Search temporarily unavailable", immediately move to the next research step. Never stop researching because one search failed.
- If fetch_page returns "Page could not be fetched", try a different URL for the same information, or skip and continue.
- Tool failures are common. A complete report with some gaps is far better than stopping early. Always output the JSON at the end regardless of how many tools failed.
- After a tool failure, continue with the very next numbered step in the research plan.

Output ONLY the JSON object. No markdown fences, no explanation.`;

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
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
    // Return a graceful message so the agent continues research rather than stopping
    if (name === "search_web") {
      return `Search temporarily unavailable (${msg}). Skip this search and continue with the next research step using other tools.`;
    }
    if (name === "fetch_page") {
      return `Page could not be fetched (${msg}). Skip this URL and continue with other research steps.`;
    }
    return `Tool unavailable (${msg}). Continue with remaining research steps.`;
  }
}

function vendorQueries(v: string, district?: string): SearchQuery[] {
  const q: SearchQuery[] = [
    // The vendor's own disclosures
    { query: `${v} privacy policy for students and schools` },
    { query: `${v} list of subprocessors or third-party service providers` },
    { query: `${v} data processing agreement or student data privacy agreement` },
    { query: `${v} trust center security and compliance` },
    { query: `${v} Student Data Privacy Consortium signed agreement` },
    { query: `${v} app privacy label on the Apple App Store and Google Play data safety` },
    // Data flows and technical dependencies
    { query: `what cloud provider hosts ${v} (AWS, Google Cloud, Azure)` },
    { query: `analytics and tracking tools used by ${v}` },
    { query: `${v} integration with Clever, ClassLink, Google Classroom, or Canvas` },
    { query: `${v} integration with PowerSchool or student information systems, grade passback` },
    { query: `${v} AI features, which AI provider, and student data` },
    { query: `${v} risk scores, early warning, or predictive analytics for students` },
    // Money
    { query: `${v} pricing per student or district license cost` },
    { query: `${v} ESSA Title I, Title III, or IDEA funding eligibility` },
    { query: `${v} contract with school district or state department of education` },
    { query: `${v} paid premium features or subscriptions for parents` },
    // Ownership
    { query: `who owns ${v}, parent company and acquisition history` },
    { query: `${v} acquired by private equity` },
    { query: `${v} company history founded founders` },
    // Legal, controversies, advocacy (news search)
    { query: `${v} lawsuit or class action over student data`, topic: "news" },
    { query: `${v} FTC, attorney general, or regulator action`, topic: "news" },
    { query: `${v} data breach or security incident`, topic: "news" },
    { query: `${v} investigation or criticism of student privacy`, topic: "news" },
    { query: `parents or teachers concerns about ${v}`, topic: "news" },
    { query: `${v} Common Sense privacy evaluation or independent review` },
    { query: `${v} independent research on effectiveness` },
  ];
  if (district) {
    q.push(
      { query: `${district} ${v} contract or agreement` },
      { query: `${district} ${v} parents concerns`, topic: "news" },
    );
  }
  return q;
}

export async function runAgent(
  vendorName: string,
  onProgress: (msg: string) => void,
  districtName?: string,
): Promise<VendorReport> {
  const districtContext = districtName
    ? ` Also investigate the vendor's specific relationship with "${districtName}" school district: search for contracts, data sharing agreements, local news coverage, community or parent concerns, and any district-specific implementation details. Include district-specific findings in the report summary and discrepancies where relevant.`
    : "";
  const task = `Investigate the edtech vendor/app: "${vendorName}".${districtContext}`;

  assertKeys();
  onProgress(`Starting investigation of "${vendorName}"${districtName ? ` (context: ${districtName})` : ""}…`);

  // Step 1 — run every planned search plus the App Store / Exodus lookups in parallel
  const [searches, appStore, exodus] = await Promise.all([
    runSearches(vendorQueries(vendorName, districtName), onProgress),
    lookupAppStore(vendorName).catch((err) => ({ found: false, error: String(err) } as AppStoreResult)),
    lookupExodus(vendorName).catch((err) => ({ error: String(err) })),
  ]);

  // Step 2 — always read the vendor's own policy pages, then the pages Claude picks
  onProgress("Choosing which pages to read…");
  const mustRead = [
    appStore.found ? appStore.privacyUrl : undefined,
    ...searches.slice(0, 3).map((s) => s.results[0]?.url), // privacy policy, subprocessors, DPA
  ].filter((u): u is string => !!u);
  const picked = await selectPagesToFetch(task, searches, 18);
  const pages = await readPages(Array.from(new Set([...mustRead, ...picked])).slice(0, 20), 20000, onProgress);

  // Step 3 — Claude writes the report, with a few turns of follow-up lookups if needed
  onProgress("Analyzing evidence…");
  const evidence = { searches, appStoreLookup: appStore, exodusLookup: exodus, fetchedPages: pages };
  const text = await runToolLoop({
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    userMessage: `${task} Use the evidence below, fill important gaps with tools if needed, then output the JSON report.\n\nEVIDENCE:\n${JSON.stringify(evidence)}`,
    maxIterations: 6,
    effort: "medium",
    executeTool,
    describeCall: (step, toolName, toolInput) => {
      if (toolName === "search_web") return `[follow-up ${step}] Searching: "${toolInput.query}"`;
      if (toolName === "fetch_page") return `[follow-up ${step}] Fetching: ${toolInput.url}`;
      return `[follow-up ${step}] Running ${toolName}`;
    },
    onProgress,
  });

  onProgress("Compiling final report…");
  const report = JSON.parse(extractJSON(text)) as VendorReport;
  report.analysisDate = new Date().toISOString();
  if (report.dataFlowNodes?.length) {
    report.diagramCode = buildMermaidDiagram(report.dataFlowNodes, report.vendorName);
  }
  return report;
}
