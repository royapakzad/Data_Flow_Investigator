"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { VendorReport, CountyReport } from "@/lib/types";
import type { CountyInfo } from "@/components/USCountyMap";
import { AnalysisReport } from "@/components/AnalysisReport";
import { CountyReport as CountyReportView } from "@/components/CountyReport";
import { ReportActions } from "@/components/ReportActions";

// ── Progress panel ────────────────────────────────────────────────────────────

const ESTIMATED_STEPS = { vendor: 30, county: 28 };

function ProgressPanel({
  log,
  mode,
  onCancel,
}: {
  log: string[];
  mode: "vendor" | "county";
  onCancel: () => void;
}) {
  const total = ESTIMATED_STEPS[mode];
  // Extract step number from messages like "[12] Searching: ..."
  const lastNumbered = [...log].reverse().find((m) => m.match(/^\[(\d+)\]/));
  const current = lastNumbered ? parseInt(lastNumbered.match(/^\[(\d+)\]/)![1]) : 0;
  const pct = Math.min(95, Math.round((current / total) * 100));
  const isCompiling = log[log.length - 1] === "Compiling final report…";
  const currentLabel = log[log.length - 1] ?? "Initializing…";
  // Strip the [N] prefix for display
  const displayLabel = currentLabel.replace(/^\[\d+\]\s*/, "");
  // Last 4 completed steps (excluding current)
  const history = log.slice(-5, -1).reverse();

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4 no-print">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
          <span className="text-slate-200 text-sm font-semibold">
            {isCompiling ? "Compiling report…" : "Agent is investigating"}
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>{isCompiling ? "Generating JSON output…" : `Step ${current} of ~${total}`}</span>
          <span>{isCompiling ? "95%" : `${pct}%`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-700"
            style={{ width: `${isCompiling ? 95 : pct}%` }}
          />
        </div>
      </div>

      {/* Current step */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Current</p>
        <p className="text-slate-200 text-sm leading-snug font-mono break-all">{displayLabel}</p>
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="space-y-1">
          {history.map((msg, i) => (
            <p key={i} className="text-[11px] text-slate-600 font-mono truncate pl-1">
              {msg.replace(/^\[\d+\]\s*/, "")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

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

const MAX_AUTO_RETRIES = 2;

function VendorAnalyzer() {
  const [vendorName, setVendorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [report, setReport] = useState<VendorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  function cancel() {
    cancelledRef.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    setLoading(false);
  }

  async function analyze(name: string, attemptNum = 1) {
    if (!name.trim()) return;
    cancelledRef.current = false;
    setLoading(true);
    setReport(null);
    setError(null);
    setAttempt(attemptNum);
    if (attemptNum === 1) setProgressLog([]);
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
        if (cancelledRef.current) return;
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
            throw new Error(job.error ?? "Unknown error");
          }
        } catch (pollErr) {
          clearInterval(pollRef.current!);
          const msg = pollErr instanceof Error ? pollErr.message : "Unknown error";
          if (!cancelledRef.current && attemptNum <= MAX_AUTO_RETRIES) {
            setProgressLog((prev) => [...prev, `Retrying (attempt ${attemptNum + 1})…`]);
            await analyze(name, attemptNum + 1);
          } else {
            setError(msg);
            setLoading(false);
          }
        }
      }, 1000);
    } catch (err) {
      if (cancelledRef.current) return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (attemptNum <= MAX_AUTO_RETRIES) {
        setProgressLog((prev) => [...prev, `Network error — retrying (attempt ${attemptNum + 1})…`]);
        await new Promise((r) => setTimeout(r, 2000 * attemptNum));
        return analyze(name, attemptNum + 1);
      }
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
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
          <button type="submit" disabled={loading || !vendorName.trim()}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Analyze
          </button>
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
        <ProgressPanel
          log={progressLog}
          mode="vendor"
          onCancel={cancel}
        />
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm space-y-3 no-print">
          <p className="text-red-300">
            <strong>Error after {attempt} attempt{attempt > 1 ? "s" : ""}:</strong> {error}
          </p>
          <button onClick={() => analyze(vendorName)}
            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors">
            Try again
          </button>
        </div>
      )}

      {report && (
        <div className="border-t border-slate-700 pt-10 space-y-6">
          <ReportActions type="vendor" report={report} />
          <AnalysisReport report={report} />
        </div>
      )}

      {!loading && !report && !error && (
        <p className="text-center text-xs text-slate-600 max-w-xl mx-auto">
          Automated analysis of public disclosures. Does not perform dynamic traffic interception or
          legal interpretation of data processing agreements. Verify findings before procurement decisions.
        </p>
      )}
    </div>
  );
}

// ── County text-search helpers ────────────────────────────────────────────────

const STATE_BY_ABBR: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",
  LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
  MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",
  NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",
  OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",
  WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};
const STATE_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_BY_ABBR).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

