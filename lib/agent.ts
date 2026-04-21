import OpenAI from "openai";
import { braveSearch } from "./brave-search";
import { lookupExodus } from "./exodus";
import { lookupAppStore } from "./appstore";
import { buildMermaidDiagram } from "./diagram";
import type { VendorReport } from "./types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Search the web for information. Use targeted queries like 'ClassDojo privacy policy site:classdojo.com' or 'ClassDojo subprocessor list'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          count: { type: "number", description: "Number of results (1-10, default 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_page",
      description:
        "Fetch a web page and return its text content. Use for privacy policies, DPAs, subprocessor lists. Returns up to 8000 characters.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_exodus",
      description:
        "Look up an Android app on Exodus Privacy to get detected trackers and permissions. Pass the app name or package name.",
      parameters: {
        type: "object",
        properties: {
          appName: { type: "string", description: "App name or Android package name" },
        },
        required: ["appName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_appstore",
      description:
        "Look up an app on the Apple App Store via iTunes Search API. Returns app metadata including privacy policy URL.",
      parameters: {
        type: "object",
        properties: {
          appName: { type: "string", description: "App name to search for" },
        },
        required: ["appName"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are a data privacy investigator helping schools and districts evaluate edtech vendor data practices.

Given a vendor/app name, investigate the FULL data flow — both upstream (services the app depends on) AND downstream (education systems student data eventually reaches).

RESEARCH PLAN (15-22 tool calls):

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
11. Fetch any integration/partners page you find

COMPANY OWNERSHIP RESEARCH (always do this — schools must know who really owns the data):
12. Search "[vendor] parent company" and "[vendor] acquired by" and "[vendor] acquisition"
13. Search "[vendor] Wikipedia" — fetch the Wikipedia page if found (has acquisition history)
14. Search "[vendor] founded year founder CEO" — for founding context
15. For any acquisition found, search "[acquirer] acquires [vendor] [year]" to find the original news article or press release
16. If a major acquisition is found, fetch the original announcement URL to verify details

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

For vendorQuestions: 5-7 specific, pointed questions for a procurement officer based on actual gaps found.
For humanInLoopSteps: 3-5 steps requiring human verification (dynamic traffic capture, DPA legal review, etc.).
For citations: 8-15 entries — every major finding (subprocessor, integration, acquisition, tracker) must cite a source URL you actually visited.

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
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Investigate the edtech vendor/app: "${vendorName}". Gather all available public information about their data practices and output the JSON report.`,
    },
  ];

  onProgress(`Starting investigation of "${vendorName}"...`);

  const MAX_ITERATIONS = 25;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.chat.completions.create({
      model: "o4-mini",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_completion_tokens: 16000,
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Always push the assistant turn so the conversation stays valid
    messages.push(message);

    // ── Final answer ──────────────────────────────────────────────────────────
    if (choice.finish_reason === "stop") {
      let jsonStr = (message.content ?? "").trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
      }

      const report = JSON.parse(jsonStr) as VendorReport;
      report.analysisDate = new Date().toISOString();
      if (report.dataFlowNodes?.length) {
        report.diagramCode = buildMermaidDiagram(report.dataFlowNodes, report.vendorName);
      }
      return report;
    }

    // ── Tool calls ────────────────────────────────────────────────────────────
    if (choice.finish_reason === "tool_calls" && message.tool_calls?.length) {
      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const toolName = call.function.name;
        let toolInput: Record<string, unknown> = {};
        try { toolInput = JSON.parse(call.function.arguments); } catch { /* keep empty */ }

        const progressMsg = (() => {
          if (toolName === "search_web")    return `Searching: "${toolInput.query}"`;
          if (toolName === "fetch_page")    return `Fetching: ${toolInput.url}`;
          if (toolName === "lookup_exodus") return `Checking Exodus Privacy for "${toolInput.appName}"`;
          if (toolName === "lookup_appstore") return `Checking App Store for "${toolInput.appName}"`;
          return `Running ${toolName}`;
        })();
        onProgress(progressMsg);

        const output = await executeTool(toolName, toolInput);

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: output,
        });
      }
      continue;
    }

    // Unexpected finish reason — stop
    break;
  }

  throw new Error("Agent exceeded maximum iterations");
}
