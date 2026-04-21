export type RiskLevel = "elevated" | "standard" | "low-concern";

export interface Subprocessor {
  name: string;
  purpose: string;
  category: "analytics" | "infrastructure" | "payments" | "auth" | "ads" | "support" | "other";
  dataTypes: string[];
  country?: string;
  privacyUrl?: string;
  source: "declared" | "detected" | "inferred";
}

export interface Tracker {
  name: string;
  category: string;
  website?: string;
  detectedBy: "exodus" | "manual";
}

export interface Discrepancy {
  severity: "high" | "medium" | "low";
  description: string;
  declaredIn?: string;
  detectedBy?: string;
}

export interface Source {
  label: string;
  url: string;
}

// Structured data flow node for the layered diagram
export type NodeLayer =
  | "upstream-infra"
  | "upstream-analytics"
  | "upstream-auth"
  | "upstream-ads"
  | "app"
  | "integration-rostering"
  | "integration-lms"
  | "downstream-sis"
  | "downstream-state";

export interface DataFlowNode {
  id: string;            // unique slug, e.g. "aws", "powerschool"
  name: string;          // display name
  layer: NodeLayer;
  description: string;   // one-line role description
  dataTypes: string[];   // student data that flows through this node
  url?: string;          // link to their privacy page
  country?: string;
  source: "declared" | "detected" | "inferred";
}

// Numbered citation for clickable references
export interface Citation {
  number: number;
  label: string;
  url: string;
  context: string;       // what was actually found at this source
}

export interface VendorReport {
  vendorName: string;
  appName: string;
  analysisDate: string;
  riskLevel: RiskLevel;
  summary: {
    directSubprocessors: number;
    estimatedDownstreamVendors: number;
    detectedTrackers: number;
    discrepanciesFound: number;
  };
  privacyDocuments: {
    privacyPolicyUrl?: string;
    dpaUrl?: string;
    subprocessorListUrl?: string;
    appStoreUrl?: string;
    playStoreUrl?: string;
    lastUpdated?: string;
  };
  subprocessors: Subprocessor[];
  trackers: Tracker[];
  discrepancies: Discrepancy[];
  vendorQuestions: string[];
  // Structured data flow — used to build the diagram
  dataFlowNodes: DataFlowNode[];
  // Numbered, clickable citations
  citations: Citation[];
  humanInLoopSteps: string[];
  // Legacy fields kept for backward compat — populated from dataFlowNodes
  diagramCode?: string;
  sources?: Source[];
  rawNotes?: string;
}

export interface AnalyzeRequest {
  vendorName: string;
  appStoreUrl?: string;
}

export interface StreamEvent {
  type: "progress" | "result" | "error";
  message?: string;
  data?: VendorReport;
}
