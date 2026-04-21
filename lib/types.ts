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

// ── Data Flow ─────────────────────────────────────────────────────────────────

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
  id: string;
  name: string;
  layer: NodeLayer;
  description: string;
  dataTypes: string[];
  url?: string;
  country?: string;
  source: "declared" | "detected" | "inferred";
}

// ── Citations ─────────────────────────────────────────────────────────────────

export interface Citation {
  number: number;
  label: string;
  url: string;
  context: string;
}

// ── Company Ownership & Acquisitions ─────────────────────────────────────────

export interface AcquisitionEvent {
  year: number;
  acquirer: string;       // company that did the buying
  acquired: string;       // company that was bought
  description: string;    // one sentence summary
  sourceUrl: string;      // MUST be a real, verifiable URL (news article, press release, SEC filing)
  sourceLabel: string;    // e.g. "TechCrunch", "SEC EDGAR", "Company Blog"
}

export interface CompanyOwnership {
  currentParentCompany: string | null;
  currentParentUrl: string | null;    // homepage or Wikipedia URL of parent company
  currentParentDescription: string | null;
  foundedYear: number | null;
  founders: string[];
  acquisitionHistory: AcquisitionEvent[]; // empty array if none found — never invent
  ownershipNotes: string;               // any additional verified context
}

// ── Reddit Posts ──────────────────────────────────────────────────────────────

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  permalink: string;      // full reddit.com URL
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;     // unix timestamp
  flair: string | null;
  preview: string | null; // first ~200 chars of self-text, if available
}

// ── Main Report ───────────────────────────────────────────────────────────────

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
  dataFlowNodes: DataFlowNode[];
  citations: Citation[];
  companyOwnership: CompanyOwnership;
  humanInLoopSteps: string[];
  diagramCode?: string;   // built programmatically from dataFlowNodes
  sources?: Source[];
  rawNotes?: string;
}

export interface AnalyzeRequest {
  vendorName: string;
  appStoreUrl?: string;
}

// ── County Education Data System Types ────────────────────────────────────────

export interface EduSystemVendor {
  name: string;
  role: string;                      // "Primary developer" | "Integration partner" | "Hosting" | etc.
  website: string | null;
  contractType: "awarded" | "in-house" | "partnership" | "unknown";
  notes: string | null;
}

export type EduSystemType = "SLDS" | "ECIDS" | "KEA" | "SIS" | "federal" | "cross-sector" | "other";

export interface EduDataSystem {
  name: string;
  type: EduSystemType;
  scope: "county-district" | "state" | "federal";
  description: string;
  status: "active" | "planned" | "discontinued" | "unknown";
  dataElements: string[];
  vendors: EduSystemVendor[];
  url: string | null;
  citationNumbers: number[];
  source: "declared" | "inferred";
}

export type CrossSectorType = "workforce-LER" | "health" | "justice" | "military" | "migration" | "other";

export interface CrossSectorLinkage {
  sector: CrossSectorType;
  sectorLabel: string;
  systemName: string;
  description: string;
  dataShared: string[];
  legalBasis: string | null;
  safeguards: string[];
  vendors: EduSystemVendor[];
  url: string | null;
  citationNumbers: number[];
}

export type SafeguardCategory = "federal-law" | "state-law" | "policy" | "technical" | "gap";

export interface DataSafeguard {
  category: SafeguardCategory;
  name: string;
  description: string;
  url: string | null;
  scope: "federal" | "state" | "county-district";
  citationNumbers: number[];
}

export interface CountyReport {
  countyName: string;
  stateName: string;
  stateAbbr: string;
  fipsCode: string;
  analysisDate: string;
  dataAvailabilityNote: string;
  educationSystems: EduDataSystem[];
  crossSectorLinkages: CrossSectorLinkage[];
  safeguards: DataSafeguard[];
  keyFindings: string[];
  questionsToAsk: string[];
  citations: Citation[];
  rawNotes?: string;
}

export interface StreamEvent {
  type: "progress" | "result" | "error";
  message?: string;
  data?: VendorReport;
}
