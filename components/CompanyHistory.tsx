import type { CompanyOwnership } from "@/lib/types";

interface Props {
  ownership: CompanyOwnership;
}

export function CompanyHistory({ ownership }: Props) {
  const hasAcquisitions = ownership.acquisitionHistory?.length > 0;

  return (
    <div className="space-y-6">
      {/* Current ownership card */}
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Current Parent Company</p>
            {ownership.currentParentCompany ? (
              ownership.currentParentUrl ? (
                <a
                  href={ownership.currentParentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-bold text-blue-300 hover:underline"
                >
                  {ownership.currentParentCompany} ↗
                </a>
              ) : (
                <p className="text-xl font-bold text-slate-200">{ownership.currentParentCompany}</p>
              )
            ) : (
              <p className="text-xl font-bold text-slate-400">Independent</p>
            )}
            {ownership.currentParentDescription && (
              <p className="text-sm text-slate-400">{ownership.currentParentDescription}</p>
            )}
          </div>

          <div className="flex gap-6 text-center">
            {ownership.foundedYear && (
              <div>
                <p className="text-2xl font-bold text-slate-200">{ownership.foundedYear}</p>
                <p className="text-xs text-slate-500">Founded</p>
              </div>
            )}
            {ownership.founders.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-200">{ownership.founders.join(", ")}</p>
                <p className="text-xs text-slate-500">{ownership.founders.length > 1 ? "Founders" : "Founder"}</p>
              </div>
            )}
          </div>
        </div>

        {ownership.ownershipNotes && (
          <p className="text-sm text-slate-400 border-t border-slate-700 pt-3">
            {ownership.ownershipNotes}
          </p>
        )}
      </div>

      {/* Acquisition timeline */}
      {hasAcquisitions && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Acquisition History</p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-700" />

            <ol className="space-y-4">
              {[...ownership.acquisitionHistory]
                .sort((a, b) => a.year - b.year)
                .map((event, i) => (
                  <li key={i} className="flex gap-4">
                    {/* Year bubble */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center z-10">
                      <span className="text-xs font-bold text-slate-300">{event.year}</span>
                    </div>

                    {/* Event card */}
                    <div className="flex-1 rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-2">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200">{event.acquirer}</span>
                        <span className="text-slate-500 text-sm">acquired</span>
                        <span className="font-semibold text-slate-200">{event.acquired}</span>
                      </div>
                      <p className="text-sm text-slate-400">{event.description}</p>
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                      >
                        Source: {event.sourceLabel} ↗
                      </a>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      )}

      {!hasAcquisitions && (
        <p className="text-sm text-slate-500 italic">
          No verified acquisition history found. All ownership information should be independently verified.
        </p>
      )}
    </div>
  );
}
