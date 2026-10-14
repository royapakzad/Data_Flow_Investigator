"use client";

import { useState } from "react";
import type { VendorReport, BusinessModel, AIFeature, ScoreOrPrediction, Controversy } from "@/lib/types";

// ── Small shared bits ─────────────────────────────────────────────────────────

function SourceLink({ url, label = "Source" }: { url: string | null | undefined; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
      {label} ↗
    </a>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">{children}</p>;
}

const TRI_STYLES = {
  yes: "bg-red-50 text-red-700 border-red-200",
  no: "bg-green-50 text-green-700 border-green-200",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

// ── Quick facts ───────────────────────────────────────────────────────────────

export function QuickFacts({ report }: { report: VendorReport }) {
  const critical = report.controversies?.filter((c) => c.stance === "critical").length ?? 0;
  const facts: { label: string; value: string | number; warn?: boolean }[] = [
    { label: "subprocessors", value: report.subprocessors?.length ?? 0 },
    { label: "trackers in the app", value: report.trackers?.length ?? 0, warn: (report.trackers?.length ?? 0) > 0 },
    { label: "AI features", value: report.aiFeatures?.length ?? 0 },
    { label: "lawsuits & legal actions", value: report.lawsuits?.length ?? 0, warn: (report.lawsuits?.length ?? 0) > 0 },
    { label: "critical news & reports", value: critical, warn: critical > 0 },
    {
      label: "public subprocessor list",
      value: report.privacyDocuments?.subprocessorListUrl ? "Yes" : "No",
      warn: !report.privacyDocuments?.subprocessorListUrl,
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {facts.map((f) => (
        <div key={f.label} className="rounded-xl bg-white border border-slate-200 px-4 py-3">
          <p className={`text-2xl font-semibold ${f.warn ? "text-red-600" : "text-slate-900"}`}>{f.value}</p>
          <p className="text-xs text-slate-500">{f.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Business model & public money ─────────────────────────────────────────────

const MODEL_LABELS: Record<BusinessModel["models"][number]["type"], string> = {
  "per-pupil-license": "Per-pupil licensing",
  freemium: "Freemium",
  "direct-to-parent": "Sells to families",
  "data-derived-products": "Data-derived products",
  advertising: "Advertising",
  "government-contract": "Government contracts",
  "pe-buy-and-build": "PE buy-and-build",
  other: "Other",
};

export function BusinessModelView({ model }: { model?: BusinessModel }) {
  if (!model || (!model.summary && !model.models?.length && !model.publicContracts?.length)) {
    return <Empty>No public information about pricing, funding streams, or contracts was found.</Empty>;
  }
  return (
    <div className="space-y-5">
      {model.summary && <p className="text-sm text-slate-700 leading-relaxed">{model.summary}</p>}

      {model.models?.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {model.models.map((m, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{MODEL_LABELS[m.type] ?? m.type}</p>
              <p className="text-sm text-slate-700 leading-relaxed">{m.description}</p>
              <SourceLink url={m.sourceUrl} />
            </div>
          ))}
        </div>
      )}

      {model.fundingStreamsMarketed?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public funding streams it's marketed against</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {model.fundingStreamsMarketed.map((f, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 bg-white">
                <span className="text-sm font-semibold text-slate-800 min-w-[9rem]">{f.stream}</span>
                <span className="text-sm text-slate-600 flex-1">{f.claim}</span>
                <SourceLink url={f.sourceUrl} />
              </div>
            ))}
          </div>
        </div>
      )}

      {model.publicContracts?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public contracts</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {model.publicContracts.map((c, i) => (
              <div key={i} className="px-4 py-3 bg-white space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm font-semibold text-slate-800">{c.agency}</span>
                  {c.amount && <span className="text-sm font-mono text-slate-700">{c.amount}</span>}
                  {c.year && <span className="text-xs text-slate-400">{c.year}</span>}
                </div>
                <p className="text-sm text-slate-600">{c.description}</p>
                <SourceLink url={c.sourceUrl} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI features ───────────────────────────────────────────────────────────────

export function AIFeaturesView({ features }: { features?: AIFeature[] }) {
  if (!features?.length) return <Empty>No AI features were found in public sources.</Empty>;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {features.map((f, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">{f.name}</p>
          <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
              Provider: {f.aiProvider ?? "not disclosed"}
            </span>
            <span className={`px-2 py-0.5 rounded-full border ${f.zeroDataRetention === "yes" ? TRI_STYLES.no : f.zeroDataRetention === "no" ? TRI_STYLES.yes : TRI_STYLES.unknown}`}>
              Zero data retention: {f.zeroDataRetention}
            </span>
          </div>
          <SourceLink url={f.sourceUrl} />
        </div>
      ))}
    </div>
  );
}

// ── Scores & predictions ──────────────────────────────────────────────────────

export function ScoresView({ items }: { items?: ScoreOrPrediction[] }) {
  if (!items?.length) return <Empty>No scores, risk flags, or predictive outputs were found in public sources.</Empty>;
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
      {items.map((s, i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 px-4 py-3 bg-white">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-slate-800">{s.name}</p>
            <p className="text-sm text-slate-600">{s.description}</p>
            <SourceLink url={s.sourceUrl} />
          </div>
          <span className={`shrink-0 self-start px-2 py-0.5 rounded-full border text-xs ${TRI_STYLES[s.writesToOfficialRecord]}`}>
            Enters official record: {s.writesToOfficialRecord}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Controversies & advocacy ──────────────────────────────────────────────────

const CONTROVERSY_LABELS: Record<Controversy["type"], string> = {
  "data-breach": "Data breach",
  "investigative-report": "Investigation",
  regulatory: "Regulatory",
  "advocacy-campaign": "Advocacy",
  "community-concern": "Community concern",
  "independent-evaluation": "Evaluation",
  research: "Research",
  endorsement: "Endorsement",
};

const STANCE_STYLES = {
  critical: "border-l-red-400",
  mixed: "border-l-amber-400",
  supportive: "border-l-green-500",
};

export function ControversiesView({ items }: { items?: Controversy[] }) {
  const [filter, setFilter] = useState<"all" | Controversy["stance"]>("all");
  if (!items?.length) {
    return <Empty>No breaches, investigations, advocacy campaigns, or independent evaluations were found in this search. That isn't proof none exist.</Empty>;
  }
  const sorted = [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const shown = filter === "all" ? sorted : sorted.filter((c) => c.stance === filter);
  const count = (s: Controversy["stance"]) => items.filter((c) => c.stance === s).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 text-xs no-print">
        {(["all", "critical", "mixed", "supportive"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full border transition-colors ${filter === f ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            {f === "all" ? `All (${items.length})` : `${f[0].toUpperCase()}${f.slice(1)} (${count(f)})`}
          </button>
        ))}
      </div>
      {shown.map((c, i) => (
        <div key={i} className={`rounded-xl border border-slate-200 border-l-4 ${STANCE_STYLES[c.stance]} bg-white p-4 space-y-1.5`}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{CONTROVERSY_LABELS[c.type] ?? c.type}</span>
            {c.year && <span>{c.year}</span>}
            {c.actor && <span>· {c.actor}</span>}
          </div>
          <p className="text-sm font-semibold text-slate-800">{c.title}</p>
          <p className="text-sm text-slate-600 leading-relaxed">{c.description}</p>
          <SourceLink url={c.sourceUrl} label={c.sourceLabel || "Source"} />
        </div>
      ))}
    </div>
  );
}

// ── Standard question bank ────────────────────────────────────────────────────

const QUESTION_BANK: { group: string; questions: string[] }[] = [
  {
    group: "Data flow",
    questions: [
      "Provide a list of your subprocessors (not just categories) and the agreements between you and them.",
      "Can you provide a diagram of how students' data moves through your subprocessors and their own vendors and third parties: how many are involved, what data each receives, and in which direction it moves?",
      "What data do you receive from our SIS or from Clever, ClassLink, and others, and what data goes back to them?",
      "If you use AI features, are your contracts with AI companies zero data retention? Can we see that language? Even with ZDR, what metadata is sent to AI companies?",
      "How will you inform us when add-ons or new features are added, especially AI features or new subprocessors?",
      "If you say data is \"anonymized\", \"de-identified\", or that you \"do not sell data\", what does that mean in practice? Can your subprocessors, data brokers, or anyone else link it back to our students?",
      "Does your product produce scores, risk flags, or predictions that end up in a student's official record?",
    ],
  },
  {
    group: "Business model",
    questions: [
      "How does data from the product you are selling us improve your other products or research, and how might our students' data show up in those other products?",
      "Do you have independent, third-party research on your product?",
      "Do you have other paid features? How does data collection and handling differ between the paid and unpaid versions?",
      "Who owns your company? Is there a private equity firm or parent company, and does it own other companies you share data or services with?",
      "Do you have acquisition clauses in your contracts? What happens to our students' data after an ownership change, acquisition, merger, or change of status (e.g. nonprofit to for-profit)?",
    ],
  },
  {
    group: "Oversight",
    questions: [
      "If your product comes in as a pilot, what happens to the data when the pilot ends?",
      "Has another public agency, such as law enforcement or immigration, asked you directly for data? Has a health or human services agency asked to do research with your data? What is your policy for such requests?",
    ],
  },
];

export function QuestionBank() {
  const [copied, setCopied] = useState(false);
  const all = QUESTION_BANK.map((g) => `${g.group}\n${g.questions.map((q) => `- ${q}`).join("\n")}`).join("\n\n");
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3">
        <span className="text-sm font-semibold text-slate-800">Standard questions for any vendor</span>
        <span className="text-xs text-slate-400 group-open:hidden">Show 14 questions</span>
        <span className="text-xs text-slate-400 hidden group-open:inline">Hide</span>
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
        {QUESTION_BANK.map((g) => (
          <div key={g.group} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.group}</p>
            <ul className="space-y-2">
              {g.questions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                  <span className="text-slate-300 shrink-0">—</span>{q}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button
          onClick={() => navigator.clipboard.writeText(all).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 no-print">
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
    </details>
  );
}

// ── Look it up yourself ───────────────────────────────────────────────────────

const LOOKUPS = [
  { name: "App Microscope", by: "Internet Safety Labs", what: "Independent safety labels from manual testing of apps.", url: "https://appmicroscope.org/" },
  { name: "Common Sense Privacy Program", by: "Common Sense Media", what: "Privacy evaluations of edtech products.", url: "https://privacy.commonsense.org/" },
  { name: "Exodus Privacy", by: "Exodus Privacy", what: "Trackers and permissions found in Android apps.", url: "https://reports.exodus-privacy.eu.org/" },
  { name: "USAspending", by: "U.S. Treasury", what: "Federal contracts and grants paid to the company.", url: "https://www.usaspending.gov/search" },
];

export function LookItUp({ name }: { name: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">Search these independent sources for <span className="font-semibold text-slate-700">{name}</span>:</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {LOOKUPS.map((l) => (
          <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
            <p className="text-sm font-semibold text-blue-700">{l.name} ↗</p>
            <p className="text-xs text-slate-400">{l.by}</p>
            <p className="text-sm text-slate-600 mt-1">{l.what}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
