"use client";

import { useEffect, useRef } from "react";

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !code) return;

    import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        flowchart: { curve: "basis", padding: 20 },
        themeVariables: {
          background: "#1e293b",
          primaryColor: "#3b82f6",
          primaryTextColor: "#f8fafc",
          edgeLabelBackground: "#1e293b",
          lineColor: "#94a3b8",
        },
      });

      const id = `mermaid-${Date.now()}`;
      m.default.render(id, code).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      }).catch(() => {
        if (ref.current)
          ref.current.innerHTML = `<pre class="text-xs text-slate-400 p-4">${code}</pre>`;
      });
    });
  }, [code]);

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto rounded-lg bg-slate-800 p-4 min-h-[200px] flex items-center justify-center"
    />
  );
}
