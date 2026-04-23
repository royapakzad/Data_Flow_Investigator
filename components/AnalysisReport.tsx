"use client";

import { useState } from "react";
import type { VendorReport, Citation } from "@/lib/types";
import { DataFlowDiagram } from "./DataFlowDiagram";
import { DiscrepancyList } from "./DiscrepancyList";
import { SubprocessorTable } from "./SubprocessorTable";
import { CompanyHistory } from "./CompanyHistory";

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
            <span className="shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {editingIdx === i ? (
              <div className="flex-1 space-y-2">
                <textarea
                  className="w-full bg-slate-800 border border-blue-500/50 rounded-lg p-2 text-slate-300 text-sm resize-none focus:outline-none focus:border-blue-400"
                  rows={3}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(i)} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Save</button>
                  <button onClick={() => setEditingIdx(null)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-start justify-between gap-2">
                <p className="text-slate-300 text-sm leading-relaxed pt-0.5 flex-1">{q}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                  <button onClick={() => startEdit(i)} title="Edit" className="p-1 text-slate-500 hover:text-blue-400 transition-colors text-base leading-none">✎</button>
                  <button onClick={() => deleteQuestion(i)} title="Delete" className="p-1 text-slate-500 hover:text-red-400 transition-colors text-base leading-none">✕</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {addingNew ? (
        <div className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold flex items-center justify-center mt-0.5">
            {questions.length + 1}
          </span>
          <div className="flex-1 space-y-2">
            <textarea
              className="w-full bg-slate-800 border border-blue-500/50 rounded-lg p-2 text-slate-300 text-sm resize-none focus:outline-none focus:border-blue-400"
              rows={3}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Type your question…"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={addQuestion} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Add</button>
              <button onClick={() => { setAddingNew(false); setNewText(""); }} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors"
        >
          <span className="w-7 h-7 rounded-full border border-dashed border-slate-600 hover:border-blue-500 flex items-center justify-center text-lg leading-none">+</span>
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
    <section id={id} className="space-y-4 scroll-mt-6">
      <div className="border-b border-slate-700 pb-2 space-y-0.5">
        <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
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
      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1 py-0.5 rounded hover:bg-blue-500/30 transition-colors leading-none">
        [{citation.number}]
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs z-50 shadow-2xl gap-1.5">
        <span className="font-semibold text-blue-300">{citation.label}</span>
        <span className="text-slate-300 leading-relaxed">{citation.context}</span>
        <span className="text-slate-500 truncate font-mono text-[10px]">{citation.url}</span>
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
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 hover:bg-slate-800/80 transition-colors">
        {label} <span className="text-slate-500">↗</span>
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
            className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold flex items-center justify-center hover:bg-blue-500/30 transition-colors mt-0.5"
          >
            {c.number}
          </a>
          <div className="flex-1 space-y-1.5">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-300 hover:text-blue-200 hover:underline text-sm leading-tight"
            >
              {c.label} ↗
            </a>
            <p className="text-sm text-slate-300 leading-relaxed">{c.context}</p>
            <p className="text-[11px] text-slate-600 font-mono truncate">{c.url}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────────
const RISK_STYLES = {
  elevated:      "bg-red-500/20 text-red-300 border-red-500/40",
  standard:      "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "low-concern": "bg-green-500/20 text-green-300 border-green-500/40",
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
          <h1 className="text-3xl font-bold text-white">{report.vendorName}</h1>
          {report.appName !== report.vendorName && (
            <p className="text-slate-400 text-sm mt-1">App: {report.appName}</p>
          )}
          <p className="text-xs text-slate-600 mt-1">
            Analysis date: {new Date(report.analysisDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${RISK_STYLES[report.riskLevel]}`}>
          {RISK_LABELS[report.riskLevel]}
        </span>
      </div>

      {/* ── Company Ownership ──────────────────────────────────────────── */}
      {report.companyOwnership && (
        <Section title="Company Ownership & Acquisition History"
          subtitle="Who ultimately controls this product and its data.">
          <CompanyHistory ownership={report.companyOwnership} />
        </Section>
      )}

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
              <div key={i} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                {t.website ? (
                  <a href={t.website} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-red-300 hover:underline text-sm">{t.name}</a>
                ) : (
                  <span className="font-medium text-red-300 text-sm">{t.name}</span>
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
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-5 space-y-3">
          {report.humanInLoopSteps.map((step, i) => (
            <div key={i} className="flex gap-3 text-sm text-slate-300">
              <span className="text-amber-400 font-bold shrink-0">→</span>
              <p className="leading-relaxed">{step}</p>
            </div>
          ))}
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
