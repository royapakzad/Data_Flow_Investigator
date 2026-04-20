const ITUNES_API = "https://itunes.apple.com/search";

export interface AppStoreResult {
  found: boolean;
  appName?: string;
  developer?: string;
  privacyUrl?: string;
  storeUrl?: string;
  description?: string;
  genres?: string[];
}

export async function lookupAppStore(appName: string): Promise<AppStoreResult> {
  try {
    const url = `${ITUNES_API}?term=${encodeURIComponent(appName)}&entity=software&limit=3`;
    const res = await fetch(url);
    if (!res.ok) return { found: false };

    const data = await res.json();
    const results = data.results ?? [];
    if (results.length === 0) return { found: false };

    const app = results[0];
    return {
      found: true,
      appName: app.trackName,
      developer: app.artistName,
      privacyUrl: app.privacyPolicyUrl,
      storeUrl: app.trackViewUrl,
      description: app.description?.slice(0, 500),
      genres: app.genres,
    };
  } catch {
    return { found: false };
  }
}
