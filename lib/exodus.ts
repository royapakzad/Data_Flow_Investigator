const EXODUS_BASE = "https://reports.exodus-privacy.eu.org/api";

export interface ExodusReport {
  found: boolean;
  appHandle?: string;
  trackers: { name: string; category: string; website: string }[];
  permissions: string[];
  reportUrl?: string;
}

export async function lookupExodus(appName: string): Promise<ExodusReport> {
  try {
    const searchRes = await fetch(
      `${EXODUS_BASE}/search/${encodeURIComponent(appName)}/`,
      { headers: { Accept: "application/json" } }
    );

    if (!searchRes.ok) return { found: false, trackers: [], permissions: [] };
    const searchData = await searchRes.json();

    const apps: { handle: string }[] = searchData.results ?? [];
    if (apps.length === 0) return { found: false, trackers: [], permissions: [] };

    const handle = apps[0].handle;
    const reportRes = await fetch(
      `${EXODUS_BASE}/applications/${handle}/reports/latest/`,
      { headers: { Accept: "application/json" } }
    );

    if (!reportRes.ok) return { found: false, trackers: [], permissions: [] };
    const report = await reportRes.json();

    const trackers = (report.trackers ?? []).map((t: { name: string; category: string; website: string }) => ({
      name: t.name,
      category: t.category ?? "unknown",
      website: t.website ?? "",
    }));

    return {
      found: true,
      appHandle: handle,
      trackers,
      permissions: report.permissions ?? [],
      reportUrl: `https://reports.exodus-privacy.eu.org/en/reports/${report.id}/`,
    };
  } catch {
    return { found: false, trackers: [], permissions: [] };
  }
}
