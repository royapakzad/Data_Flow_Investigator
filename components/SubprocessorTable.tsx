import type { VendorReport, Subprocessor, Citation } from "@/lib/types";
import { clsx } from "clsx";

const CATEGORY_COLORS: Record<Subprocessor["category"], string> = {
  analytics:      "bg-red-500/20 text-red-300",
  ads:            "bg-orange-500/20 text-orange-300",
  infrastructure: "bg-purple-500/20 text-purple-300",
  payments:       "bg-green-500/20 text-green-300",
  auth:           "bg-yellow-500/20 text-yellow-300",
  support:        "bg-blue-500/20 text-blue-300",
  "ai-ml":        "bg-pink-500/20 text-pink-300",
  video:          "bg-cyan-500/20 text-cyan-300",
  communication:  "bg-teal-500/20 text-teal-300",
  other:          "bg-slate-600/50 text-slate-300",
};

const SOURCE_BADGE: Record<Subprocessor["source"], string> = {
  declared: "bg-slate-700 text-slate-300",
  detected: "bg-red-500/20 text-red-300",
  inferred: "bg-yellow-500/20 text-yellow-300",
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
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50">
            <th className="px-4 py-3 text-left font-medium text-slate-400">Vendor</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Purpose</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Category</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Data Types</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Disclosed In</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Source</th>
          </tr>
        </thead>
        <tbody>
          {report.subprocessors.map((s, i) => {
            const cite = matchCitation(s.privacyUrl, citations);
            return (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium text-slate-200">
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
                    {/* inline citation badge if we matched one */}
                    {cite && (
                      <a
                        href={`#citation-${cite.number}`}
                        title={`${cite.label}: ${cite.context}`}
                        className="group relative"
                      >
                        <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1 py-0.5 rounded hover:bg-blue-500/30 transition-colors leading-none">
                          [{cite.number}]
                        </span>
                        <span className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col w-60 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 z-50 shadow-2xl gap-1">
                          <span className="font-semibold text-blue-300 truncate">{cite.label}</span>
                          <span className="text-slate-400 leading-relaxed">{cite.context}</span>
                        </span>
                      </a>
                    )}
                    {s.country && (
                      <span className="text-xs text-slate-500">{s.country}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{s.purpose}</td>
                <td className="px-4 py-3">
                  <span className={clsx("px-2 py-0.5 rounded text-xs", CATEGORY_COLORS[s.category])}>
                    {s.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {s.dataTypes.join(", ")}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {s.disclosedIn ?? <span className="text-slate-600">—</span>}
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
