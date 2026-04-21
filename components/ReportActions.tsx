"use client";

import { useState } from "react";
import type { VendorReport, CountyReport } from "@/lib/types";

interface Props {
  type: "vendor" | "county";
  report: VendorReport | CountyReport;
}

export function ReportActions({ type, report }: Props) {
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function handleShare() {
    setShareState("loading");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, report }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Share failed");

      const url = `${window.location.origin}/share/${data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {
        // fallback for browsers that block clipboard without user gesture context
        const el = document.createElement("input");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      });
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 3000);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap no-print">
      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={shareState === "loading"}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
      >
        {shareState === "loading" ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        ) : shareState === "copied" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : shareState === "error" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
        {shareState === "idle" ? "Share link"
          : shareState === "loading" ? "Generating…"
          : shareState === "copied" ? "Link copied!"
          : "Error — retry"}
      </button>

      {/* Shared URL display */}
      {shareUrl && shareState === "copied" && (
        <span className="text-xs text-slate-500 font-mono truncate max-w-xs">{shareUrl}</span>
      )}

      {/* Download PDF */}
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Download PDF
      </button>
    </div>
  );
}
