// Turn a web page into readable text for the model.
// Prefers Tavily Extract (renders JS-heavy pages, returns clean markdown);
// falls back to fetching the HTML and stripping it locally.

const TAVILY_EXTRACT = "https://api.tavily.com/extract";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export interface PageText {
  url: string;
  text?: string;
  error?: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", copy: "©", reg: "®", trade: "™",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// Strip an HTML document down to its readable text, keeping paragraph/heading/list breaks.
export function htmlToText(html: string): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|head|form|button|select)\b[\s\S]*?<\/\1>/gi, " ");

  // Prefer the main content region when the page marks one
  const main = s.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? s.match(/<article\b[\s\S]*?<\/article>/i)?.[0];
  if (main && main.length > 2000) s = main;
  else s = s.replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, " ");

  s = s
    .replace(/<\/?(h[1-6])\b[^>]*>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<(br|\/p|\/div|\/tr|\/section|\/ul|\/ol|\/table)\b[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ");

  let out = decodeEntities(s)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Wikipedia: skip the language list and toolbars above the article
  const wiki = out.indexOf("From Wikipedia, the free encyclopedia");
  if (wiki > 0) out = out.slice(wiki);
  return out;
}

async function fetchLocally(url: string, maxChars: number): Promise<PageText> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { url, error: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("pdf")) return { url, error: "PDF (not readable without Tavily Extract)" };
    const raw = await res.text();
    const text = type.includes("html") || raw.trimStart().startsWith("<") ? htmlToText(raw) : raw;
    if (text.length < 200) return { url, error: "Page has almost no readable text (likely rendered by JavaScript)" };
    return { url, text: text.slice(0, maxChars) };
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : String(err) };
  }
}

// Extract several pages at once. Uses Tavily Extract in batches of 20, then local fetch for any it missed.
export async function extractPages(urls: string[], maxChars: number): Promise<PageText[]> {
  const unique = Array.from(new Set(urls));
  const got = new Map<string, PageText>();
  const apiKey = process.env.TAVILY_API_KEY;

  if (apiKey) {
    for (let i = 0; i < unique.length; i += 20) {
      const batch = unique.slice(i, i + 20);
      try {
        const res = await fetch(TAVILY_EXTRACT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ urls: batch, extract_depth: "advanced", format: "markdown" }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        for (const r of (data.results ?? []) as { url: string; raw_content?: string }[]) {
          const text = (r.raw_content ?? "").trim();
          if (text.length >= 200) got.set(r.url, { url: r.url, text: text.slice(0, maxChars) });
        }
      } catch {
        // fall through to local fetch
      }
    }
  }

  const missing = unique.filter((u) => !got.has(u));
  const local = await Promise.all(missing.map((u) => fetchLocally(u, maxChars)));
  for (const p of local) got.set(p.url, p);

  return unique.map((u) => got.get(u) ?? { url: u, error: "Not extracted" });
}

export async function extractPage(url: string, maxChars: number): Promise<PageText> {
  return (await extractPages([url], maxChars))[0];
}
