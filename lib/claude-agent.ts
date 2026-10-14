import Anthropic from "@anthropic-ai/sdk";
import { tavilySearch, type SearchResult } from "./tavily-search";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export const CLAUDE_MODEL = "claude-sonnet-5-5";

export type Effort = "low" | "medium" | "high";

// Run async fn over items with at most `limit` in flight at once.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// Fetch a page and strip it to plain text.
export async function fetchPageText(url: string, maxChars: number, userAgent: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export interface SearchBatchResult {
  query: string;
  results: SearchResult[];
  error?: string;
}

// Run a fixed list of searches in parallel; failures are recorded, not thrown.
export async function runSearches(
  queries: string[],
  onProgress: (msg: string) => void,
): Promise<SearchBatchResult[]> {
  onProgress(`Running ${queries.length} searches in parallel…`);
  const out = await mapLimit(queries, 8, async (query) => {
    try {
      return { query, results: await tavilySearch(query, 5) };
    } catch (err) {
      return { query, results: [], error: err instanceof Error ? err.message : String(err) };
    }
  });
  const ok = out.filter((r) => !r.error).length;
  onProgress(`Searches done (${ok}/${queries.length} succeeded)`);
  return out;
}

// Ask Claude which of the search-result URLs are worth reading in full.
export async function selectPagesToFetch(
  task: string,
  searches: SearchBatchResult[],
  maxPages: number,
): Promise<string[]> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { urls: { type: "array", items: { type: "string" } } },
          required: ["urls"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content:
          `${task}\n\nBelow are web search results. Pick up to ${maxPages} URLs whose full text is most worth reading ` +
          `(primary sources first: official documents, filings, press releases, authoritative reports). ` +
          `Only pick URLs that appear in the results.\n\n${JSON.stringify(searches)}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return [];
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const known = new Set(searches.flatMap((s) => s.results.map((r) => r.url)));
  try {
    const urls = (JSON.parse(text) as { urls: string[] }).urls;
    return Array.from(new Set(urls.filter((u) => known.has(u)))).slice(0, maxPages);
  } catch {
    return [];
  }
}

export interface ToolLoopOptions {
  system: string;
  tools: Anthropic.Beta.BetaTool[];
  userMessage: string;
  maxIterations: number;
  effort: Effort;
  executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  describeCall: (step: number, name: string, input: Record<string, unknown>) => string;
  onProgress: (msg: string) => void;
}

// With eager input streaming the server no longer validates tool inputs, so
// check that every required field is present and a string before running.
function missingRequired(tool: Anthropic.Beta.BetaTool | undefined, input: Record<string, unknown>): string | null {
  if (!tool) return "unknown tool";
  for (const key of tool.input_schema.required ?? []) {
    if (typeof input[key] !== "string" || !(input[key] as string).trim()) return `missing "${key}"`;
  }
  return null;
}

// Runs the tool-use loop until Claude stops calling tools, and returns its final text.
export async function runToolLoop(opts: ToolLoopOptions): Promise<string> {
  const tools = opts.tools.map((t) => ({ ...t, eager_input_streaming: true }));
  const toolsByName = new Map(tools.map((t) => [t.name, t]));
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.userMessage }];
  let stepCount = 0;
  let jsonRetries = 0;

  for (let i = 0; i < opts.maxIterations; i++) {
    // On the last allowed turn, take tools away so Claude must write the final answer
    const lastTurn = i === opts.maxIterations - 1;
    const stream = client.beta.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 64000,
      system: opts.system,
      tools,
      tool_choice: lastTurn ? { type: "none" } : { type: "auto" },
      messages,
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort },
      cache_control: { type: "ephemeral" }, // caches the growing conversation prefix each turn
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // re-run on a fallback model if a safety classifier declines
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Only an unparseable tool input is retried; API errors (already retried by the SDK) are rethrown
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
      i--;
      continue;
    }

    if (message.stop_reason === "refusal") {
      throw new Error(`Claude declined the request${message.stop_details?.category ? ` (${message.stop_details.category})` : ""}`);
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );

    if (!toolUses.length) {
      if (message.stop_reason === "max_tokens") throw new Error("Claude ran out of output tokens before finishing the report");
      return message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    }

    if (message.stop_reason === "max_tokens") throw new Error("Tool input truncated (max_tokens)");

    messages.push({ role: "assistant", content: message.content });

    // Run this turn's tool calls in parallel and return all results in one user message
    const results = await Promise.all(
      toolUses.map(async (call): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const input = (call.input ?? {}) as Record<string, unknown>;
        const invalid = missingRequired(toolsByName.get(call.name), input);
        if (invalid) {
          return { type: "tool_result", tool_use_id: call.id, is_error: true, content: `Invalid input: ${invalid}` };
        }
        opts.onProgress(opts.describeCall(++stepCount, call.name, input));
        return { type: "tool_result", tool_use_id: call.id, content: await opts.executeTool(call.name, input) };
      }),
    );
    messages.push({ role: "user", content: results });
  }

  throw new Error("Agent exceeded maximum iterations");
}
