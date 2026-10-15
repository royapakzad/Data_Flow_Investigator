"use client";

import { useState } from "react";
import type { CountyReport, CountyContract, ProcurementRule } from "@/lib/types";

function Source({ url, label = "Source" }: { url: string | null | undefined; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline whitespace-nowrap">
      {label} ↗
    </a>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-white border border-slate-200 p-4 text-sm text-slate-500">{children}</p>;
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────────

const AGREEMENT = {
  yes: { label: "DPA found", cls: "text-green-700" },
  no: { label: "No DPA", cls: "text-red-600" },
  unknown: { label: "DPA unknown", cls: "text-slate-400" },
};

export function VendorList({ report }: { report: CountyReport }) {
  const [level, setLevel] = useState<"all" | "state" | "district">("all");
  const vendors = report.vendors ?? [];
  const shown = level === "all" ? vendors : vendors.filter((v) => v.level === level || v.level === "both");

  return (
    <section className="space-y-4">
      <Heading title="Vendors" subtitle="Companies that build, host, or run the state systems and the main district's edtech." />
      {vendors.length === 0 ? (
        <Empty>No vendors were identified in public sources. See &ldquo;Get the records&rdquo; below.</Empty>
      ) : (
        <>
          <div className="flex gap-1.5 text-xs no-print">
            {(["all", "state", "district"] as const).map((l) => (
              <button key={l} onClick={() => setLevel(l)}
                className={`px-3 py-1 rounded-full border transition-colors ${level === l ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                {l === "all" ? `All (${vendors.length})` : l === "state" ? "State systems" : "District"}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {shown.map((v, i) => (
              <div key={i} className="px-4 py-3 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {v.website ? <a href={v.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{v.name}</a> : v.name}
                  </p>
                  <p className="text-sm text-slate-600">{v.provides}</p>
                  {v.systems?.length > 0 && <p className="text-xs text-slate-400 mt-0.5">{v.systems.join(" · ")}</p>}
                </div>
                <div className="flex sm:flex-col sm:items-end gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-slate-500 capitalize">{v.level === "both" ? "State + district" : v.level}</span>
                  {v.dataAgreementUrl ? (
                    <a href={v.dataAgreementUrl} target="_blank" rel="noopener noreferrer" className={`${AGREEMENT[v.dataAgreement].cls} hover:underline`}>{AGREEMENT[v.dataAgreement].label} ↗</a>
                  ) : (
                    <span className={AGREEMENT[v.dataAgreement]?.cls ?? "text-slate-400"}>{AGREEMENT[v.dataAgreement]?.label ?? "DPA unknown"}</span>
                  )}
                  <Source url={v.sourceUrl} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Contracts & spending ──────────────────────────────────────────────────────

const METHOD: Record<CountyContract["procurementMethod"], { label: string; cls: string }> = {
  "competitive-bid": { label: "Competitive bid", cls: "bg-green-50 text-green-700 border-green-200" },
  "sole-source": { label: "Sole source", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  cooperative: { label: "Cooperative purchase", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  emergency: { label: "Emergency", cls: "bg-red-50 text-red-700 border-red-200" },
  pilot: { label: "Pilot", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  "grant-funded": { label: "Grant-funded", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  unknown: { label: "Method unknown", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

export function ContractsAndSpending({ report }: { report: CountyReport }) {
  const contracts = report.contracts ?? [];
  const spending = report.spending;
  return (
    <section className="space-y-4">
      <Heading title="Contracts & spending" subtitle="Only items with a public document are listed." />
      {contracts.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {contracts.map((c, i) => (
            <div key={i} className="px-4 py-3 space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-semibold text-slate-900">{c.vendor} <span className="font-normal text-slate-500">· {c.agency}</span></p>
                {c.amount && <p className="text-sm font-semibold text-slate-900 tabular-nums">{c.amount}</p>}
              </div>
              <p className="text-sm text-slate-600">{c.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full border ${METHOD[c.procurementMethod]?.cls ?? METHOD.unknown.cls}`}>
                  {METHOD[c.procurementMethod]?.label ?? c.procurementMethod}
                </span>
                {c.period && <span className="text-slate-500">{c.period}</span>}
                <Source url={c.documentUrl} label="Document" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No contract documents were found online. Use the records request below to get them.</Empty>
      )}

      {spending && (spending.summary || spending.items?.length > 0) && (
        <div className="space-y-2">
          {spending.summary && <p className="text-sm text-slate-700 leading-relaxed">{spending.summary}</p>}
          {spending.items?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {spending.items.map((s, i) => (
                <div key={i} className="px-4 py-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-sm text-slate-700 flex-1 min-w-[12rem]">{s.description}</span>
                  {s.period && <span className="text-xs text-slate-400">{s.period}</span>}
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">{s.amount}</span>
                  <Source url={s.sourceUrl} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── How to get the records ────────────────────────────────────────────────────

export function GetTheRecords({ report }: { report: CountyReport }) {
  const f = report.findTheRecords;
  const [copied, setCopied] = useState(false);
  if (!f) return null;
  return (
    <section className="space-y-4">
      <Heading title="Get the records" subtitle="Where to look, and how to request what isn't online." />
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-900">{f.publicRecordsLaw}</p>
        <p className="text-sm text-slate-600 leading-relaxed">{f.howToRequest}</p>
        <Source url={f.requestUrl} label="Where to file" />
      </div>
      {f.places?.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {f.places.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors">
              <p className="text-sm font-semibold text-blue-700">{p.name} ↗</p>
              <p className="text-sm text-slate-600 mt-0.5">{p.whatYouFind}</p>
            </a>
          ))}
        </div>
      )}
      {f.sampleRequest && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Sample records request</p>
            <button
              onClick={() => navigator.clipboard.writeText(f.sampleRequest).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
              className="px-3 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 no-print">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{f.sampleRequest}</p>
        </div>
      )}
    </section>
  );
}

// ── Laws, regulations & policies ──────────────────────────────────────────────

const CATEGORIES: { key: ProcurementRule["category"]; label: string }[] = [
  { key: "procurement", label: "Procurement" },
  { key: "student-privacy", label: "Student privacy" },
  { key: "contract-requirements", label: "Required contract terms" },
  { key: "data-security", label: "Data security & breaches" },
  { key: "accessibility", label: "Accessibility" },
  { key: "ai-guidance", label: "AI guidance" },
  { key: "records-access", label: "Public records" },
];

const LEVEL_ORDER = { federal: 0, state: 1, district: 2 };

export function RulesList({ rules }: { rules?: ProcurementRule[] }) {
  if (!rules?.length) return <Empty>No laws or policies were captured for this report.</Empty>;
  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: rules.filter((r) => r.category === c.key).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</p>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {g.items.map((r, i) => (
              <div key={i} className="px-4 py-3 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.name} ↗</a> : r.name}
                  </p>
                  <span className="text-xs text-slate-400 capitalize">{r.level}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{r.requires}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
