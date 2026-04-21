"use client";

import type {
  CountyReport,
  EduDataSystem,
  CrossSectorLinkage,
  DataSafeguard,
  EduSystemVendor,
  Citation,
} from "@/lib/types";

// ── Section wrapper ───────────────────────────────────────────────────────────

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
    <section id={id} className="space-y-4 scroll-mt-6">
      <div className="border-b border-slate-700 pb-2 space-y-0.5">
        <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Citation badge with tooltip ───────────────────────────────────────────────

function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={`#county-citation-${citation.number}`}
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

function useCiteByNumber(citations: Citation[]) {
  const map = new Map<number, Citation>();
  for (const c of citations ?? []) map.set(c.number, c);
  return (num: number): Citation | undefined => map.get(num);
}

// ── Vendor pill ───────────────────────────────────────────────────────────────

function VendorPill({ vendor }: { vendor: EduSystemVendor }) {
  const contractColors = {
    awarded:     "bg-orange-500/15 border-orange-500/30 text-orange-300",
    "in-house":  "bg-blue-500/15 border-blue-500/30 text-blue-300",
    partnership: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    unknown:     "bg-slate-700/50 border-slate-600 text-slate-400",
  };
  const badge = contractColors[vendor.contractType];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${badge}`}>
      <div>
        {vendor.website ? (
          <a href={vendor.website} target="_blank" rel="noopener noreferrer"
            className="font-semibold hover:underline">
            {vendor.name}
          </a>
        ) : (
          <span className="font-semibold">{vendor.name}</span>
        )}
        <div className="text-[11px] opacity-70 mt-0.5">{vendor.role}</div>
      </div>
      <span className="ml-auto text-[10px] opacity-60 shrink-0 capitalize">{vendor.contractType}</span>
    </div>
  );
}

// ── Education system card ─────────────────────────────────────────────────────

const SYSTEM_TYPE_STYLES: Record<string, { border: string; bg: string; badge: string; text: string; icon: string }> = {
  SLDS:           { border: "border-emerald-500/40", bg: "bg-emerald-950/30", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", text: "text-emerald-300", icon: "📊" },
  ECIDS:          { border: "border-purple-500/40",  bg: "bg-purple-950/30",  badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",   text: "text-purple-300",  icon: "🧒" },
  KEA:            { border: "border-blue-500/40",    bg: "bg-blue-950/30",    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",         text: "text-blue-300",    icon: "📝" },
  SIS:            { border: "border-amber-500/40",   bg: "bg-amber-950/30",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",       text: "text-amber-300",   icon: "🗄️" },
  federal:        { border: "border-slate-500/40",   bg: "bg-slate-800/30",   badge: "bg-slate-600/50 text-slate-300 border-slate-500/40",       text: "text-slate-300",   icon: "🏛️" },
  "cross-sector": { border: "border-cyan-500/40",    bg: "bg-cyan-950/30",    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",           text: "text-cyan-300",    icon: "🔗" },
  other:          { border: "border-slate-600/40",   bg: "bg-slate-800/30",   badge: "bg-slate-700/50 text-slate-400 border-slate-600/40",       text: "text-slate-400",   icon: "📁" },
};

const SCOPE_LABEL: Record<string, string> = {
  "county-district": "District/County",
  state:             "Statewide",
  federal:           "Federal",
};

const STATUS_COLORS: Record<string, string> = {
  active:        "text-emerald-400",
  planned:       "text-yellow-400",
  discontinued:  "text-red-400",
  unknown:       "text-slate-500",
};

function EduSystemCard({
  system,
  getCite,
}: {
  system: EduDataSystem;
  getCite: (n: number) => Citation | undefined;
}) {
  const style = SYSTEM_TYPE_STYLES[system.type] ?? SYSTEM_TYPE_STYLES.other;

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-xl mt-0.5 shrink-0">{style.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {system.url ? (
                <a href={system.url} target="_blank" rel="noopener noreferrer"
                  className={`font-bold text-base leading-snug hover:underline ${style.text}`}>
                  {system.name} ↗
                </a>
              ) : (
                <p className={`font-bold text-base leading-snug ${style.text}`}>{system.name}</p>
              )}
              {system.citationNumbers.map((n) => {
                const c = getCite(n);
                return c ? <CiteBadge key={n} citation={c} /> : null;
              })}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{system.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${style.badge}`}>
            {system.type}
          </span>
          <span className="text-[10px] text-slate-500">{SCOPE_LABEL[system.scope]}</span>
          <span className={`text-[10px] font-medium capitalize ${STATUS_COLORS[system.status]}`}>
            {system.status}
          </span>
        </div>
      </div>

      {/* Data elements */}
      {system.dataElements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data collected</p>
          <div className="flex flex-wrap gap-1">
            {system.dataElements.map((el, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/50">
                {el}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vendors */}
      {system.vendors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Technology vendors
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {system.vendors.map((v, i) => <VendorPill key={i} vendor={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cross-sector linkage card ─────────────────────────────────────────────────

const SECTOR_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  "workforce-LER": { icon: "💼", color: "text-yellow-300", bg: "bg-yellow-950/30", border: "border-yellow-500/30" },
  health:          { icon: "🏥", color: "text-pink-300",   bg: "bg-pink-950/30",   border: "border-pink-500/30" },
  justice:         { icon: "⚖️", color: "text-slate-300",  bg: "bg-slate-800/50",  border: "border-slate-500/30" },
  military:        { icon: "🎖️", color: "text-blue-300",   bg: "bg-blue-950/30",   border: "border-blue-500/30" },
  migration:       { icon: "🌍", color: "text-green-300",  bg: "bg-green-950/30",  border: "border-green-500/30" },
  other:           { icon: "🔗", color: "text-cyan-300",   bg: "bg-cyan-950/30",   border: "border-cyan-500/30" },
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
    <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-5 space-y-3`}>
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-sm ${meta.color}`}>{linkage.sectorLabel}</p>
            {linkage.url && (
              <a href={linkage.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline">↗</a>
            )}
            {linkage.citationNumbers.map((n) => {
              const c = getCite(n);
              return c ? <CiteBadge key={n} citation={c} /> : null;
            })}
          </div>
          <p className="font-semibold text-white text-sm mt-0.5">{linkage.systemName}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{linkage.description}</p>
        </div>
      </div>

      {linkage.dataShared.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data shared</p>
          <div className="flex flex-wrap gap-1">
            {linkage.dataShared.map((d, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/50">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        {linkage.legalBasis && (
          <div className="bg-slate-800/60 rounded-lg p-3 space-y-0.5">
            <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Legal basis</p>
            <p className="text-slate-300">{linkage.legalBasis}</p>
          </div>
        )}
        {linkage.safeguards.length > 0 && (
          <div className="bg-slate-800/60 rounded-lg p-3 space-y-1">
            <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Safeguards</p>
            {linkage.safeguards.map((s, i) => (
              <p key={i} className="text-slate-300 text-[11px]">• {s}</p>
            ))}
          </div>
        )}
      </div>

      {linkage.vendors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Vendors</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {linkage.vendors.map((v, i) => <VendorPill key={i} vendor={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Safeguard row ─────────────────────────────────────────────────────────────

const SAFEGUARD_SCOPE_LABEL: Record<string, string> = {
  federal:           "Federal",
  state:             "State",
  "county-district": "County/District",
};

const CATEGORY_LABEL: Record<string, string> = {
  "federal-law": "Federal law",
  "state-law":   "State law",
  policy:        "Policy",
  technical:     "Technical",
  gap:           "Gap",
};

function SafeguardRow({
  safeguard,
  getCite,
}: {
  safeguard: DataSafeguard;
  getCite: (n: number) => Citation | undefined;
}) {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/30">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {safeguard.url ? (
            <a href={safeguard.url} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-sm text-slate-200 hover:underline">
              {safeguard.name} ↗
            </a>
          ) : (
            <p className="font-semibold text-sm text-slate-200">{safeguard.name}</p>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
            {CATEGORY_LABEL[safeguard.category] ?? safeguard.category}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
            {SAFEGUARD_SCOPE_LABEL[safeguard.scope] ?? safeguard.scope}
          </span>
          {safeguard.citationNumbers.map((n) => {
            const c = getCite(n);
            return c ? <CiteBadge key={n} citation={c} /> : null;
          })}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{safeguard.description}</p>
      </div>
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
            className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold flex items-center justify-center hover:bg-blue-500/30 transition-colors mt-0.5">
            {c.number}
          </a>
          <div className="flex-1 space-y-1.5">
            <a href={c.url} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-blue-300 hover:text-blue-200 hover:underline text-sm leading-tight">
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

  const lawSafeguards = report.safeguards.filter((s) => ["federal-law","state-law"].includes(s.category));
  const gapSafeguards = report.safeguards.filter((s) => s.category === "gap");
  const otherSafeguards = report.safeguards.filter((s) => ["policy","technical"].includes(s.category));

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {report.countyName} County, {report.stateAbbr}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{report.stateName}</p>
            <p className="text-xs text-slate-600 mt-1">
              FIPS {report.fipsCode} · Analysis date:{" "}
              {new Date(report.analysisDate).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          <div className="px-4 py-2 rounded-full text-sm font-semibold border bg-blue-500/15 text-blue-300 border-blue-500/30">
            PreK–K12 Data Systems
          </div>
        </div>

        {/* Data availability note */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300/80 leading-relaxed">
          <span className="font-semibold text-amber-300">Data scope note: </span>
          {report.dataAvailabilityNote}
        </div>
      </div>

      {/* Key Findings */}
      {report.keyFindings?.length > 0 && (
        <Section title="Key Findings"
          subtitle="What this research found about the education data ecosystem serving this county.">
          <div className="grid gap-3 sm:grid-cols-2">
            {report.keyFindings.map((f, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-slate-300 text-sm leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SLDS */}
      {sldsSystems.length > 0 && (
        <Section
          title="P-20W Statewide Longitudinal Data System (SLDS)"
          subtitle="The state's backbone education data warehouse tracking students from early childhood through workforce. Applies to all counties in the state.">
          <div className="space-y-4">
            {sldsSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* ECIDS */}
      {ecidsSystems.length > 0 && (
        <Section
          title="Early Childhood Integrated Data System (ECIDS)"
          subtitle="State system integrating data from preschool, Head Start, childcare, and other early childhood programs before kindergarten.">
          <div className="space-y-4">
            {ecidsSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* KEA */}
      {keaSystems.length > 0 && (
        <Section
          title="Kindergarten Entry Assessment (KEA)"
          subtitle="How the state assesses children's readiness at kindergarten entry and what data is collected.">
          <div className="space-y-4">
            {keaSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* Federal systems */}
      {federalSystems.length > 0 && (
        <Section
          title="Federal Data Reporting & Collections"
          subtitle="Federally mandated data submissions that flow from state/district systems to federal agencies.">
          <div className="space-y-4">
            {federalSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* Other systems */}
      {otherSystems.length > 0 && (
        <Section title="Additional Education Data Systems">
          <div className="space-y-4">
            {otherSystems.map((s, i) => <EduSystemCard key={i} system={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* Cross-sector linkages */}
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

      {/* Safeguards: Laws */}
      {lawSafeguards.length > 0 && (
        <Section
          title="Applicable Laws & Protections"
          subtitle="Federal and state laws governing how education data can be collected, shared, and used.">
          <div className="space-y-3">
            {lawSafeguards.map((s, i) => <SafeguardRow key={i} safeguard={s} getCite={getCite} />)}
          </div>
        </Section>
      )}

      {/* Safeguards: Other policies + Gaps together */}
      {(otherSafeguards.length > 0 || gapSafeguards.length > 0) && (
        <Section
          title="Policies, Technical Controls & Gaps"
          subtitle="Administrative policies and technical safeguards.">
          <div className="space-y-3">
            {[...otherSafeguards, ...gapSafeguards].map((s, i) => (
              <SafeguardRow key={i} safeguard={s} getCite={getCite} />
            ))}
          </div>
        </Section>
      )}

      {/* Questions to ask */}
      {report.questionsToAsk?.length > 0 && (
        <Section
          title="Questions to Ask Your School Board or State DOE"
          subtitle="Specific questions for parents, advocates, or journalists based on gaps found in this analysis.">
          <ol className="space-y-4">
            {report.questionsToAsk.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-slate-300 text-sm leading-relaxed pt-0.5">{q}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Citations */}
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
