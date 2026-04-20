import type { VendorReport, Subprocessor } from "@/lib/types";
import { clsx } from "clsx";

const CATEGORY_COLORS: Record<Subprocessor["category"], string> = {
  analytics: "bg-red-500/20 text-red-300",
  ads: "bg-orange-500/20 text-orange-300",
  infrastructure: "bg-purple-500/20 text-purple-300",
  payments: "bg-green-500/20 text-green-300",
  auth: "bg-yellow-500/20 text-yellow-300",
  support: "bg-blue-500/20 text-blue-300",
  other: "bg-slate-600/50 text-slate-300",
};

const SOURCE_BADGE: Record<Subprocessor["source"], string> = {
  declared: "bg-slate-700 text-slate-300",
  detected: "bg-red-500/20 text-red-300",
  inferred: "bg-yellow-500/20 text-yellow-300",
};

export function SubprocessorTable({ report }: { report: VendorReport }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50">
            <th className="px-4 py-3 text-left font-medium text-slate-400">Vendor</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Purpose</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Category</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Data Types</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Source</th>
          </tr>
        </thead>
        <tbody>
          {report.subprocessors.map((s, i) => (
            <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/30">
              <td className="px-4 py-3 font-medium text-slate-200">
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
                {s.country && (
                  <span className="ml-2 text-xs text-slate-500">{s.country}</span>
                )}
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
              <td className="px-4 py-3">
                <span className={clsx("px-2 py-0.5 rounded text-xs", SOURCE_BADGE[s.source])}>
                  {s.source}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
