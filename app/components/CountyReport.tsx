"use client";

import { useState } from "react";
import type {
  CountyReport,
  EduDataSystem,
  CrossSectorLinkage,
  DataSafeguard,
  EduSystemVendor,
  Citation,
} from "@/lib/types";

// ── Design tokens ─────────────────────────────────────────────────────────────

// Semantic chip: text-xs font-medium px-2.5 py-0.5 rounded-full border
const chip = (color: string) =>
  `text-xs font-medium px-2.5 py-0.5 rounded-full border bg-${color}-100 text-${color}-700 border-${color}-200`;

// ── Shared components ─────────────────────────────────────────────────────────

function Section({
  id,
  title,
  subtitle,
  children,
}: {
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

function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={`#county-citation-${citation.number}`}
      className="group relative inline-flex items-center mx-0.5 align-super"
    >
      <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded hover:bg-blue-100 transition-colors leading-none">
        [{citation.number}]
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 bg-white border border-slate-200 rounded-xl p-3 text-xs z-50 shadow-xl gap-1.5">
        <span className="font-semibold text-blue-700">{citation.label}</span>
        <span className="text-slate-600 leading-relaxed">{citation.context}</span>
        <span className="text-slate-400 truncate font-mono text-[10px]">{citation.url}</span>
      </span>
    </a>
  );
}

function useCiteByNumber(citations: Citation[]) {
  const map = new Map<number, Citation>();
  for (const c of citations ?? []) map.set(c.number, c);
  return (num: number): Citation | undefined => map.get(num);
}

// ── Data tag chip ─────────────────────────────────────────────────────────────

function DataTag({ label }: { label: string }) {
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      {label}
    </span>
  );
}

// ── Vendor pill ───────────────────────────────────────────────────────────────

