"use client";

import type { DataFlowNode, NodeLayer, Citation } from "@/lib/types";

// Three columns that read left to right: the app's own vendors → the app → school and state systems.

const COLUMNS: { title: string; hint: string; layers: { key: NodeLayer; label: string }[] }[] = [
  {
    title: "Vendors it relies on",
    hint: "Its own vendors that receive student data",
    layers: [
      { key: "upstream-infra", label: "Hosting" },
      { key: "upstream-analytics", label: "Analytics & tracking" },
      { key: "upstream-ads", label: "Advertising" },
      { key: "upstream-auth", label: "Sign-in" },
    ],
  },
  {
    title: "The app",
    hint: "Collects the child's activity",
    layers: [{ key: "app", label: "" }],
  },
  {
    title: "School & state systems",
    hint: "Rostering in, scores and records out",
    layers: [
      { key: "integration-rostering", label: "Rostering & sign-on" },
      { key: "integration-lms", label: "Learning platforms" },
      { key: "downstream-sis", label: "Student information systems" },
      { key: "downstream-state", label: "State & federal systems" },
    ],
  },
];

const SOURCE_STYLES = {
  declared: "text-slate-500",
  detected: "text-red-600",
  inferred: "text-amber-600",
};

interface Props {
  nodes: DataFlowNode[];
  citations: Citation[];
}

function NodeRow({ node }: { node: DataFlowNode }) {
  const name = node.url ? (
    <a href={node.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:underline">{node.name}</a>
  ) : (
    <span className="font-medium text-slate-900">{node.name}</span>
  );
  return (
    <li className="py-2 space-y-0.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        {name}
        <span className={`text-[11px] shrink-0 ${SOURCE_STYLES[node.source]}`}>{node.source}</span>
      </div>
      {node.dataTypes?.length > 0 && (
        <p className="text-xs text-slate-500">{node.dataTypes.join(", ")}{node.country ? ` · ${node.country}` : ""}</p>
      )}
    </li>
  );
}

export function DataFlowDiagram({ nodes }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_0.8fr_auto_1fr] items-stretch">
        {COLUMNS.map((col, ci) => {
          const groups = col.layers
            .map((l) => ({ ...l, nodes: nodes.filter((n) => n.layer === l.key) }))
            .filter((g) => g.nodes.length > 0);
          const isApp = ci === 1;
          return [
            ci > 0 && (
              <div key={`arrow-${ci}`} className="hidden md:flex items-center text-slate-300 text-xl" aria-hidden>→</div>
            ),
            <div key={col.title}
              className={`rounded-xl border p-4 ${isApp ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200"}`}>
              <p className={`text-sm font-semibold ${isApp ? "text-white" : "text-slate-900"}`}>{col.title}</p>
              <p className={`text-xs mb-2 ${isApp ? "text-slate-300" : "text-slate-500"}`}>{col.hint}</p>
              {groups.length === 0 && <p className="text-xs text-slate-400 py-2">None found</p>}
              {isApp ? (
                groups.flatMap((g) => g.nodes).map((n) => (
                  <div key={n.id} className="pt-2 space-y-1">
                    <p className="font-semibold">{n.name}</p>
                    {n.dataTypes?.length > 0 && <p className="text-xs text-slate-300">Collects: {n.dataTypes.join(", ")}</p>}
                  </div>
                ))
              ) : (
                groups.map((g) => (
                  <div key={g.key} className="pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
                    <ul className="divide-y divide-slate-100">
                      {g.nodes.map((n) => <NodeRow key={n.id} node={n} />)}
                    </ul>
                  </div>
                ))
              )}
            </div>,
          ];
        })}
      </div>
      <p className="text-xs text-slate-500">
        <span className="text-slate-700">declared</span>: named in the vendor&apos;s documents ·{" "}
        <span className="text-red-600">detected</span>: found by a technical scan ·{" "}
        <span className="text-amber-600">inferred</span>: typical for this kind of product, verify first
      </p>
    </div>
  );
}
