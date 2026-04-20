"use client";

import type { VendorReport } from "@/lib/types";
import { MetricCards } from "./MetricCards";
import { MermaidDiagram } from "./MermaidDiagram";
import { DiscrepancyList } from "./DiscrepancyList";
import { SubprocessorTable } from "./SubprocessorTable";

interface Props {
  report: VendorReport;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AnalysisReport({ report }: Props) {
  const docs = report.privacyDocuments;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{report.vendorName}</h1>
        {report.appName !== report.vendorName && (
          <p className="text-slate-400 text-sm mt-1">App: {report.appName}</p>
        )}
      </div>

      {/* Metric cards */}
      <MetricCards report={report} />

      {/* Source documents */}
      {(docs.privacyPolicyUrl || docs.dpaUrl || docs.subprocessorListUrl) && (
        <Section title="Source Documents">
          <div className="flex flex-wrap gap-3">
            {docs.privacyPolicyUrl && (
              <a href={docs.privacyPolicyUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Privacy Policy
              </a>
            )}
            {docs.dpaUrl && (
              <a href={docs.dpaUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Data Processing Agreement
              </a>
            )}
            {docs.subprocessorListUrl && (
              <a href={docs.subprocessorListUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Subprocessor List
              </a>
            )}
            {docs.appStoreUrl && (
              <a href={docs.appStoreUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                App Store Listing
              </a>
            )}
            {docs.playStoreUrl && (
              <a href={docs.playStoreUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-blue-400 hover:border-blue-500 transition-colors">
                Play Store Listing
              </a>
            )}
          </div>
          {docs.lastUpdated && (
            <p className="text-xs text-slate-500">Privacy policy last updated: {docs.lastUpdated}</p>
          )}
        </Section>
      )}

      {/* Data flow diagram */}
      {report.diagramCode && (
        <Section title="Data Flow Diagram">
          <MermaidDiagram code={report.diagramCode} />
        </Section>
      )}

      {/* Discrepancies */}
      <Section title="Discrepancies Flagged">
        <DiscrepancyList report={report} />
      </Section>

      {/* Subprocessors */}
      {report.subprocessors.length > 0 && (
        <Section title={`Subprocessors (${report.subprocessors.length} declared or detected)`}>
          <SubprocessorTable report={report} />
        </Section>
      )}

      {/* Trackers */}
      {report.trackers.length > 0 && (
        <Section title={`Trackers Detected via Exodus Privacy (${report.trackers.length})`}>
          <div className="flex flex-wrap gap-2">
            {report.trackers.map((t, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                <span className="font-medium text-red-300">{t.name}</span>
                <span className="ml-2 text-xs text-slate-500">{t.category}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Vendor questions */}
      <Section title="Questions to Send the Vendor">
        <ol className="space-y-3">
          {report.vendorQuestions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-slate-300 text-sm leading-relaxed">{q}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Human-in-the-loop steps */}
      <Section title="Steps That Require Human Verification">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <p className="text-amber-200 text-xs font-medium mb-3 uppercase tracking-wide">
            This automated analysis cannot substitute for the following:
          </p>
          <ul className="space-y-2">
            {report.humanInLoopSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-amber-400 shrink-0">→</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Sources */}
      {report.sources.length > 0 && (
        <Section title="Sources">
          <ul className="space-y-1">
            {report.sources.map((s, i) => (
              <li key={i} className="text-sm">
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
