import { useEffect, useRef } from "react";
import type { Core } from "cytoscape";
import type { AtlasEdge, AtlasNode } from "@/lib/atlas";
import { TYPE_TOKEN } from "./Legend";

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
      cyRef.current?.destroy();
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
      const maxLevel = Math.max(1, ...Object.values(level));
      const cy = cytoscape({
        container: ref.current,
        elements: [
          ...nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label.length > 30 ? n.label.slice(0, 28) + "…" : n.label,
              color: typeColor[n.type] ?? c.fg,
              center: n.id === centerId ? 1 : 0,
              ring: maxLevel + 1 - (level[n.id] ?? 1),
            },
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
              width: 14,
              height: 14,
              "background-color": "data(color)",
              "border-width": 2,
              "border-color": c.bg,
              label: "data(label)",
              "font-size": 9,
              color: c.fg,
              "text-valign": "bottom",
              "text-margin-y": 3,
              "text-wrap": "wrap",
              "text-max-width": "100px",
              "font-family": "IBM Plex Sans, sans-serif",
            },
          },
          { selector: "node[center = 1]", style: { width: 32, height: 32, "font-size": 12, "font-weight": 600 as never, "border-color": c.high, "border-width": 3 } },
          { selector: "node:selected", style: { "border-color": c.high, "border-width": 3 } },
          { selector: "edge", style: { width: 1.4, "curve-style": "bezier", "line-color": c.low } },
          { selector: "edge[tier = 'high']", style: { "line-color": c.high, width: 2.2 } },
          { selector: "edge[tier = 'medium']", style: { "line-color": c.medium, width: 1.8 } },
          { selector: "edge[ev = 'inferred']", style: { "line-style": "dashed" } },
          { selector: "edge[ev = 'extracted']", style: { "line-style": "dotted", width: 2.4 } },
          { selector: "edge[contra = 1]", style: { "line-color": c.bad } },
          { selector: "edge.sel", style: { width: 4.5, "z-index": 10 } },
        ],
        layout: {
          name: "concentric",
          concentric: (n: { data: (k: string) => number }) => (n.data("center") ? 100 : n.data("ring")),
          levelWidth: () => 1,
          minNodeSpacing: 18,
          animate: false,
        } as never,
        minZoom: 0.3,
        maxZoom: 1.4,
        wheelSensitivity: 0.2,
      });
      cy.on("tap", "node", (ev) => handlers.current.onTapNode(ev.target.id()));
      cy.on("tap", "edge", (ev) => handlers.current.onSelectEdge(ev.target.id()));
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

  return <div ref={ref} className="h-full w-full" aria-label="Map of connections. Use the list on the right to browse with the keyboard." role="img" />;
}
