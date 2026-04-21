"use client";

import type { VendorReport, DataFlowNode, NodeLayer, Citation } from "@/lib/types";
import { MetricCards } from "./MetricCards";
import { MermaidDiagram } from "./MermaidDiagram";
import { DiscrepancyList } from "./DiscrepancyList";
import { SubprocessorTable } from "./SubprocessorTable";
import { CompanyHistory } from "./CompanyHistory";
import { RedditPosts } from "./RedditPosts";

interface Props {
  report: VendorReport;
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-6">
      <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Citation badge [N] with tooltip ──────────────────────────────────────────
function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={`#citation-${citation.number}`}
      className="group relative inline-flex items-center mx-0.5 align-super"
      title={`${citation.label}: ${citation.context}`}
    >
      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1 py-0.5 rounded hover:bg-blue-500/30 transition-colors leading-none">
        [{citation.number}]
      </span>
      {/* hover tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-64 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 z-50 shadow-2xl gap-1">
        <span className="font-semibold text-blue-300 truncate">{citation.label}</span>
        <span className="text-slate-400 leading-relaxed">{citation.context}</span>
        <span className="text-slate-500 truncate mt-1">↗ {citation.url}</span>
      </span>
    </a>
  );
}

// Build a URL→citation lookup for annotating nodes by URL match
function useCiteByUrl(citations: Citation[]): (url: string | null | undefined) => Citation | undefined {
  const map = new Map<string, Citation>();
  for (const c of citations ?? []) {
    try {
      const hostname = new URL(c.url).hostname.replace(/^www\./, "");
      map.set(hostname, c);
      map.set(c.url, c);
    } catch { /* ignore */ }
  }
  return (url) => {
    if (!url) return undefined;
    if (map.has(url)) return map.get(url);
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return map.get(hostname);
    } catch { return undefined; }
  };
}

