import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ExternalLink, X } from "lucide-react";
import { Graph } from "@/components/atlas/Graph";
import { Search } from "@/components/atlas/Search";
import { ThisWeek } from "@/components/atlas/ThisWeek";
import { EdgeDetail } from "@/components/atlas/EdgeDetail";
import { Legend, TierDot } from "@/components/atlas/Legend";
import {
  ASSET_KIND_LABEL,
  REL_LABEL,
  TYPE_LABEL,
  fetchEdgesByIds,
  fetchMeta,
  fetchNeighborhood,
  fetchNodes,
  nodeUrl,
  type AtlasEdge,
  type AtlasNode,
} from "@/lib/atlas";

const TITLE = "Explore connections — Rare Disease Atlas";
const DESC =
  "A plain-language map for rare-disease patient groups: connections, reusable research, collaborators and a next step, with a source for every claim.";

export const Route = createFileRoute("/explore")({
  validateSearch: z.object({ node: z.string().optional(), edge: z.string().optional() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Atlas,
});

function Atlas() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const metaQ = useQuery({ queryKey: ["meta"], queryFn: fetchMeta, staleTime: Infinity });
  const anchor = metaQ.data?.actions?.anchor ?? metaQ.data?.anchor ?? "MONDO:0010099";
  const centerId = search.node ?? anchor;

  const hood = useQuery({
    queryKey: ["hood", centerId],
    queryFn: () => fetchNeighborhood(centerId),
    enabled: !!metaQ.data,
  });
  const anchorQ = useQuery({ queryKey: ["node", anchor], queryFn: () => fetchNodes([anchor]), enabled: !!metaQ.data });
  const anchorLabel = anchorQ.data?.[0]?.label ?? "your disease";

  const nodeMap = useMemo(() => new Map((hood.data?.nodes ?? []).map((n) => [n.id, n])), [hood.data]);

  // Edge may not be in the current view (e.g. opened from a step)
  const edgeQ = useQuery({
    queryKey: ["edge", search.edge],
    queryFn: async () => {
      const [e] = await fetchEdgesByIds([search.edge!]);
      if (!e) return null;
      const ns = await fetchNodes([e.source_id, e.target_id]);
      return { e, ns };
    },
    enabled: !!search.edge,
  });
  const edgeNodes = useMemo(() => {
    const m = new Map(nodeMap);
    edgeQ.data?.ns.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodeMap, edgeQ.data]);

  const [panel, setPanel] = useState<"week" | "detail">("week");
  const openNode = (id: string) => {
    navigate({ search: { node: id } });
    setPanel("detail");
  };
  const openEdge = (id: string) => {
    navigate({ search: (s) => ({ ...s, edge: id }) });
    setPanel("detail");
  };

  const center = hood.data?.center;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-8">
          <button onClick={() => navigate({ to: "/" })} className="shrink-0 text-left">
            <span className="font-serif text-xl">Rare Disease Atlas</span>
          </button>
          <div className="w-full max-w-2xl"><Search onPick={openNode} /></div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 lg:grid-cols-[380px_1fr_400px]">
        {/* Left: this week */}
        <aside className="order-2 border-b p-5 lg:order-1 lg:max-h-[calc(100vh-65px)] lg:overflow-auto lg:border-b-0 lg:border-r">
          {(metaQ.isLoading || hood.isLoading) && <p className="text-sm text-muted-foreground">Loading…</p>}
          {metaQ.error && <p className="text-sm text-destructive">Could not load data. Please refresh.</p>}
          {metaQ.data && (
            <ThisWeek meta={metaQ.data} anchorLabel={anchorLabel} onOpenNode={openNode} onOpenEdge={openEdge} />
          )}
        </aside>

        {/* Center: graph */}
        <section className="order-1 flex flex-col border-b lg:order-2 lg:border-b-0">
          <div className="px-5 pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{center ? TYPE_LABEL[center.type] ?? center.type : " "}</p>
            <h1 className="text-3xl leading-tight">{center?.label ?? "Loading map…"}</h1>
            {hood.data && (
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {hood.data.edges.length} of {hood.data.totalEdges} connections. Click a dot to open it, or a line to see where it came from.
              </p>
            )}
          </div>
          <div className="relative h-[60vh] min-h-[380px] lg:h-[calc(100vh-230px)]">
            {hood.data && (
              <Graph
                centerId={centerId}
                nodes={hood.data.nodes}
                edges={hood.data.edges}
                selectedEdgeId={search.edge}
                onSelectNode={(id) => (id === centerId ? setPanel("detail") : openNode(id))}
                onSelectEdge={openEdge}
              />
            )}
            {hood.error && <p className="p-5 text-sm text-destructive">Could not load connections. Please refresh.</p>}
            {edgeQ.error && <p className="p-5 text-sm text-destructive">Could not load that connection.</p>}
            {hood.data === null && <p className="p-5 text-sm text-muted-foreground">That item is not in the atlas.</p>}
          </div>
          <div className="border-t px-5 py-3"><Legend /></div>
        </section>

        {/* Right: details */}
        <aside className="order-3 p-5 lg:max-h-[calc(100vh-65px)] lg:overflow-auto lg:border-l">
          {search.edge && edgeQ.data ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Why this connection</p>
                <button aria-label="Close" onClick={() => navigate({ search: (s) => ({ node: s.node }) })}><X className="h-4 w-4" /></button>
              </div>
              <EdgeDetail edge={edgeQ.data.e} nodes={edgeNodes} onOpenNode={openNode} />
            </div>
          ) : center ? (
            <NodeDetail node={center} edges={hood.data?.edges ?? []} nodes={nodeMap} onEdge={openEdge} onNode={openNode} />
          ) : null}
        </aside>
      </main>

      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Research navigation tool, not medical advice. Always check with the study team or a clinician.
      </footer>
    </div>
  );
}

