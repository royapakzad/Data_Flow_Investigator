"use client";

import { useEffect, useRef, useState } from "react";

export interface ReportTab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

// One topic per tab so a report reads as a few short pages instead of one long scroll.
// When printing, every tab is shown in order.
export function ReportTabs({ tabs }: { tabs: ReportTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const barRef = useRef<HTMLDivElement>(null);

  // Deep link: #tab-<id> opens that tab
  useEffect(() => {
    const id = window.location.hash.replace(/^#tab-/, "");
    if (tabs.some((t) => t.id === id)) setActive(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(id: string) {
    setActive(id);
    history.replaceState(null, "", `#tab-${id}`);
    const top = barRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) barRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div>
      <div ref={barRef} className="sticky top-0 z-30 -mx-4 px-4 bg-slate-100/95 backdrop-blur border-b border-slate-200 no-print">
        <div role="tablist" className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              onClick={() => select(t.id)}
              className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active === t.id
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-1.5 text-xs ${active === t.id ? "text-blue-600" : "text-slate-400"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" className={`pt-8 space-y-10 ${active === t.id ? "" : "hidden print:block"}`}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
