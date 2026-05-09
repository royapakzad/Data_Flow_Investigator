import { braveSearch } from "./brave-search";

export interface AppMicroscopeResult {
  found: boolean;
  pageUrl: string | null;
  riskTier: string | null;    // "Critical Risk" | "High Risk" | "Medium Risk" | "Some Risk" | "Not Scored"
  privacyRisks: string[];     // extracted risk categories from page text
  searchSnippet: string | null;
  rawPageText: string | null; // first 4000 chars of static HTML text (site is JS-rendered so usually sparse)
}

const ISL_ORIGIN = "https://appmicroscope.org";
const RISK_TIERS = ["Critical Risk", "High Risk", "Medium Risk", "Some Risk", "Not Scored"];

// Common privacy risk category keywords App Microscope uses in their labels
const RISK_CATEGORIES = [
  "Data Monetization",
  "Third-Party Sharing",
  "Location Tracking",
  "Behavioral Profiling",
  "Persistent Identifiers",
  "Ad Networks",
  "Analytics SDKs",
  "Excessive Permissions",
];

function extractRiskTier(text: string): string | null {
  for (const tier of RISK_TIERS) {
    if (text.toLowerCase().includes(tier.toLowerCase())) return tier;
  }
  return null;
}

function extractRiskCategories(text: string): string[] {
  return RISK_CATEGORIES.filter(cat =>
    text.toLowerCase().includes(cat.toLowerCase())
  );
}

function isAppPage(url: string): boolean {
  // Exclude the homepage, /help, /api, etc. — only keep app-specific pages
  if (url === ISL_ORIGIN || url === ISL_ORIGIN + "/") return false;
  try {
    const path = new URL(url).pathname;
    return path.length > 1;
  } catch {
    return url.length > ISL_ORIGIN.length + 1;
  }
}

export async function lookupAppMicroscope(appName: string): Promise<AppMicroscopeResult> {
  const empty: AppMicroscopeResult = {
    found: false,
    pageUrl: null,
    riskTier: null,
    privacyRisks: [],
    searchSnippet: null,
    rawPageText: null,
  };

  // 1. Targeted site search
  let results = await braveSearch(`site:appmicroscope.org "${appName}"`, 5);
  let match = results.find(r => r.url.startsWith(ISL_ORIGIN) && isAppPage(r.url));

  // 2. Fallback: broader search without quotes
  if (!match) {
    results = await braveSearch(`site:appmicroscope.org ${appName} safety label`, 5);
    match = results.find(r => r.url.startsWith(ISL_ORIGIN) && isAppPage(r.url));
  }

  // 3. Last resort: general App Microscope search
  if (!match) {
    results = await braveSearch(`appmicroscope.org ${appName} privacy risk`, 5);
    match = results.find(r => r.url.startsWith(ISL_ORIGIN) && isAppPage(r.url));
  }

  if (!match) return empty;

  const snippetText = `${match.title} ${match.description}`;
  const riskTier = extractRiskTier(snippetText);
  const privacyRisks = extractRiskCategories(snippetText);

  // 4. Try to fetch the page for additional data (site is JS-rendered; static HTML is sparse)
  let rawPageText: string | null = null;
  try {
    const res = await fetch(match.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VendorAuditBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const html = await res.text();
      const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      rawPageText = text.slice(0, 4000);
      // Try to extract risk tier and categories from page text too
      const pageRiskTier = extractRiskTier(text);
      const pageRisks = extractRiskCategories(text);
      return {
        found: true,
        pageUrl: match.url,
        riskTier: pageRiskTier ?? riskTier,
        privacyRisks: Array.from(new Set([...privacyRisks, ...pageRisks])),
        searchSnippet: snippetText.trim(),
        rawPageText,
      };
    }
  } catch {
    // page fetch failed — snippet-only result is still useful
  }

  return {
    found: true,
    pageUrl: match.url,
    riskTier,
    privacyRisks,
    searchSnippet: snippetText.trim(),
    rawPageText: null,
  };
}
