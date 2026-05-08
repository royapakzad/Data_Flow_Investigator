"use client";

import type { DataFlowNode, NodeLayer, Citation } from "@/lib/types";

// ── Layer metadata ────────────────────────────────────────────────────────────

const LAYERS: { key: NodeLayer; label: string; icon: string; border: string; bg: string; badge: string; text: string }[] = [
  { key: "upstream-infra",        label: "Cloud Infrastructure",         icon: "☁️",  border: "border-purple-300", bg: "bg-purple-50",  badge: "bg-purple-100 text-purple-700 border-purple-300",  text: "text-purple-700" },
  { key: "upstream-analytics",    label: "Analytics & Tracking",         icon: "📊",  border: "border-red-300",    bg: "bg-red-50",     badge: "bg-red-100 text-red-700 border-red-300",           text: "text-red-700" },
  { key: "upstream-ads",          label: "Advertising SDKs",             icon: "📣",  border: "border-orange-300", bg: "bg-orange-50",  badge: "bg-orange-100 text-orange-700 border-orange-300",  text: "text-orange-700" },
  { key: "upstream-auth",         label: "Auth & Identity",              icon: "🔑",  border: "border-yellow-300", bg: "bg-yellow-50",  badge: "bg-yellow-100 text-yellow-700 border-yellow-300",  text: "text-yellow-700" },
  { key: "app",                   label: "Application",                  icon: "🏫",  border: "border-blue-400",   bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-800 border-blue-400",        text: "text-blue-800" },
  { key: "integration-rostering", label: "Rostering & SSO Integration",  icon: "🔗",  border: "border-cyan-300",   bg: "bg-cyan-50",    badge: "bg-cyan-100 text-cyan-700 border-cyan-300",        text: "text-cyan-700" },
  { key: "integration-lms",       label: "Learning Management Systems",  icon: "📚",  border: "border-emerald-300",bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700 border-emerald-300",text: "text-emerald-700" },
  { key: "downstream-sis",        label: "Student Information Systems",  icon: "🗄️",  border: "border-amber-300",  bg: "bg-amber-50",   badge: "bg-amber-100 text-amber-700 border-amber-300",     text: "text-amber-700" },
  { key: "downstream-state",      label: "State & Federal Data Systems", icon: "🏛️",  border: "border-pink-300",   bg: "bg-pink-50",    badge: "bg-pink-100 text-pink-700 border-pink-300",        text: "text-pink-700" },
];

const SOURCE_COLORS = {
  declared: "bg-slate-100 text-slate-700 border-slate-300",
  detected: "bg-red-100 text-red-700 border-red-300",
  inferred: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

// ── Citation badge ────────────────────────────────────────────────────────────

function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={`#citation-${citation.number}`}
      className="group relative inline-flex items-center"
      title={`Source [${citation.number}]: ${citation.label}`}
    >
      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-300 px-1.5 py-0.5 rounded-md hover:bg-blue-100 transition-colors">
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

// ── Single node card ──────────────────────────────────────────────────────────

function NodeCard({
  node,
  layerBadge,
  cite,
}: {
  node: DataFlowNode;
  layerBadge: string;
  cite?: Citation;
}) {
  const card = (
    <div className={`rounded-xl border ${layerBadge} p-4 space-y-3 h-full`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-base leading-snug">{node.name}</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{node.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[node.source]}`}>
            {node.source}
          </span>
          {node.country && (
            <span className="text-[10px] text-slate-400">{node.country}</span>
          )}
        </div>
      </div>

      {/* Data types */}
      {node.dataTypes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data shared</p>
          <div className="flex flex-wrap gap-1">
            {node.dataTypes.map((dt, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {dt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: source evidence link + citation */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {node.url ? (
          <span className={`text-[10px] font-medium ${
            node.source === "detected" ? "text-red-600" :
            node.source === "inferred" ? "text-yellow-600" :
            "text-blue-600"
          }`}>
            {node.source === "detected" ? "Detection source ↗" :
             node.source === "inferred" ? "Integration page ↗" :
             "Source document ↗"}
          </span>
        ) : node.source === "inferred" ? (
          <span className="text-[10px] text-slate-400 italic">Inferred — no direct evidence</span>
        ) : (
          <span className="text-[10px] text-amber-600">No source linked</span>
        )}
        {cite && <CiteBadge citation={cite} />}
      </div>
    </div>
  );

  if (node.url) {
    return (
      <a href={node.url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
        {card}
      </a>
    );
  }
  return card;
}

// ── Flow arrow ────────────────────────────────────────────────────────────────

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 select-none" aria-hidden>
      <div className="w-px h-5 bg-slate-300" />
      {label && (
        <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded border border-slate-200 bg-white my-0.5 font-mono">
          {label}
        </span>
      )}
      <svg width="12" height="8" viewBox="0 0 12 8" className="text-slate-400 fill-current">
        <path d="M6 8L0 0h12z" />
      </svg>
    </div>
  );
}

// ── Layer band ────────────────────────────────────────────────────────────────

function LayerBand({
  layerKey,
  nodes,
  getCite,
}: {
  layerKey: NodeLayer;
  nodes: DataFlowNode[];
  getCite: (url?: string | null) => Citation | undefined;
}) {
  if (!nodes.length) return null;
  const meta = LAYERS.find((l) => l.key === layerKey)!;

  return (
    <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-5 space-y-4`}>
      {/* Band header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta.icon}</span>
        <h3 className={`font-bold text-sm uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </h3>
        <span className="text-xs text-slate-400 font-mono">({nodes.length} {nodes.length === 1 ? "node" : "nodes"})</span>
      </div>

      {/* Node grid — 1 col on mobile, 2 on sm, 3 on lg */}
      <div className={`grid gap-3 ${
        nodes.length === 1
          ? "grid-cols-1 max-w-sm"
          : nodes.length === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      }`}>
        {nodes.map((n) => (
          <NodeCard key={n.id} node={n} layerBadge={meta.badge} cite={getCite(n.url)} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  nodes: DataFlowNode[];
  citations: Citation[];
}

// Match a node URL to a citation
function buildCiteLookup(citations: Citation[]) {
  const map = new Map<string, Citation>();
  for (const c of citations) {
    map.set(c.url, c);
    try {
      const host = new URL(c.url).hostname.replace(/^www\./, "");
      map.set(host, c);
    } catch { /* ignore */ }
  }
  return (url?: string | null): Citation | undefined => {
    if (!url) return undefined;
    if (map.has(url)) return map.get(url);
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return map.get(host);
    } catch { return undefined; }
  };
}

const UPSTREAM_ORDER: NodeLayer[] = ["upstream-infra", "upstream-analytics", "upstream-ads", "upstream-auth"];
const DOWNSTREAM_ORDER: NodeLayer[] = ["integration-rostering", "integration-lms", "downstream-sis", "downstream-state"];

export function DataFlowDiagram({ nodes, citations }: Props) {
  const getCite = buildCiteLookup(citations);
  const byLayer = new Map<NodeLayer, DataFlowNode[]>();
  for (const n of nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
    byLayer.get(n.layer)!.push(n);
  }

  const appNodes = byLayer.get("app") ?? [];
  const presentUpstream = UPSTREAM_ORDER.filter((l) => (byLayer.get(l)?.length ?? 0) > 0);
  const presentDownstream = DOWNSTREAM_ORDER.filter((l) => (byLayer.get(l)?.length ?? 0) > 0);

  return (
    <div className="space-y-1">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 pb-4 text-xs text-slate-500 border-b border-slate-200 mb-2">
        <div className="flex items-start gap-1.5">
          <span className="w-3 h-3 rounded-full border bg-slate-200 border-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-700 font-medium">Declared</span>
            <span className="ml-1">— vendor named this in their own privacy docs, DPA, or subprocessor list. Link goes to that document.</span>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-3 h-3 rounded-full border bg-red-100 border-red-300 mt-0.5 shrink-0" />
          <div>
            <span className="text-red-700 font-medium">Detected</span>
            <span className="ml-1">— found via technical scan (Exodus SDK analysis, BuiltWith, App Store privacy label) without being declared. Link goes to the detection source.</span>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-3 h-3 rounded-full border bg-yellow-100 border-yellow-300 mt-0.5 shrink-0" />
          <div>
            <span className="text-yellow-700 font-medium">Inferred</span>
            <span className="ml-1">— assumed from known industry integration patterns, not confirmed by a specific document or scan. Treat as a lead to verify, not a fact.</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded text-[10px]">[N]</span>
          <span>hover for source citation</span>
        </div>
      </div>

      {/* Upstream layers */}
      {presentUpstream.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-1">
            ⬆ Services the app depends on
          </p>
          <div className="space-y-2">
            {presentUpstream.map((layer, i) => (
              <div key={layer}>
                <LayerBand layerKey={layer} nodes={byLayer.get(layer) ?? []} getCite={getCite} />
                {i < presentUpstream.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arrow into app */}
      {presentUpstream.length > 0 && appNodes.length > 0 && (
        <FlowArrow label="student data collected by" />
      )}

      {/* App layer — always centered and prominent */}
      {appNodes.length > 0 && (
        <div className="mx-auto max-w-lg">
          <LayerBand layerKey="app" nodes={appNodes} getCite={getCite} />
        </div>
      )}

      {/* Arrow into downstream */}
      {appNodes.length > 0 && presentDownstream.length > 0 && (
        <FlowArrow label="data shared with" />
      )}

      {/* Downstream layers */}
      {presentDownstream.length > 0 && (
        <div className="space-y-2">
          <div className="space-y-2">
            {presentDownstream.map((layer, i) => (
              <div key={layer}>
                <LayerBand layerKey={layer} nodes={byLayer.get(layer) ?? []} getCite={getCite} />
                {i < presentDownstream.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-1">
            ⬇ Student data ultimately reaches these systems
          </p>
        </div>
      )}
    </div>
  );
}
