import { notFound } from "next/navigation";
import Link from "next/link";
import { getSharedReport } from "@/lib/share-store";
import { AnalysisReport } from "@/components/AnalysisReport";
import { CountyReport as CountyReportView } from "@/components/CountyReport";
import { PrintButton, CopyLinkButton } from "@/components/SharedPageActions";
import type { VendorReport, CountyReport } from "@/lib/types";

interface Props {
  params: { id: string };
}

export default async function SharePage({ params }: Props) {
  const shared = await getSharedReport(params.id);
  if (!shared) notFound();

  const sharePath = `/share/${params.id}`;

  const title =
    shared.type === "vendor"
      ? (shared.report as VendorReport).vendorName
      : `${(shared.report as CountyReport).countyName} County, ${(shared.report as CountyReport).stateAbbr}`;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Shared report banner */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700 no-print flex-wrap">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-300">
              Shared Report — {shared.type === "vendor" ? "Vendor Analysis" : "County Education Data"}
            </p>
            <p className="text-xs text-slate-500">
              Generated{" "}
              {new Date(shared.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
              {" · "}
              Links expire after 30 days
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CopyLinkButton path={sharePath} />
            <PrintButton />
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
            >
              Analyze your own →
            </Link>
          </div>
        </div>

        {/* Print header (only visible when printing) */}
        <div className="hidden print-only">
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          <p className="text-slate-400 text-sm">
            Education Data Investigator · Shared report ·{" "}
            {new Date(shared.createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        {/* Report content */}
        <div id="print-report">
          {shared.type === "vendor" ? (
            <AnalysisReport report={shared.report as VendorReport} />
          ) : (
            <CountyReportView report={shared.report as CountyReport} />
          )}
        </div>

      </div>
    </main>
  );
}
