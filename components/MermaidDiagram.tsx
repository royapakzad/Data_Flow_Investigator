"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current || !code) return;
    setError(false);

    import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        flowchart: { curve: "basis", padding: 24, nodeSpacing: 50, rankSpacing: 70 },
        themeVariables: {
          background: "#0f172a",
          primaryColor: "#3b82f6",
          primaryTextColor: "#f8fafc",
          edgeLabelBackground: "#1e293b",
          lineColor: "#475569",
          clusterBkg: "#1e293b",
          clusterBorder: "#334155",
          titleColor: "#94a3b8",
          subGraphTitleMargin: { top: 8, bottom: 8 },
        },
      });

      const id = `mermaid-${Date.now()}`;
      m.default
        .render(id, code)
        .then(({ svg }) => {
          if (ref.current) ref.current.innerHTML = svg;
        })
        .catch(() => {
          setError(true);
        });
    });
  }, [code]);

  if (error) {
    return (
      <pre className="text-xs text-slate-400 bg-slate-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto rounded-xl bg-slate-900 p-6 min-h-[300px] flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto"
    />
  );
}
