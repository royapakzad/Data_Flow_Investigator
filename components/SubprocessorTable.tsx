import type { VendorReport, Subprocessor, Citation } from "@/lib/types";
import { clsx } from "clsx";

const CATEGORY_COLORS: Record<Subprocessor["category"], string> = {
  analytics:      "bg-red-100 text-red-700",
  ads:            "bg-orange-100 text-orange-700",
  infrastructure: "bg-purple-100 text-purple-700",
  payments:       "bg-green-100 text-green-700",
  auth:           "bg-yellow-100 text-yellow-700",
  support:        "bg-blue-100 text-blue-700",
  "ai-ml":        "bg-pink-100 text-pink-700",
  video:          "bg-cyan-100 text-cyan-700",
  communication:  "bg-teal-100 text-teal-700",
  other:          "bg-slate-100 text-slate-700",
};

const SOURCE_BADGE: Record<Subprocessor["source"], string> = {
  declared: "bg-slate-100 text-slate-700",
  detected: "bg-red-100 text-red-700",
  inferred: "bg-yellow-100 text-yellow-700",
};

// Match a subprocessor's privacyUrl to a citation
function matchCitation(url: string | undefined, citations: Citation[]): Citation | undefined {
  if (!url || !citations?.length) return undefined;
  let urlHost = "";
  try { urlHost = new URL(url).hostname.replace(/^www\./, ""); } catch { return undefined; }

  for (const c of citations) {
    try {
      if (c.url === url) return c;
      const cHost = new URL(c.url).hostname.replace(/^www\./, "");
      if (cHost === urlHost) return c;
    } catch { /* skip */ }
  }
  return undefined;
}

interface Props {
  report: VendorReport;
  citations?: Citation[];
}

export function SubprocessorTable({ report, citations = [] }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-medium text-slate-500">Vendor</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Purpose</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Category</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Data Types</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Disclosed In</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Source</th>
          </tr>
        </thead>
        <tbody>
          {report.subprocessors.map((s, i) => {
            const cite = matchCitation(s.privacyUrl, citations);
            return (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-1 flex-wrap">
                    {s.privacyUrl ? (
                      <a
                        href={s.privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 underline underline-offset-2"
                      >
                        {s.name}
                      </a>
                    ) : (
                      s.name
                    )}
                    {cite && (
                      <a
                        href={`#citation-${cite.number}`}
                        title={`${cite.label}: ${cite.context}`}
                        className="group relative"
                      >
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-300 px-1 py-0.5 rounded hover:bg-blue-100 transition-colors leading-none">
                          [{cite.number}]
                        </span>
                        <span className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col w-60 bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 z-50 shadow-2xl gap-1">
                          <span className="font-semibold text-blue-700 truncate">{cite.label}</span>
                          <span className="text-slate-500 leading-relaxed">{cite.context}</span>
                        </span>
                      </a>
                    )}
                    {s.country && (
                      <span className="text-xs text-slate-500">{s.country}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{s.purpose}</td>
                <td className="px-4 py-3">
                  <span className={clsx("px-2 py-0.5 rounded text-xs", CATEGORY_COLORS[s.category])}>
                    {s.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {s.dataTypes.join(", ")}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {s.disclosedIn ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx("px-2 py-0.5 rounded text-xs", SOURCE_BADGE[s.source])}>
                    {s.source}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
