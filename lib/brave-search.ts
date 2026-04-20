const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function braveSearch(query: string, count = 5): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY not set");

  const url = `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${count}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) throw new Error(`Brave Search error: ${res.status}`);
  const data = await res.json();

  return (data.web?.results ?? []).map((r: { title: string; url: string; description: string }) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }));
}
