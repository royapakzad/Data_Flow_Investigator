"use client";

import { useState } from "react";
import type { VendorReport, Citation, Lawsuit, AppMicroscopeData } from "@/lib/types";
import { DataFlowDiagram } from "./DataFlowDiagram";
import { DiscrepancyList } from "./DiscrepancyList";
import { SubprocessorTable } from "./SubprocessorTable";
import { CompanyHistory } from "./CompanyHistory";
import { OwnershipGraph } from "./OwnershipGraph";

interface Props {
  report: VendorReport;
}

function EditableQuestions({ initialQuestions }: { initialQuestions: string[] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState("");

  function startEdit(i: number) {
    setEditingIdx(i);
    setEditText(questions[i]);
  }

  function saveEdit(i: number) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const next = [...questions];
    next[i] = trimmed;
    setQuestions(next);
    setEditingIdx(null);
  }

  function deleteQuestion(i: number) {
    setQuestions(questions.filter((_, idx) => idx !== i));
    if (editingIdx === i) setEditingIdx(null);
  }

  function addQuestion() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setQuestions([...questions, trimmed]);
    setNewText("");
    setAddingNew(false);
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={i} className="flex gap-3 group">
            <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {editingIdx === i ? (
              <div className="flex-1 space-y-2">
                <textarea
                  className="w-full bg-white border border-blue-400 rounded-lg p-2 text-slate-700 text-sm resize-none focus:outline-none focus:border-blue-500"
                  rows={3}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(i)} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Save</button>
                  <button onClick={() => setEditingIdx(null)} className="px-3 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-start justify-between gap-2">
                <p className="text-slate-700 text-sm leading-relaxed pt-0.5 flex-1">{q}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                  <button onClick={() => startEdit(i)} title="Edit" className="p-1 text-slate-400 hover:text-blue-600 transition-colors text-base leading-none">✎</button>
                  <button onClick={() => deleteQuestion(i)} title="Delete" className="p-1 text-slate-400 hover:text-red-600 transition-colors text-base leading-none">✕</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {addingNew ? (
        <div className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center mt-0.5">
            {questions.length + 1}
          </span>
          <div className="flex-1 space-y-2">
            <textarea
              className="w-full bg-white border border-blue-400 rounded-lg p-2 text-slate-700 text-sm resize-none focus:outline-none focus:border-blue-500"
              rows={3}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Type your question…"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={addQuestion} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Add</button>
              <button onClick={() => { setAddingNew(false); setNewText(""); }} className="px-3 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          <span className="w-7 h-7 rounded-full border border-dashed border-slate-300 hover:border-blue-500 flex items-center justify-center text-lg leading-none">+</span>
          Add a question
        </button>
      )}
    </div>
  );
}

function Section({ id, title, children, subtitle }: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5 scroll-mt-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="border-t border-slate-100" />
      {children}
    </section>
  );
}

// ── Inline citation badge with tooltip ───────────────────────────────────────
function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={`#citation-${citation.number}`}
      className="group relative inline-flex items-center mx-0.5 align-super"
    >
      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-300 px-1 py-0.5 rounded hover:bg-blue-100 transition-colors leading-none">
        [{citation.number}]
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 bg-white border border-slate-200 rounded-xl p-3 text-xs z-50 shadow-2xl gap-1.5">
        <span className="font-semibold text-blue-700">{citation.label}</span>
        <span className="text-slate-700 leading-relaxed">{citation.context}</span>
        <span className="text-slate-400 truncate font-mono text-[10px]">{citation.url}</span>
      </span>
    </a>
  );
}

function useCiteByUrl(citations: Citation[]) {
  const map = new Map<string, Citation>();
  for (const c of citations ?? []) {
    map.set(c.url, c);
    try {
      map.set(new URL(c.url).hostname.replace(/^www\./, ""), c);
    } catch { /* skip */ }
  }
  return (url?: string | null): Citation | undefined => {
    if (!url) return undefined;
    if (map.has(url)) return map.get(url);
    try { return map.get(new URL(url).hostname.replace(/^www\./, "")); } catch { return undefined; }
  };
}

// ── Source document pill ──────────────────────────────────────────────────────
function DocPill({ href, label, cite }: { href: string; label: string; cite?: Citation }) {
  return (
    <div className="flex items-center gap-1">
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-sm font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow transition-all">
        {label} <span className="text-blue-400 text-xs">↗</span>
      </a>
      {cite && <CiteBadge citation={cite} />}
    </div>
  );
}

