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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
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

const UPSTREAM_LAYERS: NodeLayer[] = [
  "upstream-infra", "upstream-analytics", "upstream-ads", "upstream-auth",
];
const DOWNSTREAM_LAYERS: NodeLayer[] = [
  "integration-rostering", "integration-lms", "downstream-sis", "downstream-state",
];

const SOURCE_BADGE: Record<DataFlowNode["source"], string> = {
  declared: "bg-slate-700 text-slate-400",
  detected: "bg-red-500/20 text-red-300",
  inferred: "bg-yellow-500/20 text-yellow-300",
};

function NodeCard({ node }: { node: DataFlowNode }) {
  const cfg = LAYER_CONFIG[node.layer];
  const inner = (
    <div className={`rounded-lg border px-3 py-2 text-sm space-y-1 ${cfg.colorClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{node.name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_BADGE[node.source]}`}>
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

function LayerGroup({ layer, nodes }: { layer: NodeLayer; nodes: DataFlowNode[] }) {
  if (!nodes.length) return null;
  const cfg = LAYER_CONFIG[layer];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {cfg.icon} {cfg.label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {nodes.map((n) => <NodeCard key={n.id} node={n} />)}
      </div>
    </div>
  );
}

function DataFlowPanel({ nodes }: { nodes: DataFlowNode[] }) {
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
      {/* Upstream */}
      {upstreamNodes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider px-2">⬆ Upstream Dependencies</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>
          {UPSTREAM_LAYERS.map((l) => (
            <LayerGroup key={l} layer={l} nodes={byLayer.get(l) ?? []} />
          ))}
        </div>
      )}

      {/* App */}
      {appNodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-blue-700/40" />
            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider px-2">▼ Application</span>
            <div className="h-px flex-1 bg-blue-700/40" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            {appNodes.map((n) => <NodeCard key={n.id} node={n} />)}
          </div>
        </div>
      )}

      {/* Downstream */}
      {downstreamNodes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider px-2">⬇ Downstream Education Systems</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>
          {DOWNSTREAM_LAYERS.map((l) => (
            <LayerGroup key={l} layer={l} nodes={byLayer.get(l) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

function CitationsList({ citations }: { citations: Citation[] }) {
  if (!citations?.length) return null;
  return (
    <ol className="space-y-2">
      {citations.map((c) => (
        <li key={c.number} className="flex gap-3 text-sm">
          <span className="shrink-0 w-6 h-6 rounded bg-slate-700 text-slate-400 text-xs font-mono font-bold flex items-center justify-center mt-0.5">
            {c.number}
          </span>
          <div className="space-y-0.5">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline font-medium leading-tight"
            >
              {c.label}
            </a>
            <p className="text-xs text-slate-500 leading-relaxed">{c.context}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AnalysisReport({ report }: Props) {
  const docs = report.privacyDocuments;

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
          <div className="flex flex-wrap gap-3">
            {docs.privacyPolicyUrl && (
              <a href={docs.privacyPolicyUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Privacy Policy ↗
              </a>
            )}
            {docs.dpaUrl && (
              <a href={docs.dpaUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Data Processing Agreement ↗
              </a>
            )}
            {docs.subprocessorListUrl && (
              <a href={docs.subprocessorListUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Subprocessor List ↗
              </a>
            )}
            {docs.appStoreUrl && (
              <a href={docs.appStoreUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                App Store ↗
              </a>
            )}
            {docs.playStoreUrl && (
              <a href={docs.playStoreUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Play Store ↗
              </a>
            )}
          </div>
          {docs.lastUpdated && (
            <p className="text-xs text-slate-500">Privacy policy last updated: {docs.lastUpdated}</p>
          )}
        </Section>
      )}

      {/* Data Flow Diagram */}
      {report.diagramCode && (
        <Section title="Data Flow Diagram">
          <p className="text-xs text-slate-500 mb-3">
            Shows the full chain: upstream cloud services → app → integration layer → downstream education systems.
          </p>
          <MermaidDiagram code={report.diagramCode} />
        </Section>
      )}

      {/* Layered data flow panel */}
      {report.dataFlowNodes?.length > 0 && (
        <Section title="Full Data Flow — Node Details">
          <DataFlowPanel nodes={report.dataFlowNodes} />
        </Section>
      )}

      {/* Discrepancies */}
      <Section title="Discrepancies Flagged">
        <DiscrepancyList report={report} />
      </Section>

      {/* Subprocessors */}
      {report.subprocessors?.length > 0 && (
        <Section title={`Subprocessors (${report.subprocessors.length} declared or detected)`}>
          <SubprocessorTable report={report} />
        </Section>
      )}

      {/* Trackers */}
      {report.trackers?.length > 0 && (
        <Section title={`Trackers Detected via Exodus Privacy (${report.trackers.length})`}>
          <div className="flex flex-wrap gap-2">
            {report.trackers.map((t, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                {t.website ? (
                  <a href={t.website} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-red-300 hover:underline">{t.name}</a>
                ) : (
                  <span className="font-medium text-red-300">{t.name}</span>
                )}
                <span className="ml-2 text-xs text-slate-500">{t.category}</span>
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

      {/* Reddit community discussion */}
      <Section title="Reddit Community Discussion">
        <p className="text-xs text-slate-500 mb-3">
          Live posts from Reddit — pulled directly from Reddit's API, not AI-generated. Prioritises
          early childhood education and edtech subreddits.
        </p>
        <RedditPosts vendorName={report.vendorName} />
      </Section>

      {/* Citations */}
      {report.citations?.length > 0 && (
        <Section title="Citations">
          <CitationsList citations={report.citations} />
        </Section>
      )}
    </div>
  );
}
