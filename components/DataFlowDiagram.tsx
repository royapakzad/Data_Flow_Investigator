"use client";

import type { DataFlowNode, NodeLayer, Citation } from "@/lib/types";

// ── Layer metadata ────────────────────────────────────────────────────────────

const LAYERS: { key: NodeLayer; label: string; icon: string; border: string; bg: string; badge: string; text: string }[] = [
  { key: "upstream-infra",        label: "Cloud Infrastructure",         icon: "☁️",  border: "border-purple-500/50", bg: "bg-purple-950/40",  badge: "bg-purple-500/20 text-purple-200 border-purple-500/40",  text: "text-purple-200" },
  { key: "upstream-analytics",    label: "Analytics & Tracking",         icon: "📊",  border: "border-red-500/50",    bg: "bg-red-950/40",     badge: "bg-red-500/20 text-red-200 border-red-500/40",           text: "text-red-200" },
  { key: "upstream-ads",          label: "Advertising SDKs",             icon: "📣",  border: "border-orange-500/50", bg: "bg-orange-950/40",  badge: "bg-orange-500/20 text-orange-200 border-orange-500/40",  text: "text-orange-200" },
  { key: "upstream-auth",         label: "Auth & Identity",              icon: "🔑",  border: "border-yellow-500/50", bg: "bg-yellow-950/40",  badge: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40",  text: "text-yellow-200" },
  { key: "app",                   label: "Application",                  icon: "🏫",  border: "border-blue-500/70",   bg: "bg-blue-950/60",    badge: "bg-blue-500/30 text-blue-100 border-blue-400/60",        text: "text-blue-100" },
  { key: "integration-rostering", label: "Rostering & SSO Integration",  icon: "🔗",  border: "border-cyan-500/50",   bg: "bg-cyan-950/40",    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",        text: "text-cyan-200" },
  { key: "integration-lms",       label: "Learning Management Systems",  icon: "📚",  border: "border-emerald-500/50",bg: "bg-emerald-950/40", badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",text: "text-emerald-200" },
  { key: "downstream-sis",        label: "Student Information Systems",  icon: "🗄️",  border: "border-amber-500/50",  bg: "bg-amber-950/40",   badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",     text: "text-amber-200" },
  { key: "downstream-state",      label: "State & Federal Data Systems", icon: "🏛️",  border: "border-pink-500/50",   bg: "bg-pink-950/40",    badge: "bg-pink-500/20 text-pink-200 border-pink-500/40",        text: "text-pink-200" },
];

const SOURCE_COLORS = {
  declared: "bg-slate-700/80 text-slate-300 border-slate-600",
  detected: "bg-red-500/20 text-red-300 border-red-500/40",
  inferred: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

// ── Citation badge ────────────────────────────────────────────────────────────

function CiteBadge({ citation }: { citation: Citation }) {
  return (
    <a
      href={`#citation-${citation.number}`}
      className="group relative inline-flex items-center"
      title={`Source [${citation.number}]: ${citation.label}`}
    >
      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded-md hover:bg-blue-500/30 transition-colors">
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
          <p className="font-semibold text-white text-base leading-snug">{node.name}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{node.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[node.source]}`}>
            {node.source}
          </span>
          {node.country && (
            <span className="text-[10px] text-slate-500">{node.country}</span>
          )}
        </div>
      </div>

      {/* Data types */}
      {node.dataTypes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data shared</p>
          <div className="flex flex-wrap gap-1">
            {node.dataTypes.map((dt, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/50">
                {dt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: source link + citation */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {node.url ? (
          <span className="text-[10px] text-blue-400 font-medium">Privacy Policy ↗</span>
        ) : (
          <span />
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
      <div className="w-px h-5 bg-slate-600" />
      {label && (
        <span className="text-[10px] text-slate-600 px-2 py-0.5 rounded border border-slate-700 bg-slate-900 my-0.5 font-mono">
          {label}
        </span>
      )}
      <svg width="12" height="8" viewBox="0 0 12 8" className="text-slate-500 fill-current">
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
        <span className="text-xs text-slate-600 font-mono">({nodes.length} {nodes.length === 1 ? "node" : "nodes"})</span>
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
      <div className="flex flex-wrap gap-3 pb-3 text-xs text-slate-500">
        {[
          { color: "bg-slate-700 border-slate-600", label: "Declared in privacy docs" },
          { color: "bg-red-500/20 border-red-500/40", label: "Detected (not declared)" },
          { color: "bg-yellow-500/15 border-yellow-500/30", label: "Inferred from integrations" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full border ${item.color}`} />
            <span>{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="font-mono text-blue-400 bg-blue-500/10 px-1 rounded text-[10px]">[N]</span>
          <span>hover for source citation</span>
        </div>
      </div>

      {/* Upstream layers */}
      {presentUpstream.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center py-1">
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
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center py-1">
            ⬇ Student data ultimately reaches these systems
          </p>
        </div>
      )}
    </div>
  );
}
