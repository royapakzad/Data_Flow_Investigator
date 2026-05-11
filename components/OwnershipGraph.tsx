"use client";

import type { CompanyOwnership } from "@/lib/types";

interface Props {
  vendorName: string;
  ownership: CompanyOwnership;
}

// ── Node types ────────────────────────────────────────────────────────────────

type NodeType = "pe-firm" | "corp-acquirer" | "vendor" | "pe-portfolio" | "subsidiary";

interface GraphNode {
  id: string;
  name: string;
  url: string | null;
  type: NodeType;
  description: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GraphEdge {
  fromId: string;
  toId: string;
  label: string;
}

// ── Visual constants ───────────────────────────────────────────────────────────

const NW = 200;   // node width (chain)
const NH = 56;    // node height
const NW_SIDE = 180;  // node width for side columns
const NH_SIDE = 48;
const V_GAP = 90; // vertical gap between chain nodes
const H_GAP = 60; // horizontal gap from chain to side columns
const TOP_PAD = 40;
const LEFT_PAD = 40;

const TYPE_COLORS: Record<NodeType, { fill: string; stroke: string; text: string; badge: string }> = {
  "pe-firm":       { fill: "#fef3c7", stroke: "#d97706", text: "#92400e", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  "corp-acquirer": { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95", badge: "bg-violet-100 text-violet-800 border-violet-300" },
  "vendor":        { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  "pe-portfolio":  { fill: "#fef9c3", stroke: "#ca8a04", text: "#78350f", badge: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  "subsidiary":    { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d", badge: "bg-green-100 text-green-800 border-green-300" },
};

const TYPE_LABELS: Record<NodeType, string> = {
  "pe-firm":       "PE Firm",
  "corp-acquirer": "Acquirer",
  "vendor":        "Vendor",
  "pe-portfolio":  "Portfolio",
  "subsidiary":    "Acquired by vendor",
};

// ── Build graph from ownership data ──────────────────────────────────────────

function buildGraph(vendorName: string, ownership: CompanyOwnership): { nodes: GraphNode[]; edges: GraphEdge[]; svgWidth: number; svgHeight: number } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 1. Build the ownership chain: vendor → acquirers → PE firm
  // acquisitionHistory contains events where someone acquired the vendor (or its past forms).
  // Sort ascending by year to reconstruct the chain.
  const acquisitions = [...(ownership.acquisitionHistory ?? [])].sort((a, b) => a.year - b.year);

  // Chain from bottom: vendor first, then acquirers in order
  const chainNames: string[] = [vendorName];
  for (const ev of acquisitions) {
    // Add the acquirer if not already in chain
    if (!chainNames.includes(ev.acquirer)) {
      chainNames.push(ev.acquirer);
    }
  }

  // If there's a current parent not yet in chain, append it
  if (ownership.currentParentCompany && !chainNames.includes(ownership.currentParentCompany)) {
    chainNames.push(ownership.currentParentCompany);
  }

  // Map chain names to node types
  const chainTypes: NodeType[] = chainNames.map((name, i) => {
    if (i === 0) return "vendor";
    if (i === chainNames.length - 1 && ownership.isPEOwned) return "pe-firm";
    return "corp-acquirer";
  });

  // Reverse to draw top-down (PE firm at top)
  const reversedChain = [...chainNames].reverse();
  const reversedTypes = [...chainTypes].reverse();

  // PE portfolio and subsidiaries
  const portfolioCompanies = ownership.isPEOwned ? (ownership.pePortfolioCompanies ?? []) : [];
  const subsidiaries = ownership.vendorAcquisitions ?? [];

  // ── Compute layout ──
  // Chain is centered; portfolio goes right; subsidiaries go below vendor.

  const chainCount = reversedChain.length;
  const portfolioCount = portfolioCompanies.length;
  const subCount = subsidiaries.length;

  // SVG canvas sizing
  const chainX = LEFT_PAD + (portfolioCount > 0 ? 0 : 80); // shift chain left if no portfolio
  const chainCenterX = chainX + NW / 2;

  // Portfolio column: right of chain
  const portX = chainX + NW + H_GAP;
  const portColVisible = portfolioCount > 0;

  // Subsidiary row: below vendor node
  // Vendor is last in reversedChain → index chainCount - 1
  const vendorChainIdx = chainCount - 1;
  const vendorY = TOP_PAD + vendorChainIdx * V_GAP;
  const subY = vendorY + V_GAP;

  // Total SVG dimensions
  const subSpread = subCount > 0 ? (subCount - 1) * (NW_SIDE + 20) : 0;
  const subStartX = chainCenterX - subSpread / 2;

  const chainHeight = TOP_PAD + (chainCount - 1) * V_GAP + NH;
  const totalHeight = subCount > 0 ? subY + NH_SIDE + TOP_PAD : chainHeight + TOP_PAD;

  const portHeight = portColVisible ? TOP_PAD + (portfolioCount - 1) * (NH_SIDE + 16) + NH_SIDE : 0;
  const svgHeight = Math.max(totalHeight, portHeight + TOP_PAD);

  const rightEdge = portColVisible ? portX + NW_SIDE + LEFT_PAD : chainX + NW + LEFT_PAD;
  const leftEdge = subCount > 0 ? Math.min(subStartX, chainX) : chainX;
  const svgWidth = Math.max(rightEdge - leftEdge + LEFT_PAD, 500);

  // Adjust x positions relative to leftEdge
  const offsetX = leftEdge > LEFT_PAD ? 0 : LEFT_PAD - leftEdge;

  // ── Create chain nodes ──
  for (let i = 0; i < reversedChain.length; i++) {
    const name = reversedChain[i];
    const type = reversedTypes[i];
    const ev = acquisitions.find(a => a.acquirer === name);
    const url = name === vendorName ? null
      : (name === ownership.currentParentCompany ? ownership.currentParentUrl : (ev ? null : null));

    const isPortfolioEntry = type === "pe-firm" && ownership.isPEOwned;
    const desc = name === ownership.currentParentCompany ? ownership.currentParentDescription : null;

    nodes.push({
      id: `chain-${i}`,
      name,
      url: type === "pe-firm" ? ownership.currentParentUrl : url,
      type,
      description: desc,
      x: chainX + offsetX,
      y: TOP_PAD + i * V_GAP,
      w: NW,
      h: NH,
    });
  }

  // ── Chain edges ──
  for (let i = 0; i < reversedChain.length - 1; i++) {
    const upper = reversedChain[i];
    const lower = reversedChain[i + 1];
    const ev = acquisitions.find(a => a.acquirer === upper && (a.acquired === lower || lower === vendorName));
    edges.push({
      fromId: `chain-${i}`,
      toId: `chain-${i + 1}`,
      label: ev ? `Acquired ${ev.year}` : "Owns",
    });
  }

  // ── Portfolio nodes (right of PE firm) ──
  if (portColVisible) {
    const peFirmNode = nodes.find(n => n.type === "pe-firm");
    const portBaseY = peFirmNode ? peFirmNode.y : TOP_PAD;
    for (let i = 0; i < portfolioCompanies.length; i++) {
      const p = portfolioCompanies[i];
      nodes.push({
        id: `portfolio-${i}`,
        name: p.name,
        url: p.url,
        type: "pe-portfolio",
        description: p.description,
        x: portX + offsetX,
        y: portBaseY + i * (NH_SIDE + 16),
        w: NW_SIDE,
        h: NH_SIDE,
      });
      edges.push({ fromId: nodes.find(n => n.type === "pe-firm")!.id, toId: `portfolio-${i}`, label: "Also owns" });
    }
  }

  // ── Subsidiary nodes (below vendor) ──
  if (subCount > 0) {
    const vendorNode = nodes.find(n => n.type === "vendor")!;
    const subTotalW = subCount * NW_SIDE + (subCount - 1) * 20;
    const subStart = vendorNode.x + NW / 2 - subTotalW / 2;
    for (let i = 0; i < subsidiaries.length; i++) {
      const s = subsidiaries[i];
      nodes.push({
        id: `sub-${i}`,
        name: s.name,
        url: s.url,
        type: "subsidiary",
        description: s.description,
        x: subStart + i * (NW_SIDE + 20),
        y: subY,
        w: NW_SIDE,
        h: NH_SIDE,
      });
      edges.push({ fromId: vendorNode.id, toId: `sub-${i}`, label: s.year ? `Acquired ${s.year}` : "Acquired" });
    }
  }

  return { nodes, edges, svgWidth, svgHeight };
}

// ── SVG helpers ────────────────────────────────────────────────────────────────

function nodeCenter(n: GraphNode) {
  return { cx: n.x + n.w / 2, cy: n.y + n.h / 2 };
}

function edgePath(from: GraphNode, to: GraphNode): string {
  const f = nodeCenter(from);
  const t = nodeCenter(to);

  // Determine connection points (bottom of from → top of to, or right of from → left of to)
  const dx = t.cx - f.cx;
  const dy = t.cy - f.cy;

  if (Math.abs(dy) > Math.abs(dx)) {
    // vertical connection
    const fx = f.cx;
    const fy = from.y + from.h;
    const tx = t.cx;
    const ty = to.y;
    const mid = (fy + ty) / 2;
    return `M ${fx} ${fy} C ${fx} ${mid} ${tx} ${mid} ${tx} ${ty}`;
  } else {
    // horizontal connection (PE firm → portfolio)
    const fx = from.x + from.w;
    const fy = f.cy;
    const tx = to.x;
    const ty = t.cy;
    const mid = (fx + tx) / 2;
    return `M ${fx} ${fy} C ${mid} ${fy} ${mid} ${ty} ${tx} ${ty}`;
  }
}

function edgeMidpoint(from: GraphNode, to: GraphNode): { x: number; y: number } {
  const f = nodeCenter(from);
  const t = nodeCenter(to);
  const dy = t.cy - f.cy;
  const dx = t.cx - f.cx;
  if (Math.abs(dy) > Math.abs(dx)) {
    return { x: (f.cx + t.cx) / 2, y: (from.y + from.h + to.y) / 2 };
  } else {
    return { x: (from.x + from.w + to.x) / 2, y: (f.cy + t.cy) / 2 };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OwnershipGraph({ vendorName, ownership }: Props) {
  const { nodes, edges, svgWidth, svgHeight } = buildGraph(vendorName, ownership);

  if (nodes.length <= 1) {
    return (
      <p className="text-sm text-slate-400 italic">
        No ownership chain data available. Re-run the analysis to populate this graph.
      </p>
    );
  }

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 pt-4 pb-2">
        {(Object.entries(TYPE_LABELS) as [NodeType, string][])
          .filter(([type]) => nodes.some(n => n.type === type))
          .map(([type, label]) => (
            <span key={type} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[type].badge}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type].stroke }} />
              {label}
            </span>
          ))}
      </div>

      {/* SVG graph */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ minWidth: Math.min(svgWidth, 320), maxHeight: 600 }}
        className="block"
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeById[e.fromId];
          const to = nodeById[e.toId];
          if (!from || !to) return null;
          const mid = edgeMidpoint(from, to);
          return (
            <g key={i}>
              <path
                d={edgePath(from, to)}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
              />
              <rect
                x={mid.x - 32}
                y={mid.y - 9}
                width={64}
                height={18}
                rx={4}
                fill="white"
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={mid.x}
                y={mid.y + 4}
                textAnchor="middle"
                fontSize={9}
                fill="#64748b"
                fontFamily="ui-monospace, monospace"
              >
                {e.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const colors = TYPE_COLORS[node.type];
          const isVendor = node.type === "vendor";
          const rx = 10;
          return (
            <g key={node.id}>
              {/* Shadow */}
              <rect x={node.x + 2} y={node.y + 3} width={node.w} height={node.h}
                rx={rx} fill="rgba(0,0,0,0.07)" />
              {/* Node box */}
              <rect x={node.x} y={node.y} width={node.w} height={node.h}
                rx={rx} fill={colors.fill} stroke={colors.stroke}
                strokeWidth={isVendor ? 2.5 : 1.5} />

              {/* Type label pill */}
              <text
                x={node.x + 8}
                y={node.y + 14}
                fontSize={8}
                fill={colors.stroke}
                fontFamily="ui-sans-serif, sans-serif"
                fontWeight="600"
                textAnchor="start"
              >
                {TYPE_LABELS[node.type].toUpperCase()}
              </text>

              {/* Company name — clickable if URL exists */}
              {node.url ? (
                <a href={node.url} target="_blank" rel="noopener noreferrer">
                  <text
                    x={node.x + node.w / 2}
                    y={node.y + node.h / 2 + (node.h > 50 ? 5 : 3)}
                    textAnchor="middle"
                    fontSize={isVendor ? 13 : 11}
                    fontWeight={isVendor ? "700" : "600"}
                    fill={colors.text}
                    fontFamily="ui-sans-serif, sans-serif"
                    style={{ cursor: "pointer" }}
                  >
                    {truncate(node.name, isVendor ? 22 : 20)}
                    <tspan fontSize={9} fill={colors.stroke}> ↗</tspan>
                  </text>
                </a>
              ) : (
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 + (node.h > 50 ? 5 : 3)}
                  textAnchor="middle"
                  fontSize={isVendor ? 13 : 11}
                  fontWeight={isVendor ? "700" : "600"}
                  fill={colors.text}
                  fontFamily="ui-sans-serif, sans-serif"
                >
                  {truncate(node.name, isVendor ? 22 : 20)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Node detail cards (below SVG, for description + full name + URL) */}
      <div className="px-5 pb-5 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {nodes.map((node) => {
          const colors = TYPE_COLORS[node.type];
          return (
            <div key={node.id + "-card"} className="rounded-lg border bg-white p-3 space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${colors.badge}`}>
                  {TYPE_LABELS[node.type]}
                </span>
                {node.url ? (
                  <a href={node.url} target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-blue-700 hover:underline truncate max-w-[180px]">
                    {node.name} ↗
                  </a>
                ) : (
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">{node.name}</span>
                )}
              </div>
              {node.description && (
                <p className="text-slate-500 leading-relaxed line-clamp-3">{node.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
