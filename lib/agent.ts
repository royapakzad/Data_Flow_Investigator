import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, type FunctionDeclaration } from "@google/generative-ai";
import { braveSearch } from "./brave-search";
import { lookupExodus } from "./exodus";
import { lookupAppStore } from "./appstore";
import { buildMermaidDiagram } from "./diagram";
import type { VendorReport } from "./types";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

RESEARCH PLAN (12-18 tool calls):

UPSTREAM RESEARCH:
1. Fetch privacy policy and subprocessor list — extract cloud infrastructure, analytics, auth, and advertising vendors
2. Search for "[vendor] AWS Google Cloud infrastructure" to identify hosting providers
3. Search for "[vendor] analytics trackers SDK" to find analytics/tracking dependencies
4. Check Exodus Privacy for Android SDK trackers
5. Check App Store for declared data practices

DOWNSTREAM RESEARCH (critical — most tools skip this):
6. Search "[vendor] Clever integration" and "[vendor] ClassLink integration" — rostering/SSO connections
7. Search "[vendor] Google Classroom Canvas LMS integration" — LMS connections
8. Search "[vendor] PowerSchool Infinite Campus SIS integration" — Student Information System connections
9. Search "[vendor] student data rostering OneRoster" — data standard connections
10. Search "[vendor] state education data FERPA" — state/federal data system connections
11. Fetch any integration pages you find (e.g. vendor's "Integrations" or "Partners" page)

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
      "category": "analytics" | "infrastructure" | "payments" | "auth" | "ads" | "support" | "other",
      "dataTypes": string[],
      "country": string | null,
      "privacyUrl": string | null,
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

  "dataFlowNodes": [
    {
      "id": string,              // unique slug, e.g. "aws", "powerschool", "clever"
      "name": string,            // display name
      "layer": "upstream-infra" | "upstream-analytics" | "upstream-ads" | "upstream-auth" | "app" | "integration-rostering" | "integration-lms" | "downstream-sis" | "downstream-state",
      "description": string,     // one-line role, e.g. "Cloud Hosting" or "Student Rostering & SSO"
      "dataTypes": string[],     // student data flowing through: e.g. ["student names", "usage data"]
      "url": string | null,      // privacy page URL
      "country": string | null,
      "source": "declared" | "detected" | "inferred"
    }
  ],

  "citations": [
    {
      "number": number,          // 1-based sequential
      "label": string,           // e.g. "ClassDojo Privacy Policy"
      "url": string,
      "context": string          // one sentence: what key finding came from this source
    }
  ],

  "rawNotes": string
}

LAYER DEFINITIONS for dataFlowNodes — assign each node to exactly one layer:
- "upstream-infra"        : Cloud hosting, CDN, databases (AWS, GCP, Azure, Cloudflare, Fastly)
- "upstream-analytics"    : Analytics, session recording, error tracking (Google Analytics, Amplitude, Mixpanel, Segment, Firebase, Sentry, Datadog, Heap)
- "upstream-ads"          : Advertising, marketing (Facebook SDK, Meta Pixel, Google Ads, DoubleClick, AppsFlyer)
- "upstream-auth"         : Authentication, identity (Google OAuth, Apple Sign-In, Auth0, Okta)
- "app"                   : The vendor/app itself — ALWAYS include exactly one node here
- "integration-rostering" : Rostering, SSO, provisioning (Clever, ClassLink, OneRoster, LTI, Canvas Network)
- "integration-lms"       : Learning Management Systems (Google Classroom, Canvas by Instructure, Schoology, Blackboard, Moodle, Brightspace)
- "downstream-sis"        : Student Information Systems (PowerSchool, Infinite Campus, Skyward, Aeries, Aspen/X2, Synergy, Frontline)
- "downstream-state"      : State/federal education data systems (State DOE data warehouse, Ed-Fi Alliance, CEDS, SIF Association, ESSA reporting)

IMPORTANT RULES:
- Always include AT LEAST one node for the app layer
- Include downstream-sis and downstream-state nodes even if inferred — if a vendor integrates with Clever, Clever feeds SIS data, so include PowerSchool/Infinite Campus as inferred downstream nodes
- If you find NO integration evidence, still include generic "downstream-sis" node labeled "Connected SIS (via rostering)" as inferred
- dataFlowNodes should have 8-20 total nodes covering all relevant layers
- citations should have 5-12 entries — every major finding must cite a source
- For each citation, context must explain specifically what was found there

For vendorQuestions: 5-7 specific, pointed questions for a procurement officer based on actual gaps found.
For humanInLoopSteps: 3-5 steps requiring human verification (dynamic traffic capture, DPA legal review, etc.).

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
    model: "gemini-2.5-flash-preview-04-17",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    generationConfig: { maxOutputTokens: 8192 },
  });

  const chat = model.startChat();

  onProgress(`Starting investigation of "${vendorName}"...`);

  let result = await chat.sendMessage(
    `Investigate the edtech vendor/app: "${vendorName}". Gather all available public information about their data practices and output the JSON report.`
  );

  let iterations = 0;
  const MAX_ITERATIONS = 20;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      let jsonStr = response.text().trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
      }

      const report = JSON.parse(jsonStr) as VendorReport;
      report.analysisDate = new Date().toISOString();
      // Build diagram from structured nodes (guaranteed valid Mermaid)
      if (report.dataFlowNodes?.length) {
        report.diagramCode = buildMermaidDiagram(report.dataFlowNodes, report.vendorName);
      }
      return report;
    }

    const toolResponses = [];

    for (const call of functionCalls) {
      const toolName = call.name;
      const toolInput = call.args as Record<string, unknown>;

      const progressMsg = (() => {
        if (toolName === "search_web") return `Searching: "${toolInput.query}"`;
        if (toolName === "fetch_page") return `Fetching: ${toolInput.url}`;
        if (toolName === "lookup_exodus") return `Checking Exodus Privacy for "${toolInput.appName}"`;
        if (toolName === "lookup_appstore") return `Checking App Store for "${toolInput.appName}"`;
        return `Running ${toolName}`;
      })();

      onProgress(progressMsg);

      const output = await executeTool(toolName, toolInput);

      toolResponses.push({
        functionResponse: {
          name: toolName,
          response: { result: output },
        },
      });
    }

    result = await chat.sendMessage(toolResponses);
  }

  throw new Error("Agent exceeded maximum iterations");
}