function parseCountySearch(raw: string): CountyInfo | null {
  const comma = raw.lastIndexOf(",");
  if (comma === -1) return null;
  const countyName = raw.slice(0, comma).trim().replace(/\s+county$/i, "").trim();
  const statePart = raw.slice(comma + 1).trim();
  if (!countyName || !statePart) return null;

  const upper = statePart.toUpperCase();
  if (STATE_BY_ABBR[upper]) {
    return { name: countyName, stateName: STATE_BY_ABBR[upper], stateAbbr: upper, fips: "" };
  }
  const abbr = STATE_BY_NAME[statePart.toLowerCase()];
  if (abbr) {
    return { name: countyName, stateName: statePart, stateAbbr: abbr, fips: "" };
  }
  return null;
}

// ── County Education Data tab ─────────────────────────────────────────────────

function CountyExplorer() {
  const [selectedCounty, setSelectedCounty] = useState<CountyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [report, setReport] = useState<CountyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  function cancel() {
    cancelledRef.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    const county = parseCountySearch(searchInput);
    if (!county) {
      setSearchError('Enter "County Name, State" — e.g. Travis County, TX');
      return;
    }
    setSearchInput("");
    investigateCounty(county);
  }

  async function investigateCounty(county: CountyInfo, attemptNum = 1) {
    cancelledRef.current = false;
    setSelectedCounty(county);
    setLoading(true);
    setReport(null);
    setError(null);
    setAttempt(attemptNum);
    if (attemptNum === 1) setProgressLog([]);
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
        if (cancelledRef.current) return;
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
            throw new Error(job.error ?? "Unknown error");
          }
        } catch (pollErr) {
          clearInterval(pollRef.current!);
          const msg = pollErr instanceof Error ? pollErr.message : "Unknown error";
          if (!cancelledRef.current && attemptNum <= MAX_AUTO_RETRIES) {
            setProgressLog((prev) => [...prev, `Retrying (attempt ${attemptNum + 1})…`]);
            await investigateCounty(county, attemptNum + 1);
          } else {
            setError(msg);
            setLoading(false);
          }
        }
      }, 1000);
    } catch (err) {
      if (cancelledRef.current) return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (attemptNum <= MAX_AUTO_RETRIES) {
        setProgressLog((prev) => [...prev, `Network error — retrying (attempt ${attemptNum + 1})…`]);
        await new Promise((r) => setTimeout(r, 2000 * attemptNum));
        return investigateCounty(county, attemptNum + 1);
      }
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-400 max-w-2xl leading-relaxed no-print">
        Click any county on the map — or type a county name below — to investigate its public
        education data integration ecosystem from preschool through K-12.
      </p>

      {/* ── County text search ──────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-lg no-print">
        <input
          type="text"
          value={searchInput}
          onChange={e => { setSearchInput(e.target.value); setSearchError(null); }}
          placeholder="e.g. Travis County, TX"
          disabled={loading}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !searchInput.trim()}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>
      {searchError && (
        <p className="text-xs text-red-400 -mt-2 no-print">{searchError}</p>
      )}

      <USCountyMap
        onCountySelect={(c) => investigateCounty(c)}
        selectedFips={selectedCounty?.fips}
        loading={loading}
      />

      {selectedCounty && !report && !loading && (
        <p className="text-center text-xs text-slate-500 no-print">
          Selected: <span className="text-slate-300 font-medium">{selectedCounty.name} County, {selectedCounty.stateName}</span>
        </p>
      )}

      {loading && (
        <ProgressPanel
          log={progressLog}
          mode="county"
          onCancel={cancel}
        />
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm space-y-3 no-print">
          <p className="text-red-300">
            <strong>Error after {attempt} attempt{attempt > 1 ? "s" : ""}:</strong> {error}
          </p>
          {selectedCounty && (
            <button onClick={() => investigateCounty(selectedCounty)}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors">
              Try again
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
