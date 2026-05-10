"use client";

import type { VendorReport } from "@/lib/types";

interface Props {
  report: VendorReport;
}

const LAYER_STYLES = [
  {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    titleColor: "text-emerald-800",
    numBg: "bg-emerald-500",
    connectorBg: "bg-emerald-50 border-emerald-100",
  },
  {
    bg: "bg-blue-50",
    border: "border-blue-400",
    titleColor: "text-blue-800",
    numBg: "bg-blue-500",
    connectorBg: "bg-blue-50 border-blue-100",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-400",
    titleColor: "text-purple-800",
    numBg: "bg-purple-500",
    connectorBg: "bg-purple-50 border-purple-100",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-400",
    titleColor: "text-amber-800",
    numBg: "bg-amber-500",
    connectorBg: "bg-amber-50 border-amber-100",
  },
];

export function SafetyLabelCard({ report }: Props) {
  const nodes = report.dataFlowNodes ?? [];

  const appNodes = nodes.filter((n) => n.layer === "app");
  const districtNodes = nodes.filter((n) =>
    ["integration-rostering", "integration-lms", "downstream-sis"].includes(n.layer)
  );
  const stateNodes = nodes.filter((n) => n.layer === "downstream-state");

  const allDataTypes = Array.from(new Set(nodes.flatMap((n) => n.dataTypes))).slice(0, 14);

  const appDesc =
    appNodes[0]?.description ??
    `${report.vendorName} is used by teachers, administrators, and students. Data is generated at the point of interaction with children and families.`;

  const districtDesc =
    districtNodes.length > 0
      ? `The app connects to ${districtNodes.map((n) => n.name).join(", ")} — systems that manage student enrollment, identity, and access. The Student Information System (SIS) is the district's master record.`
      : "District infrastructure — including Student Information Systems (SIS) and rostering tools — identifies, enrolls, and provisions access to every student. Rostering tools sync those records to apps and manage single sign-on.";

  const stateDesc =
    stateNodes.length > 0
      ? `State agencies aggregate district data into longitudinal warehouses that follow a child from early childhood through K–12. Found in this analysis: ${stateNodes.map((n) => n.name).join(", ")}.`
      : "State agencies aggregate district data into longitudinal warehouses that follow a child from early childhood through K–12 into postsecondary or workforce.";

  const districtExamples =
    districtNodes.length > 0
      ? districtNodes.map((n) => n.name)
      : ["PowerSchool (SIS)", "Infinite Campus (SIS)", "Clever (rostering)", "ClassLink (rostering)"];

  const stateExamples =
    stateNodes.length > 0
      ? stateNodes.map((n) => n.name)
      : ["ECIDS (early childhood IDS)", "SLDS / P-20W", "CALPADS (California)", "State-specific equivalents"];

  const layers = [
    {
      number: 1,
      title: "Front end — classroom-facing application",
      description: appDesc,
      examples: appNodes.length > 0 ? [report.vendorName, ...appNodes.map((n) => n.name).filter((n) => n !== report.vendorName)] : [report.vendorName],
      connector:
        "Front-end apps export rosters, assessment results, and student records via APIs or flat-file transfers (CSV, SIF) into the district's student information and rostering systems.",
    },
    {
      number: 2,
      title: "District infrastructure",
      description: districtDesc,
      examples: districtExamples,
      connector:
        "Districts submit required data extracts — enrollment, demographics, program participation, assessment outcomes — to state agencies on scheduled cycles.",
    },
    {
      number: 3,
      title: "State longitudinal systems",
      description: stateDesc,
      examples: stateExamples,
      connector:
        "States share longitudinal records with other government agencies through data-sharing agreements, interagency MOUs, and federal mandates. Linkage is done by matching on name, date of birth, and address — or via a shared identifier (e.g. Medicaid ID, MSIX ID).",
    },
    {
      number: 4,
      title: "Cross-sector data linkages",
      description:
        "Education records are matched and shared with systems outside the education sector entirely. Each linkage operates under a different legal authority and data-use agreement.",
      examples: [
        "Workforce / labor agencies",
        "Medicaid (health)",
        "Immunization registries",
        "Juvenile justice",
        "MSIX (migrant / immigration)",
        "JAMRS (military recruitment)",
      ],
      connector: null,
    },
  ];

  function handlePrint() {
    document.body.classList.add("print-label-mode");
    window.print();
    window.addEventListener(
      "afterprint",
      () => document.body.classList.remove("print-label-mode"),
      { once: true }
    );
  }

  return (
    <div>
      {/* Print controls */}
      <div className="mb-4 flex items-center gap-3 no-print">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          ↓ Download as PDF
        </button>
        <p className="text-xs text-slate-400">
          In the print dialog, choose &ldquo;Save as PDF&rdquo; as the destination.
        </p>
      </div>

      {/* Card */}
      <div id="safety-label-printable" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                Education Data Safety Label
              </p>
              <h2 className="text-2xl font-bold text-white">{report.vendorName}</h2>
              <p className="text-slate-300 text-sm mt-1 max-w-lg leading-relaxed">
                Upstream sources, what the app processes, and downstream subprocessors — listed here as
                contextual aid for a school district. Not a legally complete picture.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Analysis date</p>
              <p className="text-sm text-white font-medium mt-0.5">
                {new Date(report.analysisDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* What it processes */}
        {allDataTypes.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              WHAT IT PROCESSES
            </p>
            <div className="flex flex-wrap gap-2">
              {allDataTypes.map((dt, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700 font-medium"
                >
                  {dt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4 layers */}
        <div className="divide-y divide-slate-100">
          {layers.map((layer, idx) => {
            const s = LAYER_STYLES[idx];
            return (
              <div key={idx}>
                {/* Layer band */}
                <div className={`p-6 ${s.bg} border-l-4 ${s.border}`}>
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full ${s.numBg} text-white font-bold text-sm flex items-center justify-center mt-0.5`}
                    >
                      {layer.number}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        LAYER {layer.number}
                      </p>
                      <h3 className={`font-bold text-base ${s.titleColor}`}>{layer.title}</h3>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{layer.description}</p>
                      {layer.examples.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          <span className="font-semibold">
                            {idx === 3 ? "Examples include: " : "Examples from this analysis: "}
                          </span>
                          {layer.examples.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connector */}
                {layer.connector && (
                  <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-3 items-start">
                    <div className="shrink-0 flex flex-col items-center pt-1 gap-0.5">
                      <div className="w-px h-3 bg-slate-300" />
                      <svg width="10" height="6" viewBox="0 0 10 6" className="text-slate-400 fill-current">
                        <path d="M5 6L0 0h10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        HOW THEY CONNECT
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed italic">{layer.connector}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-[10px] text-slate-400">
            Generated by Education Data Investigator · Not legal advice · Verify with your district&apos;s DPA and
            privacy officer.
          </p>
          <p className="text-[10px] text-slate-400 shrink-0">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}
          </p>
        </div>
      </div>
    </div>
  );
}
