export type RiskLevel = "elevated" | "standard" | "low-concern";

export interface Subprocessor {
  name: string;
  purpose: string;
  category: "analytics" | "infrastructure" | "payments" | "auth" | "ads" | "support" | "ai-ml" | "video" | "communication" | "other";
  dataTypes: string[];
  country?: string;
  privacyUrl?: string;
  disclosedIn?: string | null;  // where this dependency was found (e.g. "App Store privacy label", "Play Store Data Safety", "DPA", "Trust Center", "Exodus")
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

export interface PortfolioCompany {
  name: string;
  url: string | null;
  description: string | null;
}

export interface VendorAcquisition {
  name: string;
  url: string | null;
  year: number | null;
  description: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

export interface CompanyOwnership {
  currentParentCompany: string | null;
  currentParentUrl: string | null;    // homepage or Wikipedia URL of parent company
  currentParentDescription: string | null;
  foundedYear: number | null;
  founders: string[];
  acquisitionHistory: AcquisitionEvent[]; // acquisitions OF the vendor (who bought it) — never invent
  ownershipNotes: string;               // any additional verified context
  isPEOwned: boolean;                   // is the ultimate parent a private equity / financial firm?
  pePortfolioCompanies: PortfolioCompany[]; // other companies owned by the same PE firm (if applicable)
  vendorAcquisitions: VendorAcquisition[];  // companies the vendor itself has acquired
}

// ── Lawsuits & Legal Actions ──────────────────────────────────────────────────

export interface Lawsuit {
  caseName: string;
  year: number | null;
  court: string | null;
  plaintiff: string | null;
  description: string;
  outcome: string | null;
  sourceUrl: string;
  sourceLabel: string;
}

// ── Business model, AI, predictions, controversies ───────────────────────────

export type VendorLayer = "classroom" | "administrative" | "both";

export interface BusinessModel {
  summary: string;
  models: {
    type: "per-pupil-license" | "freemium" | "direct-to-parent" | "data-derived-products" | "advertising" | "government-contract" | "pe-buy-and-build" | "other";
    description: string;
    sourceUrl: string | null;
  }[];
  fundingStreamsMarketed: { stream: string; claim: string; sourceUrl: string | null }[];
  publicContracts: { agency: string; amount: string | null; year: number | null; description: string; sourceUrl: string }[];
}

export interface AIFeature {
  name: string;
  description: string;
  aiProvider: string | null;
  zeroDataRetention: "yes" | "no" | "unknown";
  sourceUrl: string | null;
}

export interface ScoreOrPrediction {
  name: string;
  description: string;
  writesToOfficialRecord: "yes" | "no" | "unknown";
  sourceUrl: string | null;
}

export interface Controversy {
  type: "data-breach" | "investigative-report" | "regulatory" | "advocacy-campaign" | "community-concern" | "independent-evaluation" | "research" | "endorsement";
  stance: "critical" | "supportive" | "mixed";
  title: string;
  year: number | null;
  actor: string | null;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
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
  overview?: string;
  keyFindings?: string[];
  layer?: VendorLayer;
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
  lawsuits?: Lawsuit[];
  humanInLoopSteps: string[];
  diagramCode?: string;   // built programmatically from dataFlowNodes
  sources?: Source[];
  rawNotes?: string;
  // Older shared reports predate these fields
  businessModel?: BusinessModel;
  aiFeatures?: AIFeature[];
  scoresAndPredictions?: ScoreOrPrediction[];
  controversies?: Controversy[];
}

export interface AnalyzeRequest {
  vendorName: string;
  appStoreUrl?: string;
  districtName?: string;
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

export type CrossSectorType = "workforce-LER" | "health" | "justice" | "military" | "migration" | "child-welfare" | "other";

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

export interface CountyVendor {
  name: string;
  provides: string;
  systems: string[];
  level: "state" | "district" | "both";
  website: string | null;
  dataAgreement: "yes" | "no" | "unknown";
  dataAgreementUrl: string | null;
  sourceUrl: string | null;
}

export interface CountyContract {
  vendor: string;
  agency: string;
  title: string;
  amount: string | null;
  period: string | null;
  procurementMethod: "competitive-bid" | "sole-source" | "cooperative" | "emergency" | "pilot" | "grant-funded" | "unknown";
  documentUrl: string;
}

export interface FindTheRecords {
  publicRecordsLaw: string;
  howToRequest: string;
  requestUrl: string | null;
  places: { name: string; whatYouFind: string; url: string }[];
  sampleRequest: string;
}

export interface ProcurementRule {
  name: string;
  level: "federal" | "state" | "district";
  category: "procurement" | "student-privacy" | "data-security" | "contract-requirements" | "accessibility" | "ai-guidance" | "records-access";
  requires: string;
  url: string | null;
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
  // Older shared reports predate these fields
  vendors?: CountyVendor[];
  contracts?: CountyContract[];
  spending?: { summary: string; items: { description: string; amount: string; period: string | null; sourceUrl: string }[] };
  findTheRecords?: FindTheRecords;
  rules?: ProcurementRule[];
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
