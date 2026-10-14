"use client";

import { useState } from "react";
import type { VendorReport, Citation, Lawsuit } from "@/lib/types";
import { DataFlowDiagram } from "./DataFlowDiagram";
import { DiscrepancyList } from "./DiscrepancyList";
import { SubprocessorTable } from "./SubprocessorTable";
import { CompanyHistory } from "./CompanyHistory";
import { ReportTabs } from "./ReportTabs";
import { QuickFacts, BusinessModelView, AIFeaturesView, ScoresView, ControversiesView, QuestionBank, LookItUp } from "./VendorInsights";

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
    <section id={id} className="space-y-4 scroll-mt-16">
      <div className="space-y-0.5">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Inline citation badge with tooltip ───────────────────────────────────────
function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={citation.url} target="_blank" rel="noopener noreferrer"
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

const LAYER_LABELS = { classroom: "Classroom layer", administrative: "Administrative layer", both: "Classroom + administrative layers" };

export function AnalysisReport({ report }: Props) {
  const docs = report.privacyDocuments ?? {};
  const citations = report.citations ?? [];
  const getCite = useCiteByUrl(citations);
  const own = report.companyOwnership;
  const name = report.appName || report.vendorName;
  const docLinks = [
    { href: docs.privacyPolicyUrl, label: "Privacy policy" },
    { href: docs.subprocessorListUrl, label: "Subprocessor list" },
    { href: docs.dpaUrl, label: "Data processing agreement" },
    { href: docs.appStoreUrl, label: "App Store" },
    { href: docs.playStoreUrl, label: "Play Store" },
  ].filter((d): d is { href: string; label: string } => !!d.href);

  const legalCount = (report.lawsuits?.length ?? 0) + (report.controversies?.length ?? 0);
  const aiCount = (report.aiFeatures?.length ?? 0) + (report.scoresAndPredictions?.length ?? 0);

  const tabs = [
    {
      id: "summary",
      label: "Summary",
      content: (
        <>
          {report.keyFindings && report.keyFindings.length > 0 && (
            <Section title="What to know">
              <ol className="space-y-3">
                {report.keyFindings.map((f, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-[15px] text-slate-800 leading-relaxed">{f}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}
          <QuickFacts report={report} />
          {docLinks.length > 0 && (
            <Section title="Read the originals">
              <div className="flex flex-wrap gap-2">
                {docLinks.map((d) => <DocPill key={d.label} href={d.href} label={d.label} cite={getCite(d.href)} />)}
              </div>
              {docs.lastUpdated && <p className="text-xs text-slate-400">Privacy policy last updated {docs.lastUpdated}</p>}
            </Section>
          )}
          <Section title="Look it up yourself" subtitle="Independent sources this research doesn't cover.">
            <LookItUp name={name} />
          </Section>
        </>
      ),
    },
    {
      id: "data",
      label: "Where data goes",
      count: report.subprocessors?.length ?? 0,
      content: (
        <>
          <Section title="What they say vs. what was found" subtitle="Gaps between the vendor's disclosures and what was detected or reported elsewhere.">
            <DiscrepancyList report={report} />
          </Section>
          {report.dataFlowNodes?.length > 0 && (
            <Section title="Data flow" subtitle="The app's own vendors on one side, school and state systems on the other.">
              <DataFlowDiagram nodes={report.dataFlowNodes} citations={citations} />
            </Section>
          )}
          {report.subprocessors?.length > 0 && (
            <Section title="Subprocessors" subtitle="Companies that handle student data for the vendor: declared, detected, or inferred.">
              <SubprocessorTable report={report} citations={citations} />
            </Section>
          )}
          {report.trackers?.length > 0 && (
            <Section title="Trackers in the Android app" subtitle="Detected by Exodus Privacy.">
              <div className="flex flex-wrap gap-2">
                {report.trackers.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm">
                    {t.website ? <a href={t.website} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-800 hover:underline">{t.name}</a> : <span className="font-medium text-slate-800">{t.name}</span>}
                    <span className="ml-1.5 text-xs text-slate-400">{t.category}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}
        </>
      ),
    },
    {
      id: "ai",
      label: "AI & predictions",
      count: aiCount,
      content: (
        <>
          <Section title="AI features" subtitle="AI providers that may process student data.">
            <AIFeaturesView features={report.aiFeatures} />
          </Section>
          <Section title="Scores, risk flags & predictions" subtitle="Outputs that can become part of a child's official school record.">
            <ScoresView items={report.scoresAndPredictions} />
          </Section>
        </>
      ),
    },
    {
      id: "money",
      label: "Money & owners",
      content: (
        <>
          <Section title="How it makes money">
            <BusinessModelView model={report.businessModel} />
          </Section>
          {own && (
            <Section title="Who owns it" subtitle="The company holding the data today may not be the one the district signed with.">
              <CompanyHistory ownership={own} />
            </Section>
          )}
        </>
      ),
    },
    {
      id: "legal",
      label: "Lawsuits & controversies",
      count: legalCount,
      content: (
        <>
          <Section title="Lawsuits & legal actions">
            {report.lawsuits && report.lawsuits.length > 0 ? (
              <LawsuitsList lawsuits={report.lawsuits} />
            ) : (
              <p className="rounded-xl bg-white border border-slate-200 p-4 text-sm text-slate-500">
                None found in public sources. That isn&apos;t proof none exist.
              </p>
            )}
          </Section>
          <Section title="Controversies & advocacy" subtitle="Breaches, investigations, community concerns, campaigns for and against, evaluations, and research.">
            <ControversiesView items={report.controversies} />
          </Section>
        </>
      ),
    },
    {
      id: "questions",
      label: "Questions",
      count: report.vendorQuestions?.length ?? 0,
      content: (
        <>
          <Section title="Questions for this vendor" subtitle="Based on gaps found in this research. Edit before you share them.">
            <EditableQuestions initialQuestions={report.vendorQuestions ?? []} />
          </Section>
          <QuestionBank />
          {report.humanInLoopSteps?.length > 0 && (
            <Section title="What still needs a person" subtitle="Things automated research can't check.">
              <ul className="space-y-2">
                {report.humanInLoopSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="text-slate-300 shrink-0">—</span>{step}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      ),
    },
    {
      id: "sources",
      label: "Sources",
      count: citations.length,
      content: (
        <Section title="Sources" subtitle="Every finding links to one of these.">
          <CitationsList citations={citations} />
        </Section>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold text-slate-900">{report.vendorName}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${RISK_STYLES[report.riskLevel]}`}>
            {RISK_LABELS[report.riskLevel]}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {report.appName && report.appName !== report.vendorName && <>{report.appName} · </>}
          {own?.currentParentCompany ? <>Owned by <span className="text-slate-700 font-medium">{own.currentParentCompany}</span>{own.isPEOwned && " (private equity)"} · </> : null}
          {report.layer && <>{LAYER_LABELS[report.layer]} · </>}
          Researched {new Date(report.analysisDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        </p>
        {report.overview && <p className="text-base text-slate-700 leading-relaxed max-w-3xl">{report.overview}</p>}
      </header>

      <ReportTabs tabs={tabs} />
    </div>
  );
}
