import { useEffect, useRef } from "react";
import type { Core } from "cytoscape";
import type { AtlasEdge, AtlasNode } from "@/lib/atlas";

const SHAPE: Record<string, string> = {
  Disease: "ellipse",
  Gene: "diamond",
  Phenotype: "round-rectangle",
  PatientGroup: "hexagon",
  Mechanism: "octagon",
  Study: "rectangle",
  Asset: "star",
  Researcher: "triangle",
  Paper: "tag",
};

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function Graph({
  centerId,
  nodes,
  edges,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: {
  centerId: string;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  selectedEdgeId?: string | null;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const handlers = useRef({ onSelectNode, onSelectEdge });
  handlers.current = { onSelectNode, onSelectEdge };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (cancelled || !ref.current) return;
      cyRef.current?.destroy();
      const c = {
        fg: cssVar("--foreground"),
        muted: cssVar("--muted-foreground"),
        border: cssVar("--border"),
        bg: cssVar("--background"),
        high: cssVar("--tier-high"),
        medium: cssVar("--tier-medium"),
        low: cssVar("--tier-low"),
        bad: cssVar("--contradict"),
      };
      const cy = cytoscape({
        container: ref.current,
        elements: [
          ...nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label.length > 34 ? n.label.slice(0, 32) + "…" : n.label,
              shape: SHAPE[n.type] ?? "ellipse",
              center: n.id === centerId ? 1 : 0,
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
              shape: "data(shape)" as never,
              width: 16,
              height: 16,
              "background-color": c.bg,
              "border-width": 1.5,
              "border-color": c.muted,
              label: "data(label)",
              "font-size": 9,
              color: c.fg,
              "text-valign": "bottom",
              "text-margin-y": 4,
              "text-wrap": "wrap",
              "text-max-width": "110px",
              "font-family": "IBM Plex Sans, sans-serif",
            },
          },
          {
            selector: "node[center = 1]",
            style: {
              width: 34,
              height: 34,
              "background-color": c.high,
              "border-color": c.high,
              "font-size": 12,
              "font-weight": 600 as never,
            },
          },
          { selector: "node:active, node:selected", style: { "border-color": c.high, "border-width": 3 } },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "curve-style": "bezier",
              "line-color": c.low,
              opacity: 0.9,
            },
          },
          { selector: "edge[tier = 'high']", style: { "line-color": c.high, width: 2.2 } },
          { selector: "edge[tier = 'medium']", style: { "line-color": c.medium, width: 1.8 } },
          { selector: "edge[ev = 'extracted']", style: { "line-style": "dashed" } },
          { selector: "edge[ev = 'inferred']", style: { "line-style": "dotted" } },
          { selector: "edge[contra = 1]", style: { "line-color": c.bad } },
          { selector: "edge.sel", style: { width: 4, "z-index": 10 } },
        ],
        layout: {
          name: "concentric",
          concentric: (n: { data: (k: string) => number }) => (n.data("center") ? 10 : 1),
          levelWidth: () => 1,
          minNodeSpacing: 22,
          animate: false,
        } as never,
        minZoom: 0.3,
        maxZoom: 2.5,
        wheelSensitivity: 0.2,
      });
      cy.on("tap", "node", (ev) => handlers.current.onSelectNode(ev.target.id()));
      cy.on("tap", "edge", (ev) => handlers.current.onSelectEdge(ev.target.id()));
      cyRef.current = cy;
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId, nodes, edges]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.edges().removeClass("sel");
    if (selectedEdgeId) cy.getElementById(selectedEdgeId).addClass("sel");
  }, [selectedEdgeId]);

  useEffect(() => () => cyRef.current?.destroy(), []);

  return <div ref={ref} className="h-full w-full" aria-label="Map of connections" role="img" />;
}
