import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, type FunctionDeclaration } from "@google/generative-ai";
import { braveSearch } from "./brave-search";
import { lookupExodus } from "./exodus";
import { lookupAppStore } from "./appstore";
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

Given a vendor/app name, you will:
1. Search for their privacy policy, data processing agreement (DPA), and subprocessor list
2. Fetch those documents and extract key information
3. Check Exodus Privacy for detected Android trackers
4. Check the App Store for declared data practices
5. Identify discrepancies between declared and detected practices
6. Generate a data flow diagram in Mermaid syntax
7. Generate specific vendor questions

Be thorough but efficient. Make 8-15 tool calls total. After gathering data, output a JSON object matching this schema exactly:

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
  "diagramCode": string,
  "humanInLoopSteps": string[],
  "sources": [{ "label": string, "url": string }],
  "rawNotes": string
}

For diagramCode, generate a valid Mermaid flowchart. Example format:
flowchart TD
    App[VendorApp\\nStudent Data] --> AWS[AWS\\nCloud Hosting]
    App --> Google[Google Analytics\\nUsage Tracking]
    style App fill:#3b82f6,color:#fff
    style Google fill:#ef4444,color:#fff

Color conventions:
- App itself: #3b82f6 (blue)
- Analytics/ads: #ef4444 (red)
- Infrastructure: #8b5cf6 (purple)
- Auth/identity: #f59e0b (amber)
- Support: #10b981 (green)
- Other: #6b7280 (gray)

For vendorQuestions: generate 5-7 specific, pointed questions a procurement officer should send to the vendor, based on actual gaps found in the analysis.

For humanInLoopSteps: list 3-5 steps a human analyst should take that the automated analysis cannot do (dynamic traffic capture, legal review of DPA clauses, etc.).

Estimate downstream vendors by looking up 2-3 major subprocessors' own subprocessor lists if possible.

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
