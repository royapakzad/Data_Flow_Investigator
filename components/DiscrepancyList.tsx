import type { VendorReport } from "@/lib/types";
import { clsx } from "clsx";

const SEVERITY_STYLES = {
  high: "bg-red-50 border-red-200 text-red-800",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
  low: "bg-slate-50 border-slate-200 text-slate-700",
};

const SEVERITY_BADGE = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-slate-200 text-slate-700",
};

export function DiscrepancyList({ report }: { report: VendorReport }) {
  if (report.discrepancies.length === 0) {
    return (
      <p className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-500 text-sm">
        No gaps found between what the vendor discloses and what was detected. Automated checks can&apos;t see network traffic, so this isn&apos;t a clean bill of health.
      </p>
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
