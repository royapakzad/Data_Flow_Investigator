"use client";

import type { DataFlowNode, NodeLayer, Citation } from "@/lib/types";

// ── Layer metadata ────────────────────────────────────────────────────────────

const LAYERS: { key: NodeLayer; label: string; icon: string; topBar: string; bandBg: string; bandBorder: string; chipBg: string; chipText: string; headText: string }[] = [
  { key: "upstream-infra",        label: "Cloud Infrastructure",         icon: "☁️",  topBar: "bg-purple-500", bandBg: "bg-purple-50",  bandBorder: "border-purple-200", chipBg: "bg-purple-100", chipText: "text-purple-700", headText: "text-purple-800" },
  { key: "upstream-analytics",    label: "Analytics & Tracking",         icon: "📊",  topBar: "bg-red-500",    bandBg: "bg-red-50",     bandBorder: "border-red-200",    chipBg: "bg-red-100",    chipText: "text-red-700",    headText: "text-red-800" },
  { key: "upstream-ads",          label: "Advertising SDKs",             icon: "📣",  topBar: "bg-orange-500", bandBg: "bg-orange-50",  bandBorder: "border-orange-200", chipBg: "bg-orange-100", chipText: "text-orange-700", headText: "text-orange-800" },
  { key: "upstream-auth",         label: "Auth & Identity",              icon: "🔑",  topBar: "bg-yellow-500", bandBg: "bg-yellow-50",  bandBorder: "border-yellow-200", chipBg: "bg-yellow-100", chipText: "text-yellow-700", headText: "text-yellow-800" },
  { key: "app",                   label: "Application",                  icon: "🏫",  topBar: "bg-blue-600",   bandBg: "bg-blue-50",    bandBorder: "border-blue-300",   chipBg: "bg-blue-100",   chipText: "text-blue-800",   headText: "text-blue-900" },
  { key: "integration-rostering", label: "Rostering & SSO Integration",  icon: "🔗",  topBar: "bg-cyan-500",   bandBg: "bg-cyan-50",    bandBorder: "border-cyan-200",   chipBg: "bg-cyan-100",   chipText: "text-cyan-700",   headText: "text-cyan-800" },
  { key: "integration-lms",       label: "Learning Management Systems",  icon: "📚",  topBar: "bg-emerald-500",bandBg: "bg-emerald-50", bandBorder: "border-emerald-200",chipBg: "bg-emerald-100",chipText: "text-emerald-700",headText: "text-emerald-800" },
  { key: "downstream-sis",        label: "Student Information Systems",  icon: "🗄️",  topBar: "bg-amber-500",  bandBg: "bg-amber-50",   bandBorder: "border-amber-200",  chipBg: "bg-amber-100",  chipText: "text-amber-700",  headText: "text-amber-800" },
  { key: "downstream-state",      label: "State & Federal Data Systems", icon: "🏛️",  topBar: "bg-pink-500",   bandBg: "bg-pink-50",    bandBorder: "border-pink-200",   chipBg: "bg-pink-100",   chipText: "text-pink-700",   headText: "text-pink-800" },
];

const SOURCE_COLORS = {
  declared: "bg-slate-100 text-slate-600 border-slate-300",
  detected: "bg-red-100 text-red-700 border-red-300",
  inferred: "bg-amber-100 text-amber-700 border-amber-300",
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
  topBarColor,
  chipBg,
  chipText,
  cite,
}: {
  node: DataFlowNode;
  topBarColor: string;
  chipBg: string;
  chipText: string;
  cite?: Citation;
}) {
  const card = (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className={`h-1 ${topBarColor}`} />
      <div className="p-4 space-y-3 flex-1 flex flex-col">
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
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data shared</p>
          <div className="flex flex-wrap gap-1">
            {node.dataTypes.map((dt, i) => (
              <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${chipBg} ${chipText} border border-white/60`}>
                {dt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: source evidence link + citation */}
      <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-slate-100">
        {node.url ? (
          <span className={`text-[10px] font-medium ${
            node.source === "detected" ? "text-red-600" :
            node.source === "inferred" ? "text-amber-600" :
            "text-blue-600"
          }`}>
            {node.source === "detected" ? "⚠ Detection source ↗" :
             node.source === "inferred" ? "~ Integration page ↗" :
             "↗ Source document"}
          </span>
        ) : node.source === "inferred" ? (
          <span className="text-[10px] text-slate-400 italic">Inferred — unconfirmed</span>
        ) : (
          <span className="text-[10px] text-amber-600">No source linked</span>
        )}
        {cite && <CiteBadge citation={cite} />}
      </div>
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
    <div className={`rounded-2xl border ${meta.bandBorder} ${meta.bandBg} overflow-hidden`}>
      {/* Colored top accent bar */}
      <div className={`h-1.5 ${meta.topBar}`} />

      <div className="p-5 space-y-4">
        {/* Band header */}
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{meta.icon}</span>
          <h3 className={`font-bold text-sm uppercase tracking-wider ${meta.headText}`}>
            {meta.label}
          </h3>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.chipBg} ${meta.chipText}`}>
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
          </span>
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
            <NodeCard
              key={n.id}
              node={n}
              topBarColor={meta.topBar}
              chipBg={meta.chipBg}
              chipText={meta.chipText}
              cite={getCite(n.url)}
            />
          ))}
        </div>
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">How to read this diagram</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">declared</span>
            Vendor named this in their own docs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">detected</span>
            Found via technical scan, not declared
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">inferred</span>
            Assumed from industry patterns — verify first
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">[N]</span>
            Hover for source citation
          </span>
        </div>
      </div>

      {/* Upstream layers */}
      {presentUpstream.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center py-1">
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
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center py-1">
            ⬇ Student data ultimately reaches these systems
          </p>
        </div>
      )}
    </div>
  );
}
