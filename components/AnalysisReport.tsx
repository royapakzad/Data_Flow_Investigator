"use client";

import { useState } from "react";
import type { VendorReport, Citation, Lawsuit } from "@/lib/types";
import { DataFlowDiagram } from "./DataFlowDiagram";
import { DiscrepancyList } from "./DiscrepancyList";
import { SubprocessorTable } from "./SubprocessorTable";
import { CompanyHistory } from "./CompanyHistory";
import { AtAGlance, BusinessModelView, AIFeaturesView, ScoresView, ControversiesView, QuestionBank, LookItUp } from "./VendorInsights";

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

// ── Risk badge ────────────────────────────────────────────────────────────────
const RISK_STYLES = {
  elevated:      "bg-red-100 text-red-700 border-red-300",
  standard:      "bg-yellow-100 text-yellow-700 border-yellow-300",
  "low-concern": "bg-green-100 text-green-700 border-green-300",
};
const RISK_LABELS = {
  elevated:      "Elevated concern",
  standard:      "Standard risk",
  "low-concern": "Lower concern",
};

// ── Section nav ───────────────────────────────────────────────────────────────
function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-white/90 backdrop-blur border-b border-slate-200 no-print">
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {items.map((it) => (
          <a key={it.id} href={`#${it.id}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function AnalysisReport({ report }: Props) {
  const docs = report.privacyDocuments;
  const citations = report.citations ?? [];
  const getCite = useCiteByUrl(citations);
  const hasDocs = !!(docs.privacyPolicyUrl || docs.dpaUrl || docs.subprocessorListUrl || docs.appStoreUrl || docs.playStoreUrl);
  const name = report.appName || report.vendorName;

  const nav = [
    { id: "data-flow", label: "Data flow", show: report.dataFlowNodes?.length > 0 },
    { id: "subprocessors", label: "Subprocessors", show: report.subprocessors?.length > 0 },
    { id: "ai", label: "AI & predictions", show: true },
    { id: "discrepancies", label: "Discrepancies", show: true },
    { id: "money", label: "Follow the money", show: true },
    { id: "ownership", label: "Ownership", show: !!report.companyOwnership },
    { id: "lawsuits", label: "Lawsuits", show: true },
    { id: "controversies", label: "Controversies & advocacy", show: true },
    { id: "questions", label: "Questions", show: true },
    { id: "lookups", label: "Look it up", show: true },
    { id: "citations", label: "Sources", show: citations.length > 0 },
  ].filter((n) => n.show);

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{report.vendorName}</h1>
            {report.appName && report.appName !== report.vendorName && (
              <p className="text-slate-500 text-sm mt-1">App: {report.appName}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Researched {new Date(report.analysisDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} from public sources
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${RISK_STYLES[report.riskLevel]}`}>
            {RISK_LABELS[report.riskLevel]}
          </span>
        </div>
        <AtAGlance report={report} />
        {hasDocs && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Read the originals</span>
            {docs.privacyPolicyUrl    && <DocPill href={docs.privacyPolicyUrl}    label="Privacy policy"            cite={getCite(docs.privacyPolicyUrl)} />}
            {docs.dpaUrl              && <DocPill href={docs.dpaUrl}              label="Data processing agreement" cite={getCite(docs.dpaUrl)} />}
            {docs.subprocessorListUrl && <DocPill href={docs.subprocessorListUrl} label="Subprocessor list"         cite={getCite(docs.subprocessorListUrl)} />}
            {docs.appStoreUrl         && <DocPill href={docs.appStoreUrl}         label="App Store"                 cite={getCite(docs.appStoreUrl)} />}
            {docs.playStoreUrl        && <DocPill href={docs.playStoreUrl}        label="Play Store"                cite={getCite(docs.playStoreUrl)} />}
            {docs.lastUpdated && <span className="text-xs text-slate-400">Policy updated {docs.lastUpdated}</span>}
          </div>
        )}
      </div>

      <SectionNav items={nav} />

      {/* ── FOLLOW THE DATA ────────────────────────────────────────────── */}
      {report.dataFlowNodes?.length > 0 && (
        <Section id="data-flow" title="Where student data goes"
          subtitle="Services the app relies on (its own vendors), the app itself, and the school and state systems it connects to. Hover [N] to see the source.">
          <DataFlowDiagram nodes={report.dataFlowNodes} citations={citations} />
        </Section>
      )}

      {report.subprocessors?.length > 0 && (
        <Section id="subprocessors" title="Subprocessors: the vendor's own vendors"
          subtitle="Third parties that handle student data, as declared by the vendor, detected in the app, or inferred. Vendors are allowed to name these only by category, so this list is reconstructed.">
          <SubprocessorTable report={report} citations={citations} />
        </Section>
      )}

      {report.trackers?.length > 0 && (
        <Section id="trackers" title="Trackers in the Android app"
          subtitle="SDKs detected by Exodus Privacy.">
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

      <Section id="ai" title="AI features, scores & predictions"
        subtitle="Generative AI providers that may process student data, and scores or risk flags that can become part of a child's official record.">
        <div className="space-y-6">
          <AIFeaturesView features={report.aiFeatures} />
          <ScoresView items={report.scoresAndPredictions} />
        </div>
      </Section>

      <Section id="discrepancies" title="What they say vs. what was found"
        subtitle="Gaps between the vendor's disclosures and what was detected or reported elsewhere.">
        <DiscrepancyList report={report} />
      </Section>

      {/* ── FOLLOW THE MONEY ───────────────────────────────────────────── */}
      <Section id="money" title="Follow the money"
        subtitle="How the company makes money: licensing, paid upgrades for families, data-derived products, public funding it's marketed against, and public contracts.">
        <BusinessModelView model={report.businessModel} />
      </Section>

      {report.companyOwnership && (
        <Section id="ownership" title="Who owns it"
          subtitle="The company that holds the data today may not be the one the district signed with. Use the Ownership tab for the full private-equity portfolio.">
          <CompanyHistory ownership={report.companyOwnership} />
        </Section>
      )}

      <Section id="lawsuits" title="Lawsuits & legal actions"
        subtitle="Lawsuits, regulatory actions, or settlements involving the company or its parent.">
        {report.lawsuits && report.lawsuits.length > 0 ? (
          <LawsuitsList lawsuits={report.lawsuits} />
        ) : (
          <p className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
            None found in public sources during this search. That isn&apos;t proof none exist.
          </p>
        )}
      </Section>

      <Section id="controversies" title="Controversies & advocacy"
        subtitle="Breaches, investigations, community concerns, and campaigns for and against, plus independent evaluations and research.">
        <ControversiesView items={report.controversies} />
      </Section>

      {/* ── TAKE ACTION ────────────────────────────────────────────────── */}
      <Section id="questions" title="Questions to ask"
        subtitle="Questions based on gaps found for this vendor. You can edit them before sharing.">
        <div className="space-y-5">
          <EditableQuestions initialQuestions={report.vendorQuestions} />
          <QuestionBank />
        </div>
      </Section>

      <Section title="What still needs a human"
        subtitle="Things this automated research can't do.">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
          {report.humanInLoopSteps.map((step, i) => (
            <div key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="text-amber-500 font-bold shrink-0">→</span>
              <p className="leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="lookups" title="Look it up yourself"
        subtitle="Independent sources not included in this automated research.">
        <LookItUp name={name} />
      </Section>

      {citations.length > 0 && (
        <Section id="citations" title="Sources"
          subtitle="Every finding above links back to one of these. Click any [N] badge to jump here.">
          <CitationsList citations={citations} />
        </Section>
      )}

    </div>
  );
}