// ── Layer config ──────────────────────────────────────────────────────────────
const LAYER_CONFIG: Record<NodeLayer, { label: string; icon: string; colorClass: string }> = {
  "upstream-infra":        { label: "Cloud Infrastructure",        icon: "☁️", colorClass: "border-purple-500/40 bg-purple-500/10 text-purple-300" },
  "upstream-analytics":    { label: "Analytics & Tracking",        icon: "📊", colorClass: "border-red-500/40 bg-red-500/10 text-red-300" },
  "upstream-ads":          { label: "Advertising",                 icon: "📣", colorClass: "border-orange-500/40 bg-orange-500/10 text-orange-300" },
  "upstream-auth":         { label: "Auth & Identity",             icon: "🔑", colorClass: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" },
  "app":                   { label: "Application",                 icon: "🏫", colorClass: "border-blue-500/40 bg-blue-500/20 text-blue-200" },
  "integration-rostering": { label: "Rostering & SSO",            icon: "🔗", colorClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
  "integration-lms":       { label: "Learning Management",         icon: "📚", colorClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  "downstream-sis":        { label: "Student Information Systems", icon: "🗄️", colorClass: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  "downstream-state":      { label: "State & Federal Data",        icon: "🏛️", colorClass: "border-pink-500/40 bg-pink-500/10 text-pink-300" },
};

const UPSTREAM_LAYERS: NodeLayer[] = ["upstream-infra", "upstream-analytics", "upstream-ads", "upstream-auth"];
const DOWNSTREAM_LAYERS: NodeLayer[] = ["integration-rostering", "integration-lms", "downstream-sis", "downstream-state"];

const SOURCE_BADGE: Record<DataFlowNode["source"], string> = {
  declared: "bg-slate-700 text-slate-400",
  detected: "bg-red-500/20 text-red-300",
  inferred: "bg-yellow-500/20 text-yellow-300",
};

function NodeCard({ node, cite }: { node: DataFlowNode; cite?: Citation }) {
  const cfg = LAYER_CONFIG[node.layer];
  const inner = (
    <div className={`rounded-lg border px-3 py-2 text-sm space-y-1 ${cfg.colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium">{node.name}</span>
          {cite && <CiteBadge citation={cite} />}
        </div>
        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${SOURCE_BADGE[node.source]}`}>
          {node.source}
        </span>
      </div>
      <p className="text-xs opacity-70">{node.description}</p>
      {node.dataTypes.length > 0 && (
        <p className="text-xs opacity-60 italic">{node.dataTypes.slice(0, 3).join(" · ")}</p>
      )}
    </div>
  );

  if (node.url) {
    return (
      <a href={node.url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return inner;
}

function LayerGroup({ layer, nodes, getCite }: {
  layer: NodeLayer;
  nodes: DataFlowNode[];
  getCite: (url?: string | null) => Citation | undefined;
}) {
  if (!nodes.length) return null;
  const cfg = LAYER_CONFIG[layer];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {cfg.icon} {cfg.label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {nodes.map((n) => <NodeCard key={n.id} node={n} cite={getCite(n.url)} />)}
      </div>
    </div>
  );
}

function DataFlowPanel({ nodes, citations }: { nodes: DataFlowNode[]; citations: Citation[] }) {
  const getCite = useCiteByUrl(citations);
  const byLayer = new Map<NodeLayer, DataFlowNode[]>();
  for (const n of nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
    byLayer.get(n.layer)!.push(n);
  }

  const appNodes = byLayer.get("app") ?? [];
  const upstreamNodes = UPSTREAM_LAYERS.flatMap((l) => byLayer.get(l) ?? []);
  const downstreamNodes = DOWNSTREAM_LAYERS.flatMap((l) => byLayer.get(l) ?? []);

  return (
    <div className="space-y-6">
      {upstreamNodes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider px-2">⬆ Upstream Dependencies</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>
          {UPSTREAM_LAYERS.map((l) => (
            <LayerGroup key={l} layer={l} nodes={byLayer.get(l) ?? []} getCite={getCite} />
          ))}
        </div>
      )}

      {appNodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-blue-700/40" />
            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider px-2">▼ Application</span>
            <div className="h-px flex-1 bg-blue-700/40" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            {appNodes.map((n) => <NodeCard key={n.id} node={n} cite={getCite(n.url)} />)}
          </div>
        </div>
      )}

      {downstreamNodes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider px-2">⬇ Downstream Education Systems</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>
          {DOWNSTREAM_LAYERS.map((l) => (
            <LayerGroup key={l} layer={l} nodes={byLayer.get(l) ?? []} getCite={getCite} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Annotated citations list with anchor IDs ──────────────────────────────────
function CitationsList({ citations }: { citations: Citation[] }) {
  if (!citations?.length) return null;
  return (
    <ol className="space-y-3">
      {citations.map((c) => (
        <li key={c.number} id={`citation-${c.number}`} className="flex gap-3 text-sm scroll-mt-6 group">
          {/* anchor badge */}
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold flex items-center justify-center hover:bg-blue-500/30 transition-colors mt-0.5"
            title="Open source"
          >
            {c.number}
          </a>
          <div className="flex-1 space-y-1">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-300 hover:text-blue-200 hover:underline leading-tight"
            >
              {c.label} ↗
            </a>
            <p className="text-xs text-slate-400 leading-relaxed">{c.context}</p>
            <p className="text-xs text-slate-600 font-mono truncate">{c.url}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Source document pill with optional citation badge ─────────────────────────
function DocLink({ href, label, cite }: { href: string; label: string; cite?: Citation }) {
  return (
    <div className="flex items-center gap-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors"
      >
        {label} ↗
      </a>
      {cite && <CiteBadge citation={cite} />}
    </div>
  );
}

export function AnalysisReport({ report }: Props) {
  const docs = report.privacyDocuments;
  const citations = report.citations ?? [];
  const getCite = useCiteByUrl(citations);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{report.vendorName}</h1>
        {report.appName !== report.vendorName && (
          <p className="text-slate-400 text-sm mt-1">App: {report.appName}</p>
        )}
      </div>

      {/* Company ownership */}
      {report.companyOwnership && (
        <Section title="Company Ownership & Acquisition History">
          <CompanyHistory ownership={report.companyOwnership} />
        </Section>
      )}

      {/* Metric cards */}
      <MetricCards report={report} />

      {/* Source documents */}
      {(docs.privacyPolicyUrl || docs.dpaUrl || docs.subprocessorListUrl) && (
        <Section title="Source Documents">
          <div className="flex flex-wrap gap-3 items-start">
            {docs.privacyPolicyUrl && (
              <DocLink href={docs.privacyPolicyUrl} label="Privacy Policy" cite={getCite(docs.privacyPolicyUrl)} />
            )}
            {docs.dpaUrl && (
              <DocLink href={docs.dpaUrl} label="Data Processing Agreement" cite={getCite(docs.dpaUrl)} />
            )}
            {docs.subprocessorListUrl && (
              <DocLink href={docs.subprocessorListUrl} label="Subprocessor List" cite={getCite(docs.subprocessorListUrl)} />
            )}
            {docs.appStoreUrl && (
              <DocLink href={docs.appStoreUrl} label="App Store" cite={getCite(docs.appStoreUrl)} />
            )}
            {docs.playStoreUrl && (
              <DocLink href={docs.playStoreUrl} label="Play Store" cite={getCite(docs.playStoreUrl)} />
            )}
          </div>
          {docs.lastUpdated && (
            <p className="text-xs text-slate-500 mt-2">Privacy policy last updated: {docs.lastUpdated}</p>
          )}
        </Section>
      )}

      {/* Data Flow Diagram */}
      {report.diagramCode && (
        <Section title="Data Flow Diagram">
          <p className="text-xs text-slate-500 mb-3">
            Full chain: upstream cloud services → app → integration layer → downstream education systems.
            <span className="ml-1 text-slate-600">Hover to preview · Click to open zoomable full-screen view.</span>
          </p>
          <MermaidDiagram code={report.diagramCode} />
        </Section>
      )}

      {/* Layered data flow panel */}
      {report.dataFlowNodes?.length > 0 && (
        <Section title="Full Data Flow — Node Details">
          <p className="text-xs text-slate-500 mb-1">
            Each node links to its privacy page. Badge <span className="font-mono text-blue-400 bg-blue-500/10 px-1 rounded">[N]</span> links to the citation that verified it — hover for a preview.
          </p>
          <DataFlowPanel nodes={report.dataFlowNodes} citations={citations} />
        </Section>
      )}

      {/* Discrepancies */}
      <Section title="Discrepancies Flagged">
        <DiscrepancyList report={report} />
      </Section>

      {/* Subprocessors */}
      {report.subprocessors?.length > 0 && (
        <Section title={`Subprocessors (${report.subprocessors.length} declared or detected)`}>
          <SubprocessorTable report={report} citations={citations} />
        </Section>
      )}

      {/* Trackers */}
      {report.trackers?.length > 0 && (
        <Section title={`Trackers Detected via Exodus Privacy (${report.trackers.length})`}>
          <div className="flex flex-wrap gap-2">
            {report.trackers.map((t, i) => (
              <div key={i} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                {t.website ? (
                  <a href={t.website} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-red-300 hover:underline">{t.name}</a>
                ) : (
                  <span className="font-medium text-red-300">{t.name}</span>
                )}
                <span className="ml-1 text-xs text-slate-500">{t.category}</span>
                {t.website && getCite(t.website) && <CiteBadge citation={getCite(t.website)!} />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Vendor questions */}
      <Section title="Questions to Send the Vendor">
        <ol className="space-y-3">
          {report.vendorQuestions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-slate-300 text-sm leading-relaxed">{q}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Human-in-the-loop steps */}
      <Section title="Steps That Require Human Verification">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <p className="text-amber-200 text-xs font-medium mb-3 uppercase tracking-wide">
            This automated analysis cannot substitute for the following:
          </p>
          <ul className="space-y-2">
            {report.humanInLoopSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-amber-400 shrink-0">→</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Reddit discussion */}
      <Section title="Reddit Community Discussion">
        <p className="text-xs text-slate-500 mb-3">
          Live posts from Reddit — pulled directly from Reddit's API, not AI-generated.
          Prioritises early childhood education and edtech subreddits.
        </p>
        <RedditPosts vendorName={report.vendorName} />
      </Section>

      {/* Citations — anchored, numbered, full context */}
      {citations.length > 0 && (
        <Section id="citations" title="Citations">
          <p className="text-xs text-slate-500 mb-3">
            Every badge <span className="font-mono text-blue-400 bg-blue-500/10 px-1 rounded">[N]</span> in this report links here.
            Click any number badge or citation title to open the source.
          </p>
          <CitationsList citations={citations} />
        </Section>
      )}
    </div>
  );
}
