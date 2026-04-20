import type { VendorReport } from "@/lib/types";
import { clsx } from "clsx";

const SEVERITY_STYLES = {
  high: "bg-red-500/10 border-red-500/30 text-red-300",
  medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  low: "bg-slate-700/50 border-slate-600 text-slate-300",
};

const SEVERITY_BADGE = {
  high: "bg-red-500/20 text-red-300",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-slate-600 text-slate-300",
};

export function DiscrepancyList({ report }: { report: VendorReport }) {
  if (report.discrepancies.length === 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-300 text-sm">
        No discrepancies detected between declared and identified data practices.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {report.discrepancies.map((d, i) => (
        <div
          key={i}
          className={clsx("rounded-xl border p-4", SEVERITY_STYLES[d.severity])}
        >
          <div className="flex items-start gap-3">
            <span
              className={clsx(
                "mt-0.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide shrink-0",
                SEVERITY_BADGE[d.severity]
              )}
            >
              {d.severity}
            </span>
            <div className="space-y-1">
              <p className="text-sm">{d.description}</p>
              {(d.declaredIn || d.detectedBy) && (
                <p className="text-xs opacity-70">
                  {d.declaredIn && `Declared in: ${d.declaredIn}`}
                  {d.declaredIn && d.detectedBy && " · "}
                  {d.detectedBy && `Detected by: ${d.detectedBy}`}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