// ── Citations list with anchor IDs ────────────────────────────────────────────
function CitationsList({ citations }: { citations: Citation[] }) {
  if (!citations?.length) return null;
  return (
    <ol className="space-y-4">
      {citations.map((c) => (
        <li key={c.number} id={`citation-${c.number}`} className="flex gap-4 scroll-mt-6 group">
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-8 h-8 rounded-lg bg-blue-50 border border-blue-300 text-blue-600 text-xs font-mono font-bold flex items-center justify-center hover:bg-blue-100 transition-colors mt-0.5"
          >
            {c.number}
          </a>
          <div className="flex-1 space-y-1.5">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 hover:text-blue-600 hover:underline text-sm leading-tight"
            >
              {c.label} ↗
            </a>
            <p className="text-sm text-slate-700 leading-relaxed">{c.context}</p>
            <p className="text-[11px] text-slate-400 font-mono truncate">{c.url}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Lawsuits list ─────────────────────────────────────────────────────────────
function LawsuitsList({ lawsuits }: { lawsuits: Lawsuit[] }) {
  return (
    <div className="space-y-4">
      {lawsuits.map((l, i) => (
        <div key={i} className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-800 text-sm">{l.caseName}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {l.year && <span>{l.year}</span>}
                {l.court && <span>· {l.court}</span>}
                {l.plaintiff && <span>· Plaintiff: {l.plaintiff}</span>}
              </div>
            </div>
            {l.outcome && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-red-200 text-red-700 shrink-0">
                {l.outcome}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{l.description}</p>
          <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            Source: {l.sourceLabel} ↗
          </a>
        </div>
      ))}
    </div>
  );
}

// ── App Microscope safety label card ─────────────────────────────────────────
const AM_TIER_STYLES: Record<string, string> = {
  "Critical Risk": "bg-red-100 border-red-300 text-red-800",
  "High Risk":     "bg-orange-100 border-orange-300 text-orange-800",
  "Medium Risk":   "bg-yellow-100 border-yellow-300 text-yellow-800",
  "Some Risk":     "bg-blue-50 border-blue-300 text-blue-800",
  "Not Scored":    "bg-slate-100 border-slate-300 text-slate-600",
};

function AppMicroscopeCard({ data }: { data: AppMicroscopeData }) {
  if (!data.found) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">AM</div>
        <div className="space-y-2">
          <p className="font-semibold text-slate-700 text-sm">Not found in App Microscope database</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Check manually — this app may not have been tested yet, or may be listed under a different name.
          </p>
          <a href="https://appmicroscope.org/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            Search App Microscope yourself ↗
          </a>
        </div>
      </div>
    );
  }

  const tierStyle = data.riskTier ? (AM_TIER_STYLES[data.riskTier] ?? AM_TIER_STYLES["Not Scored"]) : AM_TIER_STYLES["Not Scored"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">AM</div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-slate-800 text-sm">App Microscope Safety Label</p>
              <p className="text-xs text-slate-500">Internet Safety Labs — manually tested</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${tierStyle}`}>
              {data.riskTier ?? "Not Scored"}
            </span>
          </div>
          {data.privacyRisks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.privacyRisks.map((risk, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-red-50 border border-red-200 text-red-700">
                  {risk}
                </span>
              ))}
            </div>
          )}
          {data.searchSnippet && (
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
              {data.searchSnippet}
            </p>
          )}
          {data.pageUrl && (
            <a href={data.pageUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              View on App Microscope ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────────
const RISK_STYLES = {
  elevated:      "bg-red-100 text-red-700 border-red-300",
  standard:      "bg-yellow-100 text-yellow-700 border-yellow-300",
  "low-concern": "bg-green-100 text-green-700 border-green-300",
};
const RISK_LABELS = {
  elevated:      "⚠ Elevated Concern",
  standard:      "● Standard Risk",
  "low-concern": "✓ Low Concern",
};

export function AnalysisReport({ report }: Props) {
  const docs = report.privacyDocuments;
  const citations = report.citations ?? [];
  const getCite = useCiteByUrl(citations);

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{report.vendorName}</h1>
          {report.appName !== report.vendorName && (
            <p className="text-slate-500 text-sm mt-1">App: {report.appName}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Analysis date: {new Date(report.analysisDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${RISK_STYLES[report.riskLevel]}`}>
          {RISK_LABELS[report.riskLevel]}
        </span>
      </div>

      {/* ── Company Ownership ──────────────────────────────────────────── */}
      {report.companyOwnership && (
        <Section title="Company Ownership & Acquisition Network"
          subtitle="Who ultimately controls this product and its data — traced up to private equity firms, with their full portfolio.">
          <OwnershipGraph vendorName={report.vendorName} ownership={report.companyOwnership} />
          <div className="mt-6">
            <CompanyHistory ownership={report.companyOwnership} />
          </div>
        </Section>
      )}

      {/* ── Lawsuits & Legal Actions ───────────────────────────────────── */}
      <Section title="Lawsuits & Legal Actions"
        subtitle="Known lawsuits, regulatory actions, or settlements against the company or its parent. Empty means none were found in public sources — not a guarantee none exist.">
        {report.lawsuits && report.lawsuits.length > 0 ? (
          <LawsuitsList lawsuits={report.lawsuits} />
        ) : (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
            No lawsuits or regulatory actions found in public sources during this analysis. Verify independently before relying on this finding.
          </div>
        )}
      </Section>

      {/* ── App Microscope ─────────────────────────────────────────────── */}
      <Section title="App Microscope Safety Label"
        subtitle="Internet Safety Labs manually tests mobile apps for privacy risks. This label reflects their independent assessment — separate from what the vendor self-discloses.">
        {report.appMicroscope ? (
          <AppMicroscopeCard data={report.appMicroscope} />
        ) : (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-500 text-sm">
            App Microscope was not checked during this analysis. Re-run to include it.
          </div>
        )}
      </Section>

      {/* ── Source Documents ───────────────────────────────────────────── */}
      {(docs.privacyPolicyUrl || docs.dpaUrl || docs.subprocessorListUrl || docs.appStoreUrl || docs.playStoreUrl) && (
        <Section title="Primary Source Documents"
          subtitle="Official documents reviewed for this analysis. Click to read the originals.">
          <div className="flex flex-wrap gap-3">
            {docs.privacyPolicyUrl   && <DocPill href={docs.privacyPolicyUrl}   label="Privacy Policy"               cite={getCite(docs.privacyPolicyUrl)} />}
            {docs.dpaUrl             && <DocPill href={docs.dpaUrl}             label="Data Processing Agreement"    cite={getCite(docs.dpaUrl)} />}
            {docs.subprocessorListUrl && <DocPill href={docs.subprocessorListUrl} label="Subprocessor List"          cite={getCite(docs.subprocessorListUrl)} />}
            {docs.appStoreUrl        && <DocPill href={docs.appStoreUrl}        label="App Store"                    cite={getCite(docs.appStoreUrl)} />}
            {docs.playStoreUrl       && <DocPill href={docs.playStoreUrl}       label="Play Store"                   cite={getCite(docs.playStoreUrl)} />}
          </div>
          {docs.lastUpdated && (
            <p className="text-xs text-slate-500 mt-2">Privacy policy last updated: {docs.lastUpdated}</p>
          )}
        </Section>
      )}

      {/* ── Data Flow ──────────────────────────────────────────────────── */}
      {report.dataFlowNodes?.length > 0 && (
        <Section
          title="Data Flow — Full Chain"
          subtitle="Where student data goes: upstream services the app relies on, the app itself, and downstream education systems it connects to. Each node links to the company's privacy page. Hover [N] to see the source."
        >
          <DataFlowDiagram nodes={report.dataFlowNodes} citations={citations} />
        </Section>
      )}

      {/* ── Discrepancies ──────────────────────────────────────────────── */}
      <Section title="Discrepancies Between Declared & Detected Practices"
        subtitle="Gaps found between what the vendor claims and what was actually detected.">
        <DiscrepancyList report={report} />
      </Section>

      {/* ── Subprocessors table ────────────────────────────────────────── */}
      {report.subprocessors?.length > 0 && (
        <Section title="Subprocessors"
          subtitle="Third parties with access to student data, as declared or detected. Names link to their privacy pages.">
          <SubprocessorTable report={report} citations={citations} />
        </Section>
      )}

      {/* ── Trackers ───────────────────────────────────────────────────── */}
      {report.trackers?.length > 0 && (
        <Section title="Trackers Detected via Exodus Privacy"
          subtitle="SDKs found in the Android app that were not declared in privacy documentation.">
          <div className="flex flex-wrap gap-2">
            {report.trackers.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                {t.website ? (
                  <a href={t.website} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-red-700 hover:underline text-sm">{t.name}</a>
                ) : (
                  <span className="font-medium text-red-700 text-sm">{t.name}</span>
                )}
                <span className="text-xs text-slate-500">{t.category}</span>
                {t.website && getCite(t.website) && <CiteBadge citation={getCite(t.website)!} />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Vendor Questions ───────────────────────────────────────────── */}
      <Section title="Questions to Ask the Vendor"
        subtitle="Specific questions for procurement or legal review based on gaps found in this analysis.">
        <EditableQuestions initialQuestions={report.vendorQuestions} />
      </Section>

      {/* ── Human-in-loop ──────────────────────────────────────────────── */}
      <Section title="Steps Requiring Human Verification"
        subtitle="Things this automated analysis cannot do — requiring a qualified human reviewer.">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1 bg-amber-400" />
          <div className="p-5 space-y-3">
          {report.humanInLoopSteps.map((step, i) => (
            <div key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="text-amber-500 font-bold shrink-0 mt-0.5">→</span>
              <p className="leading-relaxed">{step}</p>
            </div>
          ))}
          </div>
        </div>
      </Section>

      {/* ── Citations ──────────────────────────────────────────────────── */}
      {citations.length > 0 && (
        <Section
          id="citations"
          title="Sources & Citations"
          subtitle="Every claim in this report is backed by a source listed here. Click any [N] badge above to jump to its source."
        >
          <CitationsList citations={citations} />
        </Section>
      )}

    </div>
  );
}
