"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  code: string;
}

export function MermaidDiagram({ code }: Props) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Render Mermaid once → store SVG string
  useEffect(() => {
    if (!code) return;
    setRenderError(false);

    import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        flowchart: { curve: "basis", padding: 24, nodeSpacing: 60, rankSpacing: 80 },
        themeVariables: {
          background: "#0f172a",
          primaryColor: "#3b82f6",
          primaryTextColor: "#f8fafc",
          edgeLabelBackground: "#1e293b",
          lineColor: "#475569",
          clusterBkg: "#1e293b",
          clusterBorder: "#334155",
          titleColor: "#94a3b8",
        },
      });

      const id = `mermaid-${Date.now()}`;
      m.default
        .render(id, code)
        .then(({ svg }) => setSvgContent(svg))
        .catch(() => setRenderError(true));
    });
  }, [code]);

  // Zoom helpers
  const clampZoom = (v: number) => Math.min(Math.max(0.2, v), 6);

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Scroll-to-zoom in modal
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => clampZoom(z * (e.deltaY > 0 ? 0.9 : 1.1)));
  }, []);

  useEffect(() => {
    const el = modalContentRef.current;
    if (!isOpen || !el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isOpen, handleWheel]);

  // Drag-to-pan
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setAttribute("data-dragging", "true");
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan({
      x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx),
      y: dragOrigin.current.py + (e.clientY - dragOrigin.current.my),
    });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    dragging.current = false;
    e.currentTarget.removeAttribute("data-dragging");
  };

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { setIsOpen(false); resetView(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, resetView]);

  // Open modal
  const openModal = () => { resetView(); setIsOpen(true); };
  const closeModal = () => { setIsOpen(false); resetView(); };

  if (renderError) {
    return (
      <pre className="text-xs text-slate-400 bg-slate-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    );
  }

  if (!svgContent) {
    return (
      <div className="w-full rounded-xl bg-slate-900 p-6 min-h-[200px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
          Rendering diagram…
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Inline preview ───────────────────────────────────────────── */}
      <div className="relative group">
        {/* diagram */}
        <div
          className="w-full overflow-hidden rounded-xl bg-slate-900 p-4 max-h-[420px] flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto cursor-zoom-in"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          onClick={openModal}
        />
        {/* hover overlay hint */}
        <div
          onClick={openModal}
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-900/0 group-hover:bg-slate-900/60 transition-all cursor-zoom-in pointer-events-none group-hover:pointer-events-auto"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-sm bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 shadow-xl">
            🔍 Click to zoom &amp; explore
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 text-xs">
            Scroll to zoom · Drag to pan · ESC to close
          </span>
        </div>
      </div>

      {/* ── Full-screen modal ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm"
          role="dialog"
          aria-modal
        >
          {/* toolbar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
            <p className="text-slate-300 text-sm font-medium">Data Flow Diagram</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 mr-2">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => clampZoom(z * 1.25))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-lg font-bold transition-colors"
                title="Zoom in"
              >+</button>
              <button
                onClick={() => setZoom((z) => clampZoom(z * 0.8))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-lg font-bold transition-colors"
                title="Zoom out"
              >−</button>
              <button
                onClick={resetView}
                className="px-3 h-8 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs transition-colors"
                title="Reset view"
              >Reset</button>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-300 text-lg transition-colors ml-1"
                title="Close (ESC)"
              >×</button>
            </div>
          </div>

          {/* canvas */}
          <div
            ref={modalContentRef}
            className="flex-1 overflow-hidden flex items-center justify-center select-none"
            style={{ cursor: dragging.current ? "grabbing" : "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: dragging.current ? "none" : "transform 0.1s ease",
              }}
              className="[&_svg]:max-w-none"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>

          <p className="shrink-0 text-center text-xs text-slate-600 py-2 border-t border-slate-800">
            Scroll to zoom · Drag to pan · ESC to close
          </p>
        </div>
      )}
    </>
  );
}
