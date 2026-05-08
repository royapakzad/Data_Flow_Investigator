import { NextRequest } from "next/server";
import type { RedditPost } from "@/lib/types";

export const runtime = "nodejs";

// Subreddits most relevant to early childhood education and edtech privacy
const ECE_SUBREDDITS = [
  "ECEProfessionals",
  "preschool",
  "childcare",
  "Teachers",
  "education",
  "EdTech",
  "Parenting",
  "teaching",
  "privacy",
  "k12sysadmin",
].join("+");

interface RawPost {
  data: {
    id: string;
    title: string;
    subreddit: string;
    permalink: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    link_flair_text: string | null;
    selftext: string;
    url: string;
    is_self: boolean;
  };
}

function parsePost(raw: RawPost): RedditPost {
  const d = raw.data;
  return {
    id: d.id,
    title: d.title,
    subreddit: d.subreddit,
    permalink: `https://www.reddit.com${d.permalink}`,
    author: d.author,
    score: d.score,
    numComments: d.num_comments,
    createdUtc: d.created_utc,
    flair: d.link_flair_text,
    preview: d.is_self && d.selftext
      ? d.selftext.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").slice(0, 220).trim() || null
      : null,
  };
}

async function searchReddit(url: string): Promise<RedditPost[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "VendorPrivacyAuditBot/1.0 (educational research tool; contact: privacy-audit-bot)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const children: RawPost[] = json?.data?.children ?? [];
  return children
    .filter((c) => c.data && c.data.author !== "[deleted]" && c.data.title)
    .map(parsePost);
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) return Response.json({ error: "q required" }, { status: 400 });

  const encoded = encodeURIComponent(query);

  // Run two searches in parallel:
  // 1. Targeted ECE/education subreddits
  // 2. Broader Reddit search for privacy/app mentions
  const [eceResults, broadResults] = await Promise.allSettled([
    searchReddit(
      `https://www.reddit.com/r/${ECE_SUBREDDITS}/search.json?q=${encoded}&restrict_sr=1&sort=relevance&limit=25&type=link`
    ),
    searchReddit(
      `https://www.reddit.com/search.json?q=${encoded}+app+privacy&sort=relevance&limit=25&type=link`
    ),
  ]);

  const seen = new Set<string>();
  const posts: RedditPost[] = [];

  // ECE subreddit results first (higher priority)
  const eceList = eceResults.status === "fulfilled" ? eceResults.value : [];
  for (const p of eceList) {
    if (!seen.has(p.id)) { seen.add(p.id); posts.push(p); }
  }

  // Then broader results, deduped
  const broadList = broadResults.status === "fulfilled" ? broadResults.value : [];
  for (const p of broadList) {
    if (!seen.has(p.id)) { seen.add(p.id); posts.push(p); }
  }

  // Sort: ECE subreddits first, then by score descending
  const ECE_SET = new Set(ECE_SUBREDDITS.toLowerCase().split("+"));
  posts.sort((a, b) => {
    const aEce = ECE_SET.has(a.subreddit.toLowerCase()) ? 1 : 0;
    const bEce = ECE_SET.has(b.subreddit.toLowerCase()) ? 1 : 0;
    if (bEce !== aEce) return bEce - aEce;
    return b.score - a.score;
  });

  return Response.json({ posts: posts.slice(0, 20) });
}
