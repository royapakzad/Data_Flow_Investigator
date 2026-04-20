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
  diagramCode: string;
  humanInLoopSteps: string[];
  sources: Source[];
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
