"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnalysisReport } from "@/components/AnalysisReport";
import { CountyReport as CountyReportView } from "@/components/CountyReport";
import { PrintButton, CopyLinkButton } from "@/components/SharedPageActions";
import type { VendorReport, CountyReport } from "@/lib/types";
import type { SharedReport } from "@/lib/share-store";

interface Props {
  params: { id: string };
}

export default function SharePage({ params }: Props) {
  const [state, setState] = useState<"loading" | "found" | "notfound" | "error">("loading");
  const [shared, setShared] = useState<SharedReport | null>(null);

  useEffect(() => {
    fetch(`/api/share/${params.id}`)
      .then(async (res) => {
        if (res.status === 404) { setState("notfound"); return; }
        if (!res.ok) { setState("error"); return; }
        const data = await res.json();
        setShared(data);
        setState("found");
      })
      .catch(() => setState("error"));
  }, [params.id]);

  if (state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          Loading shared report…
        </div>
      </main>
    );
  }

  if (state === "notfound") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-5xl">🔗</p>
          <h1 className="text-2xl font-bold text-white">Report not found</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            This shared report link has expired or is invalid. Shared reports are stored for 30 days
            when Redis is configured, or until the server restarts otherwise.
          </p>
          <Link href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-colors">
            Analyze your own →
          </Link>
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-red-300">Failed to load report</h1>
          <button onClick={() => { setState("loading"); window.location.reload(); }}
            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors">
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!shared) return null;

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
              Shared Report —{" "}
              {shared.type === "vendor" ? "Vendor Analysis" : "County Education Data"}
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
            <CopyLinkButton path={`/share/${params.id}`} />
            <PrintButton />
            <Link href="/"
              className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 text-sm hover:bg-slate-600 transition-colors">
              Analyze your own →
            </Link>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print-only space-y-1">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-slate-400 text-sm">
            Education Data Investigator · Shared report ·{" "}
            {new Date(shared.createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        {/* Report */}
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
