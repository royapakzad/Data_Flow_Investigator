"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { VendorReport, CountyReport } from "@/lib/types";
import type { CountyInfo } from "@/components/USCountyMap";
import { AnalysisReport } from "@/components/AnalysisReport";
import { CountyReport as CountyReportView } from "@/components/CountyReport";
import { ReportActions } from "@/components/ReportActions";

// react-simple-maps uses browser SVG APIs — load client-side only
const USCountyMap = dynamic(
  () => import("@/components/USCountyMap").then((m) => ({ default: m.USCountyMap })),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center"
      style={{ height: 420 }}>
      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-slate-400 animate-spin" />
        Loading map…
      </div>
    </div>
  );
}

type AppMode = "vendor" | "county";

const VENDOR_EXAMPLES = ["ClassDojo", "Seesaw", "Remind", "Canvas LMS", "Duolingo"];

// ── Vendor Analyzer tab ───────────────────────────────────────────────────────

function VendorAnalyzer() {
  const [vendorName, setVendorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [report, setReport] = useState<VendorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function analyze(name: string) {
    if (!name.trim()) return;
    setLoading(true);
    setReport(null);
    setError(null);
    setProgressLog([]);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);

      if (data.status === "done") {
        if (data.progress?.length) setProgressLog(data.progress);
        setReport(data.report);
        setLoading(false);
        return;
      }
      if (data.status === "error") throw new Error(data.error ?? "Unknown error");

      const { id } = data;
      if (!id) throw new Error("Unexpected server response");

      pollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/analyze/${id}`);
          if (!poll.ok) return;
          const job = await poll.json();
          if (job.progress?.length) setProgressLog(job.progress);
          if (job.status === "done") {
            clearInterval(pollRef.current!);
            setReport(job.report);
            setLoading(false);
          } else if (job.status === "error") {
            clearInterval(pollRef.current!);
            setError(job.error ?? "Unknown error");
            setLoading(false);
          }
        } catch { /* retry next tick */ }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-slate-400 max-w-2xl leading-relaxed no-print">
        Enter an edtech vendor or app name. The AI agent investigates their privacy policy,
        subprocessor chain, detected trackers, and company ownership — so you can ask the right
        questions before signing a contract.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); analyze(vendorName); }} className="space-y-3 no-print">
        <div className="flex gap-3">
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="e.g. ClassDojo, Seesaw, Remind…"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
          />
          {loading ? (
            <button type="button" onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setLoading(false); }}
              className="px-5 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors">
              Cancel
            </button>
          ) : (
            <button type="submit" disabled={!vendorName.trim()}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Analyze
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {VENDOR_EXAMPLES.map((ex) => (
            <button key={ex} type="button" disabled={loading}
              onClick={() => { setVendorName(ex); analyze(ex); }}
              className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:border-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </form>

      {loading && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-slate-300 text-sm font-medium">Agent is investigating…</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {progressLog.map((msg, i) => (
              <p key={i} className="text-xs text-slate-500 font-mono">
                <span className="text-slate-600 mr-2">{String(i + 1).padStart(2, "0")}</span>
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm space-y-3 no-print">
          <p className="text-red-300"><strong>Error:</strong> {error}</p>
          <button onClick={() => analyze(vendorName)}
            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors">
            Retry
          </button>
        </div>
      )}

      {report && (
        <div className="border-t border-slate-700 pt-10 space-y-6">
          <ReportActions type="vendor" report={report} />
          <AnalysisReport report={report} />
        </div>
      )}

      {!loading && !report && (
        <p className="text-center text-xs text-slate-600 max-w-xl mx-auto">
          Automated analysis of public disclosures. Does not perform dynamic traffic interception or
          legal interpretation of data processing agreements. Verify findings before procurement decisions.
        </p>
      )}
    </div>
  );
}

// ── County Education Data tab ─────────────────────────────────────────────────

function CountyExplorer() {
  const [selectedCounty, setSelectedCounty] = useState<CountyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [report, setReport] = useState<CountyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function investigateCounty(county: CountyInfo) {
    setSelectedCounty(county);
    setLoading(true);
    setReport(null);
    setError(null);
    setProgressLog([]);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await fetch("/api/county", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countyName: county.name,
          stateName: county.stateName,
          stateAbbr: county.stateAbbr,
          fipsCode: county.fips,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);

      if (data.status === "done") {
        if (data.progress?.length) setProgressLog(data.progress);
        setReport(data.report);
        setLoading(false);
        return;
      }
      if (data.status === "error") throw new Error(data.error ?? "Unknown error");

      const { id } = data;
      if (!id) throw new Error("Unexpected server response");

      pollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/county/${id}`);
          if (!poll.ok) return;
          const job = await poll.json();
          if (job.progress?.length) setProgressLog(job.progress);
          if (job.status === "done") {
            clearInterval(pollRef.current!);
            setReport(job.report);
            setLoading(false);
          } else if (job.status === "error") {
            clearInterval(pollRef.current!);
            setError(job.error ?? "Unknown error");
            setLoading(false);
          }
        } catch { /* retry next tick */ }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-400 max-w-2xl leading-relaxed no-print">
        Click any county on the map to investigate its public education data integration ecosystem —
        from preschool through K-12 — including state longitudinal data systems, early childhood
        integrated data systems, kindergarten entry assessments, cross-sector data linkages, and
        the vendors and laws that govern how student data flows.
      </p>

      <USCountyMap
        onCountySelect={investigateCounty}
        selectedFips={selectedCounty?.fips}
        loading={loading}
      />

      {selectedCounty && !report && (
        <div className="text-center text-xs text-slate-500 no-print">
          Selected: <span className="text-slate-300 font-medium">{selectedCounty.name} County, {selectedCounty.stateName}</span>
          {loading && " · Investigating…"}
        </div>
      )}

      {loading && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-slate-300 text-sm font-medium">
              Investigating {selectedCounty?.name} County, {selectedCounty?.stateName}…
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {progressLog.map((msg, i) => (
              <p key={i} className="text-xs text-slate-500 font-mono">
                <span className="text-slate-600 mr-2">{String(i + 1).padStart(2, "0")}</span>
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm space-y-3 no-print">
          <p className="text-red-300"><strong>Error:</strong> {error}</p>
          {selectedCounty && (
            <button onClick={() => investigateCounty(selectedCounty)}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors">
              Retry
            </button>
          )}
        </div>
      )}

      {report && (
        <div className="border-t border-slate-700 pt-10 space-y-6">
          <ReportActions type="county" report={report} />
          <CountyReportView report={report} />
        </div>
      )}

      {!loading && !selectedCounty && (
        <p className="text-center text-xs text-slate-600 max-w-2xl mx-auto">
          Research is based on publicly available government sources and official state documentation.
          County-level specifics may be limited — most education data systems are administered at the
          state level. Findings should be verified with your state Department of Education.
        </p>
      )}
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [mode, setMode] = useState<AppMode>("vendor");

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3 no-print">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-2">
            AI-powered · For schools, districts, and advocates
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Education Data Investigator
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Two tools for understanding how student data moves through the education system —
            and who controls it.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700 max-w-xl mx-auto no-print">
          <button
            onClick={() => setMode("vendor")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              mode === "vendor"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            🔍 Vendor Analyzer
          </button>
          <button
            onClick={() => setMode("county")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              mode === "county"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            🗺 County Education Data
          </button>
        </div>

        {/* Mode descriptions */}
        <div className="space-y-1 text-center -mt-4 no-print">
          {mode === "vendor" && (
            <p className="text-xs text-slate-600">
              Analyze a specific edtech app's data flows, subprocessors, and ownership
            </p>
          )}
          {mode === "county" && (
            <p className="text-xs text-slate-600">
              Map public education data infrastructure — SLDS, ECIDS, KEA, cross-sector linkages — by county
            </p>
          )}
        </div>

        {/* Active mode */}
        <div>
          {mode === "vendor" && <VendorAnalyzer />}
          {mode === "county" && <CountyExplorer />}
        </div>

      </div>
    </main>
  );
}
