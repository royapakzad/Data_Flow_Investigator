import type { VendorReport } from "@/lib/types";
import { clsx } from "clsx";

const RISK_COLORS = {
  elevated: "bg-red-500/20 text-red-300 border-red-500/30",
  standard: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "low-concern": "bg-green-500/20 text-green-300 border-green-500/30",
};

export function MetricCards({ report }: { report: VendorReport }) {
  const { summary, riskLevel } = report;

  const cards = [
    {
      label: "Direct Subprocessors",
      value: summary.directSubprocessors,
      sub: "vendors with data access",
      color: "text-blue-400",
    },
    {
      label: "Est. Downstream Vendors",
      value: `~${summary.estimatedDownstreamVendors}`,
      sub: "transitive data recipients",
      color: "text-purple-400",
    },
    {
      label: "Detected Trackers",
      value: summary.detectedTrackers,
      sub: "found via Exodus Privacy",
      color: summary.detectedTrackers > 0 ? "text-red-400" : "text-green-400",
    },
    {
      label: "Discrepancies Flagged",
      value: summary.discrepanciesFound,
      sub: "declared vs. detected gaps",
      color: summary.discrepanciesFound > 0 ? "text-orange-400" : "text-green-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "px-3 py-1 rounded-full text-sm font-medium border",
            RISK_COLORS[riskLevel]
          )}
        >
          {riskLevel === "elevated" ? "Elevated Concern" : riskLevel === "standard" ? "Standard" : "Low Concern"}
        </span>
        <span className="text-slate-400 text-sm">
          Analysis date: {new Date(report.analysisDate).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className={clsx("text-3xl font-bold tabular-nums", c.color)}>
              {c.value}
            </div>
            <div className="text-sm font-medium text-slate-200 mt-1">{c.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
