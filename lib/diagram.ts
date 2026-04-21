import type { DataFlowNode, NodeLayer } from "./types";

const LAYER_META: Record<NodeLayer, { label: string; color: string; order: number }> = {
  "upstream-infra":        { label: "☁️ Cloud Infrastructure",          color: "#8b5cf6", order: 0 },
  "upstream-analytics":    { label: "📊 Analytics & Tracking",           color: "#ef4444", order: 1 },
  "upstream-ads":          { label: "📣 Advertising",                    color: "#f97316", order: 2 },
  "upstream-auth":         { label: "🔑 Auth & Identity",                color: "#f59e0b", order: 3 },
  "app":                   { label: "🏫 Application",                    color: "#3b82f6", order: 4 },
  "integration-rostering": { label: "🔗 Rostering & SSO",               color: "#06b6d4", order: 5 },
  "integration-lms":       { label: "📚 Learning Management",            color: "#10b981", order: 6 },
  "downstream-sis":        { label: "🗄️ Student Information Systems",    color: "#f59e0b", order: 7 },
  "downstream-state":      { label: "🏛️ State & Federal Data Systems",  color: "#ec4899", order: 8 },
};

// Group layers into upstream / app / downstream for subgraph ordering
const UPSTREAM_LAYERS: NodeLayer[] = [
  "upstream-infra", "upstream-analytics", "upstream-ads", "upstream-auth",
];
const DOWNSTREAM_LAYERS: NodeLayer[] = [
  "integration-rostering", "integration-lms", "downstream-sis", "downstream-state",
];

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function sanitizeLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/\n/g, "\\n");
}

export function buildMermaidDiagram(nodes: DataFlowNode[], vendorName: string): string {
  if (!nodes || nodes.length === 0) return "";

  const lines: string[] = ["flowchart TD"];

  const byLayer = new Map<NodeLayer, DataFlowNode[]>();
  for (const n of nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
    byLayer.get(n.layer)!.push(n);
  }

  const appNodes = byLayer.get("app") ?? [];
  const appIds = appNodes.map((n) => sanitizeId(n.id));

  // --- Upstream subgraphs ---
  const upstreamIds: string[] = [];
  for (const layer of UPSTREAM_LAYERS) {
    const layerNodes = byLayer.get(layer);
    if (!layerNodes?.length) continue;
    const meta = LAYER_META[layer];
    const sgId = `SG_${layer.replace(/-/g, "_").toUpperCase()}`;
    lines.push(`  subgraph ${sgId} ["${sanitizeLabel(meta.label)}"]`);
    lines.push("    direction LR");
    for (const n of layerNodes) {
      const safeId = sanitizeId(n.id);
      upstreamIds.push(safeId);
      const dataLabel = n.dataTypes.length
        ? `\\n(${n.dataTypes.slice(0, 2).join(", ")})`
        : "";
      lines.push(
        `    ${safeId}["${sanitizeLabel(n.name)}\\n${sanitizeLabel(n.description)}${dataLabel}"]`
      );
    }
    lines.push("  end");
  }

  // --- App node(s) ---
  for (const n of appNodes) {
    const safeId = sanitizeId(n.id);
    lines.push(
      `  ${safeId}["🏫 ${sanitizeLabel(n.name)}\\n${sanitizeLabel(n.description)}"]`
    );
  }

  // --- Downstream subgraphs ---
  const downstreamSgIds: string[] = [];
  for (const layer of DOWNSTREAM_LAYERS) {
    const layerNodes = byLayer.get(layer);
    if (!layerNodes?.length) continue;
    const meta = LAYER_META[layer];
    const sgId = `SG_${layer.replace(/-/g, "_").toUpperCase()}`;
    downstreamSgIds.push(sgId);
    lines.push(`  subgraph ${sgId} ["${sanitizeLabel(meta.label)}"]`);
    lines.push("    direction LR");
    for (const n of layerNodes) {
      const safeId = sanitizeId(n.id);
      const dataLabel = n.dataTypes.length
        ? `\\n(${n.dataTypes.slice(0, 2).join(", ")})`
        : "";
      lines.push(
        `    ${safeId}["${sanitizeLabel(n.name)}\\n${sanitizeLabel(n.description)}${dataLabel}"]`
      );
    }
    lines.push("  end");
  }

  // --- Edges: upstream → app ---
  for (const upId of upstreamIds) {
    for (const appId of appIds) {
      lines.push(`  ${upId} --> ${appId}`);
    }
  }

  // --- Edges: app → downstream ---
  for (const appId of appIds) {
    const rosterIds = (byLayer.get("integration-rostering") ?? []).map((n) => sanitizeId(n.id));
    const lmsIds = (byLayer.get("integration-lms") ?? []).map((n) => sanitizeId(n.id));
    const sisIds = (byLayer.get("downstream-sis") ?? []).map((n) => sanitizeId(n.id));
    const stateIds = (byLayer.get("downstream-state") ?? []).map((n) => sanitizeId(n.id));

    for (const id of [...rosterIds, ...lmsIds]) lines.push(`  ${appId} --> ${id}`);

    // Rostering → SIS
    for (const rid of rosterIds) {
      for (const sid of sisIds) lines.push(`  ${rid} --> ${sid}`);
    }

    // LMS → SIS
    for (const lid of lmsIds) {
      for (const sid of sisIds) lines.push(`  ${lid} --> ${sid}`);
    }

    // If no integration layer, connect app directly to SIS
    if (rosterIds.length === 0 && lmsIds.length === 0) {
      for (const sid of sisIds) lines.push(`  ${appId} --> ${sid}`);
    }

    // SIS → state data
    for (const sid of sisIds) {
      for (const stid of stateIds) lines.push(`  ${sid} --> ${stid}`);
    }

    // If no SIS, connect integration directly to state
    if (sisIds.length === 0) {
      for (const id of [...rosterIds, ...lmsIds]) {
        for (const stid of stateIds) lines.push(`  ${id} --> ${stid}`);
      }
    }
  }

  // --- Styles ---
  for (const n of nodes) {
    const safeId = sanitizeId(n.id);
    const color = LAYER_META[n.layer]?.color ?? "#6b7280";
    lines.push(`  style ${safeId} fill:${color},color:#fff,stroke:#fff`);
  }

  return lines.join("\n");
}