function NodeDetail({
  node,
  edges,
  nodes,
  onEdge,
  onNode,
}: {
  node: AtlasNode;
  edges: AtlasEdge[];
  nodes: Map<string, AtlasNode>;
  onEdge: (id: string) => void;
  onNode: (id: string) => void;
}) {
  const p = (node.props ?? {}) as Record<string, string | number | boolean | null>;
  const url = nodeUrl(node);
  const groups = new Map<string, AtlasEdge[]>();
  for (const e of edges) {
    const other = nodes.get(e.source_id === node.id ? e.target_id : e.source_id);
    const k = other?.type ?? "Other";
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const facts: [string, string | number | null | undefined][] = [
    ["Kind", ASSET_KIND_LABEL[String(p["kind"] ?? "")] ?? (p["kind"] as string)],
    ["Status", p["status"] ? String(p["status"]).replace(/_/g, " ").toLowerCase() : null],
    ["Run by", p["sponsor"] as string],
    ["Organisation", p["org"] as string],
    ["Year", (p["year"] ?? p["fiscal_year"]) as string],
    ["Contact", p["contact"] as string],
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{TYPE_LABEL[node.type] ?? node.type}</p>
        <h2 className="mt-1 text-xl leading-snug">{node.label}</h2>
        {node.synonyms && node.synonyms.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Also called: {node.synonyms.join(", ")}</p>
        )}
        {node.type === "PatientGroup" && (
          <p className="mt-1 text-xs text-muted-foreground">{p["verified"] ? "Confirmed on the group’s own website." : "Not confirmed on the group’s own website."}</p>
        )}
        {p["ambiguous"] && <p className="mt-1 text-xs text-muted-foreground">This name may match more than one person.</p>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>
        ))}
        <dt className="text-muted-foreground">ID</dt><dd className="text-xs text-muted-foreground">{node.id}</dd>
      </dl>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Open original record <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <div className="space-y-4">
        {[...groups.entries()].map(([type, es]) => (
          <details key={type} open={groups.size <= 3}>
            <summary className="cursor-pointer text-sm font-medium">
              {TYPE_LABEL[type] ?? type} <span className="text-muted-foreground">({es.length})</span>
            </summary>
            <ul className="mt-2 space-y-1">
              {es.map((e) => {
                const otherId = e.source_id === node.id ? e.target_id : e.source_id;
                const other = nodes.get(otherId);
                const rel = REL_LABEL[e.type] ?? e.type;
                return (
                  <li key={e.id} className="flex items-start gap-2 text-sm">
                    <TierDot tier={e.tier} />
                    <span className="flex-1 -mt-1">
                      <button onClick={() => onNode(otherId)} className="text-left hover:underline">{other?.label ?? otherId}</button>
                      <span className="block text-xs text-muted-foreground">
                        {e.source_id === node.id ? `this ${rel} it` : `it ${rel} this`}
                        {e.evidence_type === "inferred" && " · unproven"}
                        {e.contradicts && e.contradicts.length > 0 && <span className="text-contradict"> · evidence against</span>}
                        {" · "}
                        <button onClick={() => onEdge(e.id)} className="text-primary hover:underline">why?</button>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
        {edges.length === 0 && <p className="text-sm text-muted-foreground">No connections found for this item in the sources searched.</p>}
      </div>
    </div>
  );
}
