const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Minimum gap between Brave Search calls — free tier is 1 req/sec
let lastSearchAt = 0;
async function throttle() {
  const gap = 1100; // 1.1s to stay safely under 1 req/sec limit
  const wait = gap - (Date.now() - lastSearchAt);
  if (wait > 0) await sleep(wait);
  lastSearchAt = Date.now();
}

export async function braveSearch(query: string, count = 5): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY not set");

  await throttle();

  const url = `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${count}`;

  // Retry up to 3 times with backoff — handles 429 rate limits and transient errors
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      return (data.web?.results ?? []).map((r: { title: string; url: string; description: string }) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      }));
    }

    if (res.status === 429) {
      // Rate limited — respect Retry-After header or back off exponentially
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "0", 10);
      const wait = retryAfter > 0 ? retryAfter * 1000 : 2000 * Math.pow(2, attempt);
      await sleep(wait);
      lastSearchAt = Date.now(); // reset throttle after waiting
      continue;
    }

    // 5xx server errors — retry with backoff
    if (res.status >= 500 && attempt < 2) {
      await sleep(1500 * (attempt + 1));
      continue;
    }

    throw new Error(`Brave Search error: ${res.status}`);
  }

  throw new Error("Brave Search failed after 3 attempts");
}
