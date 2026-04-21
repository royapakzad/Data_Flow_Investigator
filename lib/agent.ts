import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, type FunctionDeclaration } from "@google/generative-ai";
import { braveSearch } from "./brave-search";
import { lookupExodus } from "./exodus";
import { lookupAppStore } from "./appstore";
import { buildMermaidDiagram } from "./diagram";
import type { VendorReport } from "./types";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ── Shared utilities ──────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry a fn up to maxAttempts times with exponential backoff on any error.
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

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_web",
    description:
      "Search the web for information. Use targeted queries like 'ClassDojo privacy policy site:classdojo.com' or 'ClassDojo subprocessor list'.",
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
    description:
      "Fetch a web page and return its text content. Use for privacy policies, DPAs, subprocessor lists. Returns up to 8000 characters.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "lookup_exodus",
    description:
      "Look up an Android app on Exodus Privacy to get detected trackers and permissions. Pass the app name or package name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        appName: { type: SchemaType.STRING, description: "App name or Android package name" },
      },
      required: ["appName"],
    },
  },
  {
    name: "lookup_appstore",
    description:
      "Look up an app on the Apple App Store via iTunes Search API. Returns app metadata including privacy policy URL.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        appName: { type: SchemaType.STRING, description: "App name to search for" },
      },
      required: ["appName"],
    },
  },
];

const SYSTEM_PROMPT = `You are a data privacy investigator helping schools and districts evaluate edtech vendor data practices.

Given a vendor/app name, investigate the FULL data flow — both upstream (services the app depends on) AND downstream (education systems student data eventually reaches).

RESEARCH PLAN (22-32 tool calls):

PART 1 — OFFICIAL THIRD-PARTY DISCLOSURE DOCUMENTS (start here — these are ground truth):
1. Search "[vendor] privacy policy" — fetch the privacy policy page, note all third parties mentioned
2. Search "[vendor] subprocessors list" OR "[vendor] data processing agreement" — fetch if found
3. Search "[vendor] trust center" OR "trust.[vendor].com" OR "[vendor].com/trust" — fetch if found
4. Search "[vendor] App Store privacy" — fetch the App Store page (shows Apple's privacy nutrition label: data linked to you, data used to track you)
5. Check App Store via lookup_appstore — get the privacyPolicyUrl and declared data practices
6. Search "[vendor] Google Play Data Safety" — fetch the Play Store page (shows Data Safety section with declared data types and sharing)
7. Check Exodus Privacy via lookup_exodus — get detected SDK trackers and permissions

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

After gathering data, output a JSON object matching this schema EXACTLY:

{
  "vendorName": string,
  "appName": string,
  "analysisDate": "ISO date string",
  "riskLevel": "elevated" | "standard" | "low-concern",
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
    "ownershipNotes": string
  },

  "dataFlowNodes": [
    {
      "id": string,
      "name": string,
      "layer": "upstream-infra" | "upstream-analytics" | "upstream-ads" | "upstream-auth" | "app" | "integration-rostering" | "integration-lms" | "downstream-sis" | "downstream-state",
      "description": string,
      "dataTypes": string[],
      "url": string | null,
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
- dataFlowNodes with source "inferred" are acceptable for downstream SIS/state nodes, but "declared" and "detected" require a citation
- NEVER invent acquisition years, prices, or acquirer names — only report what you verified from a source URL

For vendorQuestions: 5-8 specific, pointed questions for a procurement officer based on actual gaps found — especially around AI/ML tool use, undisclosed third parties, and what happens to student data when a subprocessor uses it to train models.
For humanInLoopSteps: 3-5 steps requiring human verification (dynamic traffic capture, DPA legal review, contractual audit rights, etc.).
For citations: 10-20 entries — every major finding (subprocessor, integration, acquisition, tracker, AI tool, disclosure document) must cite a source URL you actually visited.

Output ONLY the JSON object. No markdown fences, no explanation.`;

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
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
        headers: { "User-Agent": "Mozilla/5.0 (compatible; VendorAuditBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return `Error: HTTP ${res.status}`;
      const text = await res.text();
      const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return cleaned.slice(0, 8000);
    }

    if (name === "lookup_exodus") {
      const result = await lookupExodus(input.appName as string);
      return JSON.stringify(result, null, 2);
    }

    if (name === "lookup_appstore") {
      const result = await lookupAppStore(input.appName as string);
      return JSON.stringify(result, null, 2);
    }

    return `Unknown tool: ${name}`;
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function runAgent(
  vendorName: string,
  onProgress: (msg: string) => void
): Promise<VendorReport> {
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    generationConfig: { maxOutputTokens: 20000 },
  });

  const chat = model.startChat();
  onProgress(`Starting investigation of "${vendorName}"…`);

  let result = await withRetry(() =>
    chat.sendMessage(
      `Investigate the edtech vendor/app: "${vendorName}". Gather all available public information about their data practices and output the JSON report.`
    )
  );

  const MAX_ITERATIONS = 40;
  let stepCount = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls?.length) {
      onProgress("Compiling final report…");
      const jsonStr = extractJSON(response.text());
      const report = JSON.parse(jsonStr) as VendorReport;
      report.analysisDate = new Date().toISOString();
      if (report.dataFlowNodes?.length) {
        report.diagramCode = buildMermaidDiagram(report.dataFlowNodes, report.vendorName);
      }
      return report;
    }

    const toolResponses: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];
    for (const call of functionCalls) {
      stepCount++;
      const toolName = call.name;
      const toolInput = call.args as Record<string, unknown>;
      const progressMsg = (() => {
        if (toolName === "search_web")      return `[${stepCount}] Searching: "${toolInput.query}"`;
        if (toolName === "fetch_page")      return `[${stepCount}] Fetching: ${toolInput.url}`;
        if (toolName === "lookup_exodus")   return `[${stepCount}] Checking Exodus Privacy for "${toolInput.appName}"`;
        if (toolName === "lookup_appstore") return `[${stepCount}] Checking App Store for "${toolInput.appName}"`;
        return `[${stepCount}] Running ${toolName}`;
      })();
      onProgress(progressMsg);
      const output = await executeTool(toolName, toolInput);
      toolResponses.push({ functionResponse: { name: toolName, response: { result: output } } });
    }
    result = await withRetry(() => chat.sendMessage(toolResponses));
  }

  throw new Error("Agent exceeded maximum iterations");
}
