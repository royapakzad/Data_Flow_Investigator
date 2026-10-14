const TAVILY_API = "https://api.tavily.com/search";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tavily doesn't reliably honor `site:` in the query — pull it out into include_domains
function extractSiteFilters(query: string): { query: string; includeDomains: string[] } {
  const includeDomains: string[] = [];
  const cleaned = query
    .replace(/(^|\s)site:(\S+)/gi, (_, lead: string, domain: string) => {
      includeDomains.push(domain);
      return lead;
    })
    .replace(/\s+/g, " ")
    .trim();
  return { query: cleaned || query, includeDomains };
}

export async function tavilySearch(query: string, count = 5, topic: "general" | "news" = "general"): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const { query: q, includeDomains } = extractSiteFilters(query);
  const body = JSON.stringify({
    query: q,
    max_results: Math.min(Math.max(count, 1), 20),
    search_depth: "basic",
    topic,
    ...(includeDomains.length ? { include_domains: includeDomains } : {}),
  });

  // Retry up to 3 times with backoff — handles 429 rate limits and transient errors
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(TAVILY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      return (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        description: r.content,
      }));
    }

    if (res.status === 429 || (res.status >= 500 && attempt < 2)) {
      await sleep(1000 * Math.pow(2, attempt));
      continue;
    }

    throw new Error(`Tavily Search error: ${res.status}`);
  }

  throw new Error("Tavily Search failed after 3 attempts");
}
