import { useEffect, useRef } from "react";
import type { Core } from "cytoscape";
import type { AtlasEdge, AtlasNode } from "@/lib/atlas";
import { TYPE_TOKEN } from "./Legend";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Scan } from "lucide-react";

// Cytoscape cannot parse oklch, so resolve tokens to rgb via a canvas.
function cssVar(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d");
  if (!ctx) return raw;
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}

export function Graph({
  centerId,
  nodes,
  edges,
  level,
  selectedEdgeId,
  onTapNode,
  onSelectEdge,
}: {
  centerId: string;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  level: Record<string, number>;
  selectedEdgeId?: string | null | undefined;
  onTapNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const handlers = useRef({ onTapNode, onSelectEdge });
  handlers.current = { onTapNode, onSelectEdge };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (cancelled || !ref.current) return;
      const c = {
        fg: cssVar("--foreground"),
        bg: cssVar("--background"),
        high: cssVar("--tier-high"),
        medium: cssVar("--tier-medium"),
        low: cssVar("--tier-low"),
        bad: cssVar("--contradict"),
      };
      const typeColor: Record<string, string> = {};
      for (const [t, v] of Object.entries(TYPE_TOKEN)) typeColor[t] = cssVar(v);
      const previous = cyRef.current;
      const positions = new Map(previous?.nodes().map((n) => [n.id(), n.position()] as const) ?? []);
      previous?.destroy();
      const cy = cytoscape({
        container: ref.current,
        elements: [
          ...nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label.length > 65 ? `${n.label.slice(0, 62)}…` : n.label,
              color: typeColor[n.type] ?? c.fg,
              center: n.id === centerId ? 1 : 0,
            },
            position: positions.get(n.id) ?? { x: 0, y: 0 },
          })),
          ...edges.map((e) => ({
            data: {
              id: e.id,
              source: e.source_id,
              target: e.target_id,
              tier: e.tier ?? "low",
              ev: e.evidence_type ?? "observed",
              contra: e.contradicts && e.contradicts.length ? 1 : 0,
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              width: 22,
              height: 22,
              "background-color": "data(color)",
              "border-width": 2,
              "border-color": c.bg,
              label: "data(label)",
              "font-size": 14,
              color: c.fg,
              "text-valign": "bottom",
              "text-margin-y": 8,
              "text-wrap": "wrap",
              "text-max-width": "145px",
              "text-background-color": c.bg,
              "text-background-opacity": 0.9,
              "text-background-padding": "3px",
              "text-background-shape": "roundrectangle",
              "font-family": "IBM Plex Sans, sans-serif",
            },
          },
          { selector: "node[center = 1]", style: { width: 38, height: 38, "font-size": 16, "font-weight": 600 as never, "border-color": c.high, "border-width": 3 } },
          { selector: "node:selected", style: { "border-color": c.high, "border-width": 3 } },
          { selector: "edge", style: { width: 1.4, "curve-style": "bezier", "line-color": c.low, opacity: 0.55 } },
          { selector: "edge[tier = 'high']", style: { "line-color": c.high, width: 2.2 } },
          { selector: "edge[tier = 'medium']", style: { "line-color": c.medium, width: 1.8 } },
          { selector: "edge[ev = 'inferred']", style: { "line-style": "dashed" } },
          { selector: "edge[ev = 'extracted']", style: { "line-style": "dotted", width: 2.4 } },
          { selector: "edge[contra = 1]", style: { "line-color": c.bad } },
          { selector: "edge.sel", style: { width: 4.5, "z-index": 10, opacity: 1 } },
        ],
        layout: {
          name: "cose",
          nodeDimensionsIncludeLabels: true,
          randomize: positions.size === 0,
          nodeRepulsion: () => 16000,
          idealEdgeLength: () => 140,
          edgeElasticity: () => 80,
          gravity: 0.15,
          numIter: 1000,
          padding: 36,
          animate: false,
        } as never,
        minZoom: 0.05,
        maxZoom: 3,
        wheelSensitivity: 0.2,
      });
      cy.on("tap", "node", (ev) => handlers.current.onTapNode(ev.target.id()));
      cy.on("tap", "edge", (ev) => handlers.current.onSelectEdge(ev.target.id()));
      cy.on("mouseover", "node", (ev) => {
        cy.elements().style("opacity", 0.2);
        ev.target.closedNeighborhood().style("opacity", 1);
      });
      cy.on("mouseout", "node", () => cy.elements().removeStyle("opacity"));
      cyRef.current = cy;
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId, nodes, edges, level]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.edges().removeClass("sel");
    if (selectedEdgeId) cy.getElementById(selectedEdgeId).addClass("sel");
  }, [selectedEdgeId, edges]);

  useEffect(() => () => cyRef.current?.destroy(), []);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.resize();
      cy.fit(undefined, 36);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const zoom = (factor: number) => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };
  return <>
    <div ref={ref} className="h-full w-full" aria-label="Map of connections" role="img" />
    <div className="absolute bottom-3 right-3 flex gap-1 rounded-md border bg-background p-1">
      <Button variant="ghost" size="icon" aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.25)}><ZoomIn /></Button>
      <Button variant="ghost" size="icon" aria-label="Zoom out" title="Zoom out" onClick={() => zoom(0.8)}><ZoomOut /></Button>
      <Button variant="ghost" size="icon" aria-label="Fit map" title="Fit map" onClick={() => cyRef.current?.fit(undefined, 36)}><Scan /></Button>
    </div>
  </>;
}
