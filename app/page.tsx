"use client";

import { useState, useRef } from "react";
import type { VendorReport } from "@/lib/types";
import { AnalysisReport } from "@/components/AnalysisReport";

const EXAMPLES = ["ClassDojo", "Seesaw", "Remind", "Canvas LMS", "Duolingo"];

export default function Home() {
  const [vendorName, setVendorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [report, setReport] = useState<VendorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function analyze(name: string) {
    if (!name.trim()) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setReport(null);
    setError(null);
    setProgressLog([`Starting investigation of "${name.trim()}"...`]);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName: name.trim() }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (data.progress?.length) setProgressLog(data.progress);

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      if (data.status === "done") {
        setReport(data.report);
      } else {
        throw new Error(data.error ?? "Unknown error");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    analyze(vendorName);
  }

  function handleCancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-2">
            AI-powered · For schools and districts
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Vendor Data Flow Analyzer
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Enter an edtech vendor or app name. The AI agent will investigate their privacy policy,
            subprocessor chain, detected trackers, and flag discrepancies — so you can ask the right
            questions before signing.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. ClassDojo, Seesaw, Remind..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
            {loading ? (
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!vendorName.trim()}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Analyze
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={loading}
                onClick={() => { setVendorName(ex); analyze(ex); }}
                className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:border-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {/* Progress */}
        {loading && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-slate-300 text-sm font-medium">Agent is investigating...</span>
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

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm space-y-3">
            <p className="text-red-300">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={() => analyze(vendorName)}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="border-t border-slate-700 pt-10">
            <AnalysisReport report={report} />
          </div>
        )}

        {/* Footer disclaimer */}
        {!loading && !report && (
          <p className="text-center text-xs text-slate-600 max-w-xl mx-auto">
            This tool performs automated analysis of public disclosures. It does not perform dynamic
            traffic interception or provide legal interpretations of data processing agreements.
            Findings should be verified by qualified staff before procurement decisions.
          </p>
        )}
      </div>
    </main>
  );
}