const CONTRACT_STYLES: Record<EduSystemVendor["contractType"], { pill: string; dot: string; label: string }> = {
  awarded:     { pill: "bg-orange-50 border-orange-200 text-orange-800", dot: "bg-orange-400", label: "Awarded contract" },
  "in-house":  { pill: "bg-blue-50 border-blue-200 text-blue-800",       dot: "bg-blue-400",   label: "In-house" },
  partnership: { pill: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500", label: "Partnership" },
  unknown:     { pill: "bg-slate-50 border-slate-200 text-slate-600",    dot: "bg-slate-400",  label: "Unknown" },
};

function VendorPill({ vendor }: { vendor: EduSystemVendor }) {
  const s = CONTRACT_STYLES[vendor.contractType];
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${s.pill}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot} mt-1 shrink-0`} />
      <div className="min-w-0">
        {vendor.website ? (
          <a href={vendor.website} target="_blank" rel="noopener noreferrer"
            className="font-semibold hover:underline leading-tight block">
            {vendor.name}
          </a>
        ) : (
          <span className="font-semibold leading-tight block">{vendor.name}</span>
        )}
        <span className="text-[11px] opacity-70 mt-0.5 block">{vendor.role}</span>
        {vendor.notes && (
          <span className="text-[11px] opacity-60 mt-0.5 block italic">{vendor.notes}</span>
        )}
      </div>
      <span className="ml-auto text-[10px] opacity-50 shrink-0 mt-0.5">{s.label}</span>
    </div>
  );
}

// ── Education system card ─────────────────────────────────────────────────────

const SYSTEM_TYPE_META: Record<string, {
  topBar: string; badge: string; nameColor: string; icon: string;
}> = {
  SLDS:           { topBar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", nameColor: "text-emerald-700", icon: "📊" },
  ECIDS:          { topBar: "bg-purple-500",  badge: "bg-purple-100 text-purple-700 border-purple-200",   nameColor: "text-purple-700",  icon: "🧒" },
  KEA:            { topBar: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 border-blue-200",         nameColor: "text-blue-700",    icon: "📝" },
  SIS:            { topBar: "bg-amber-500",   badge: "bg-amber-100 text-amber-700 border-amber-200",       nameColor: "text-amber-700",   icon: "🗄️" },
  federal:        { topBar: "bg-slate-500",   badge: "bg-slate-100 text-slate-700 border-slate-300",       nameColor: "text-slate-800",   icon: "🏛️" },
  "cross-sector": { topBar: "bg-cyan-500",    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",         nameColor: "text-cyan-700",    icon: "🔗" },
  other:          { topBar: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200",       nameColor: "text-slate-700",   icon: "📁" },
};

const SCOPE_LABEL: Record<string, string> = {
  "county-district": "District/County",
  state:             "Statewide",
  federal:           "Federal",
};

const STATUS_META: Record<string, { dot: string; text: string; label: string }> = {
  active:       { dot: "bg-emerald-500", text: "text-emerald-700", label: "Active" },
  planned:      { dot: "bg-amber-500",   text: "text-amber-700",   label: "Planned" },
  discontinued: { dot: "bg-red-500",     text: "text-red-600",     label: "Discontinued" },
  unknown:      { dot: "bg-slate-400",   text: "text-slate-500",   label: "Unknown" },
};

function EduSystemCard({
  system,
  getCite,
}: {
  system: EduDataSystem;
  getCite: (n: number) => Citation | undefined;
}) {
  const meta = SYSTEM_TYPE_META[system.type] ?? SYSTEM_TYPE_META.other;
  const status = STATUS_META[system.status] ?? STATUS_META.unknown;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Colored top accent bar */}
      <div className={`h-1.5 ${meta.topBar}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xl mt-0.5 shrink-0">{meta.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {system.url ? (
                  <a href={system.url} target="_blank" rel="noopener noreferrer"
                    className={`font-bold text-base leading-snug hover:underline ${meta.nameColor}`}>
                    {system.name} ↗
                  </a>
                ) : (
                  <p className={`font-bold text-base leading-snug ${meta.nameColor}`}>{system.name}</p>
                )}
                {system.citationNumbers.map((n) => {
                  const c = getCite(n);
                  return c ? <CiteBadge key={n} citation={c} /> : null;
                })}
              </div>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{system.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
              {system.type}
            </span>
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
              {SCOPE_LABEL[system.scope]}
            </span>
            <span className={`flex items-center gap-1 text-[11px] font-medium ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>

        {/* Data elements */}
        {system.dataElements.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data collected</p>
            <div className="flex flex-wrap gap-1.5">
              {system.dataElements.map((el, i) => <DataTag key={i} label={el} />)}
            </div>
          </div>
        )}

        {/* Vendors */}
        {system.vendors.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Technology vendors</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {system.vendors.map((v, i) => <VendorPill key={i} vendor={v} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cross-sector linkage card ─────────────────────────────────────────────────

const SECTOR_META: Record<string, { topBar: string; badge: string; icon: string; nameColor: string }> = {
  "workforce-LER": { topBar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "💼", nameColor: "text-yellow-800" },
  health:          { topBar: "bg-pink-500",   badge: "bg-pink-100 text-pink-800 border-pink-200",       icon: "🏥", nameColor: "text-pink-800" },
  justice:         { topBar: "bg-slate-600",  badge: "bg-slate-100 text-slate-800 border-slate-300",    icon: "⚖️", nameColor: "text-slate-800" },
  military:        { topBar: "bg-blue-700",   badge: "bg-blue-100 text-blue-800 border-blue-200",       icon: "🎖️", nameColor: "text-blue-800" },
  migration:       { topBar: "bg-green-600",  badge: "bg-green-100 text-green-800 border-green-200",    icon: "🌍", nameColor: "text-green-800" },
  other:           { topBar: "bg-cyan-500",   badge: "bg-cyan-100 text-cyan-800 border-cyan-200",       icon: "🔗", nameColor: "text-cyan-800" },
};

function CrossSectorCard({
  linkage,
  getCite,
}: {
  linkage: CrossSectorLinkage;
  getCite: (n: number) => Citation | undefined;
}) {
  const meta = SECTOR_META[linkage.sector] ?? SECTOR_META.other;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className={`h-1.5 ${meta.topBar}`} />
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                {linkage.sectorLabel}
              </span>
              {linkage.url && (
                <a href={linkage.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium">↗ Source</a>
              )}
              {linkage.citationNumbers.map((n) => {
                const c = getCite(n);
                return c ? <CiteBadge key={n} citation={c} /> : null;
              })}
            </div>
            <p className={`font-bold text-base leading-snug ${meta.nameColor}`}>{linkage.systemName}</p>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{linkage.description}</p>
          </div>
        </div>

        {/* Data shared */}
        {linkage.dataShared.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data shared</p>
            <div className="flex flex-wrap gap-1.5">
              {linkage.dataShared.map((d, i) => <DataTag key={i} label={d} />)}
            </div>
          </div>
        )}

        {/* Legal basis + Safeguards */}
        {(linkage.legalBasis || linkage.safeguards.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            {linkage.legalBasis && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Legal basis</p>
                <p className="text-sm text-blue-900">{linkage.legalBasis}</p>
              </div>
            )}
            {linkage.safeguards.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Safeguards</p>
                <ul className="space-y-0.5">
                  {linkage.safeguards.map((s, i) => (
                    <li key={i} className="text-sm text-emerald-900 flex items-start gap-1.5">
                      <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Vendors */}
        {linkage.vendors.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vendors</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {linkage.vendors.map((v, i) => <VendorPill key={i} vendor={v} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Safeguard row ─────────────────────────────────────────────────────────────

const SAFEGUARD_CATEGORY_META: Record<string, {
  leftBar: string; bg: string; badgeBg: string; badgeText: string; label: string;
}> = {
  "federal-law": { leftBar: "border-l-blue-500",    bg: "bg-blue-50",    badgeBg: "bg-blue-100",   badgeText: "text-blue-700",   label: "Federal law" },
  "state-law":   { leftBar: "border-l-indigo-500",  bg: "bg-indigo-50",  badgeBg: "bg-indigo-100", badgeText: "text-indigo-700", label: "State law" },
  policy:        { leftBar: "border-l-slate-400",   bg: "bg-slate-50",   badgeBg: "bg-slate-100",  badgeText: "text-slate-600",  label: "Policy" },
  technical:     { leftBar: "border-l-purple-500",  bg: "bg-purple-50",  badgeBg: "bg-purple-100", badgeText: "text-purple-700", label: "Technical" },
  gap:           { leftBar: "border-l-red-500",     bg: "bg-red-50",     badgeBg: "bg-red-100",    badgeText: "text-red-700",    label: "Gap ⚠" },
};

const SAFEGUARD_SCOPE_LABEL: Record<string, string> = {
  federal:           "Federal",
  state:             "State",
  "county-district": "County/District",
};

function SafeguardRow({
  safeguard,
  getCite,
}: {
  safeguard: DataSafeguard;
  getCite: (n: number) => Citation | undefined;
}) {
  const meta = SAFEGUARD_CATEGORY_META[safeguard.category] ?? SAFEGUARD_CATEGORY_META.policy;
  return (
    <div className={`border-l-4 ${meta.leftBar} ${meta.bg} rounded-r-xl p-4 space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        {safeguard.url ? (
          <a href={safeguard.url} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-sm text-slate-800 hover:underline">
            {safeguard.name} ↗
          </a>
        ) : (
          <p className="font-semibold text-sm text-slate-800">{safeguard.name}</p>
        )}
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.badgeBg} ${meta.badgeText}`}>
          {meta.label}
        </span>
        <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
          {SAFEGUARD_SCOPE_LABEL[safeguard.scope] ?? safeguard.scope}
        </span>
        {safeguard.citationNumbers.map((n) => {
          const c = getCite(n);
          return c ? <CiteBadge key={n} citation={c} /> : null;
        })}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{safeguard.description}</p>
    </div>
  );
}

// ── Editable questions ────────────────────────────────────────────────────────

function EditableQuestions({ initialQuestions }: { initialQuestions: string[] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState("");

  function startEdit(i: number) { setEditingIdx(i); setEditText(questions[i]); }
  function saveEdit(i: number) {
    const t = editText.trim();
    if (!t) return;
    const next = [...questions]; next[i] = t;
    setQuestions(next); setEditingIdx(null);
  }
  function deleteQuestion(i: number) {
    setQuestions(questions.filter((_, idx) => idx !== i));
    if (editingIdx === i) setEditingIdx(null);
  }
  function addQuestion() {
    const t = newText.trim();
    if (!t) return;
    setQuestions([...questions, t]);
    setNewText(""); setAddingNew(false);
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={i} className="flex gap-3 group">
            <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center mt-0.5 border border-blue-200">
              {i + 1}
            </span>
            {editingIdx === i ? (
              <div className="flex-1 space-y-2">
                <textarea
                  className="w-full bg-white border border-blue-400 rounded-lg p-2.5 text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={3} value={editText}
                  onChange={e => setEditText(e.target.value)} autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(i)} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Save</button>
                  <button onClick={() => setEditingIdx(null)} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-start justify-between gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-slate-700 text-sm leading-relaxed">{q}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(i)} title="Edit" className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded">✎</button>
                  <button onClick={() => deleteQuestion(i)} title="Delete" className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded">✕</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {addingNew ? (
        <div className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center mt-0.5 border border-blue-200">
            {questions.length + 1}
          </span>
          <div className="flex-1 space-y-2">
            <textarea
              className="w-full bg-white border border-blue-400 rounded-lg p-2.5 text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3} value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Type your question…" autoFocus
            />
            <div className="flex gap-2">
              <button onClick={addQuestion} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Add</button>
              <button onClick={() => { setAddingNew(false); setNewText(""); }} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <span className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 group-hover:border-blue-400 flex items-center justify-center text-lg leading-none transition-colors">+</span>
          Add a question
        </button>
      )}
    </div>
  );
}

// ── Citations list ────────────────────────────────────────────────────────────

function CitationsList({ citations }: { citations: Citation[] }) {
  if (!citations?.length) return null;
  return (
    <ol className="space-y-4">
      {citations.map((c) => (
        <li key={c.number} id={`county-citation-${c.number}`} className="flex gap-4 scroll-mt-6">
          <a href={c.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-mono font-bold flex items-center justify-center hover:bg-blue-100 transition-colors mt-0.5">
            {c.number}
          </a>
          <div className="flex-1 space-y-1">
            <a href={c.url} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-blue-700 hover:text-blue-600 hover:underline text-sm leading-snug block">
              {c.label} ↗
            </a>
            <p className="text-sm text-slate-600 leading-relaxed">{c.context}</p>
            <p className="text-[11px] text-slate-400 font-mono truncate">{c.url}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  report: CountyReport;
}

export function CountyReport({ report }: Props) {
  const getCite = useCiteByNumber(report.citations ?? []);

  const sldsSystems    = report.educationSystems.filter((s) => s.type === "SLDS");
  const ecidsSystems   = report.educationSystems.filter((s) => s.type === "ECIDS");
  const keaSystems     = report.educationSystems.filter((s) => s.type === "KEA");
  const federalSystems = report.educationSystems.filter((s) => s.type === "federal");
  const otherSystems   = report.educationSystems.filter((s) => !["SLDS","ECIDS","KEA","federal"].includes(s.type));

  const lawSafeguards   = report.safeguards.filter((s) => ["federal-law","state-law"].includes(s.category));
  const gapSafeguards   = report.safeguards.filter((s) => s.category === "gap");
  const otherSafeguards = report.safeguards.filter((s) => ["policy","technical"].includes(s.category));

  return (
    <div className="space-y-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {report.countyName} County
            </h1>
            <p className="text-slate-500 text-base mt-1 font-medium">{report.stateName}</p>
            <p className="text-sm text-slate-400 mt-1">
              FIPS {report.fipsCode} · Analysis:{" "}
              {new Date(report.analysisDate).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            PreK–K12 Data Systems
          </span>
        </div>

        {/* Data availability note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
          <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
          <div className="text-sm">
            <span className="font-semibold text-amber-800">Data scope note: </span>
            <span className="text-amber-800">{report.dataAvailabilityNote}</span>
          </div>
        </div>
      </div>

      {/* ── Key Findings ───────────────────────────────────────────────── */}
      {report.keyFindings?.length > 0 && (
        <Section title="Key Findings"
          subtitle="What this research found about the education data ecosystem serving this county.">
          <div className="grid gap-3 sm:grid-cols-2">
            {report.keyFindings.map((f, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5 border border-blue-200">
                  {i + 1}
                </span>
                <p className="text-slate-700 text-sm leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── SLDS ───────────────────────────────────────────────────────── */}
      {sldsSystems.length > 0 && (
        <Section
          title="P-20W Statewide Longitudinal Data System (SLDS)"
          subtitle="The state's backbone education data warehouse tracking students from early childhood through workforce. Applies to all counties in the state.">
          <div className="space-y-4">
            {sldsSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ── ECIDS ──────────────────────────────────────────────────────── */}
      {ecidsSystems.length > 0 && (
        <Section
          title="Early Childhood Integrated Data System (ECIDS)"
          subtitle="State system integrating data from preschool, Head Start, childcare, and other early childhood programs before kindergarten.">
          <div className="space-y-4">
            {ecidsSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ── KEA ────────────────────────────────────────────────────────── */}
      {keaSystems.length > 0 && (
        <Section
          title="Kindergarten Entry Assessment (KEA)"
          subtitle="How the state assesses children's readiness at kindergarten entry and what data is collected.">
          <div className="space-y-4">
            {keaSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ── Federal systems ────────────────────────────────────────────── */}
      {federalSystems.length > 0 && (
        <Section
          title="Federal Data Reporting & Collections"
          subtitle="Federally mandated data submissions that flow from state/district systems to federal agencies.">
          <div className="space-y-4">
            {federalSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ── Other systems ──────────────────────────────────────────────── */}
      {otherSystems.length > 0 && (
        <Section title="Additional Education Data Systems">
          <div className="space-y-4">
            {otherSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ── Cross-sector linkages ───────────────────────────────────────── */}
      {report.crossSectorLinkages?.length > 0 && (
        <Section
          title="Cross-Sector Data Linkages"
          subtitle="Where education data flows beyond the school system — into workforce, health, justice, military, and migration systems.">
          <div className="space-y-4">
            {report.crossSectorLinkages.map((l, i) => (
              <CrossSectorCard key={i} linkage={l} getCite={getCite} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Laws & Protections ─────────────────────────────────────────── */}
      {lawSafeguards.length > 0 && (
        <Section
          title="Applicable Laws & Protections"
          subtitle="Federal and state laws governing how education data can be collected, shared, and used.">
          <div className="space-y-3">
            {lawSafeguards.map((s, i) => <SafeguardRow key={i} safeguard={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ── Policies, Controls & Gaps ──────────────────────────────────── */}
      {(otherSafeguards.length > 0 || gapSafeguards.length > 0) && (
        <Section
          title="Policies, Technical Controls & Gaps"
          subtitle="Administrative policies, technical safeguards, and identified gaps in protection.">
          <div className="space-y-3">
            {[...otherSafeguards, ...gapSafeguards].map((s, i) => (
              <SafeguardRow key={i} safeguard={s} getCite={getCite} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Questions ──────────────────────────────────────────────────── */}
      {report.questionsToAsk?.length > 0 && (
        <Section
          title="Questions to Ask Your School Board or State DOE"
          subtitle="Specific questions for parents, advocates, or journalists based on gaps found in this analysis.">
          <EditableQuestions initialQuestions={report.questionsToAsk} />
        </Section>
      )}

      {/* ── Citations ──────────────────────────────────────────────────── */}
      {report.citations?.length > 0 && (
        <Section
          id="county-citations"
          title="Sources & Citations"
          subtitle="Every claim in this report is backed by a source. Click any [N] badge above to jump to its source.">
          <CitationsList citations={report.citations} />
        </Section>
      )}

    </div>
  );
}
