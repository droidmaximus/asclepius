import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ExternalLink, Loader2, PanelLeftClose, PanelLeftOpen, Network } from "lucide-react";
import { Graph } from "@/components/atlas/Graph";
import { Search } from "@/components/atlas/Search";
import { Header, Footer } from "@/components/atlas/Header";
import { EvidenceDrawer } from "@/components/atlas/EvidenceDrawer";
import { GapState } from "@/components/atlas/GapState";
import { Legend, TierDot, TypeDot } from "@/components/atlas/Legend";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ASSET_KIND_LABEL,
  MECH_LABEL,
  REL_LABEL,
  TYPE_LABEL,
  MAX_NODES,
  expandNode,
  fetchMeta,
  fetchNeighborhood,
  fetchNodes,
  nodeUrl,
  type AtlasEdge,
  type AtlasNode,
  type GraphData,
  type Meta,
  type Pair,
} from "@/lib/atlas";

const TITLE = "Explore connections — Asclepius";
const DESC = "See how a rare disease connects to genes, symptoms, studies, patient groups and researchers, with the source behind every link.";

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
  component: Explore,
});

function Explore() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const metaQ = useQuery({ queryKey: ["meta"], queryFn: fetchMeta, staleTime: Infinity });
  const anchor = metaQ.data?.actions?.anchor ?? metaQ.data?.anchor;
  const centerId = search.node ?? anchor;
  const [showWeak, setShowWeak] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  const base = useQuery({
    queryKey: ["hood", centerId, showWeak],
    queryFn: () => centerId ? fetchNeighborhood(centerId, showWeak) : Promise.resolve(null),
    enabled: !!centerId,
  });
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    setGraph(base.data ?? null);
    setSelected(null);
    setNote(null);
  }, [base.data]);

  const nodeMap = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const center = base.data?.center;

  const tapNode = async (id: string) => {
    setSelected(id);
    if (!graph || expanding) return;
    setExpanding(id);
    try {
      const g = await expandNode(graph, id, showWeak);
      setGraph(g);
      setNote(g.added ? `Added ${g.added} links from ${nodeMap.get(id)?.label}.` : `No more ${showWeak ? "" : "strong "}links to add from ${nodeMap.get(id)?.label}.`);
    } catch {
      setNote("Could not load more links. Please try again.");
    } finally {
      setExpanding(null);
    }
  };
  const openNode = (id: string) => navigate({ search: { node: id } });
  const openEdge = (id: string) => navigate({ search: (s) => ({ ...s, edge: id }) });

  const actions = metaQ.data?.actions;
  const isGap =
    !!center && center.type === "Disease" && !!actions && !actions.family.includes(center.id) &&
    !(actions.steps ?? []).some((s) => (s.edge_ids ?? []).some((e) => e.includes(center.id)));
  const detailNode = (selected && nodeMap.get(selected)) || center;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header><Search onPick={openNode} /></Header>

      <main className={`atlas-workspace flex-1 ${contextOpen ? "" : "is-collapsed"}`}>
        <aside className="atlas-context">
          <div className="mb-6 flex items-center justify-between gap-2">
            {contextOpen && <h2 className="font-sans text-xs font-semibold uppercase text-primary">Research maps</h2>}
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setContextOpen(!contextOpen)} aria-label={contextOpen ? "Collapse context" : "Show context"} title={contextOpen ? "Collapse context" : "Show context"}>
              {contextOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          </div>
          {contextOpen && <div>
          {metaQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {metaQ.error && <p className="text-sm text-destructive">Could not load the atlas summary. Please refresh.</p>}
          {metaQ.data && <ClusterPanel meta={metaQ.data} onOpenNode={openNode} />}
          {detailNode && graph && <section className="mt-6"><NodeDetail node={detailNode} isCenter={detailNode.id === centerId} edges={graph.edges} nodes={nodeMap} onEdge={openEdge} onCenter={openNode} /></section>}
          </div>}
        </aside>

        <section className="min-w-0 flex flex-col">
          <div className="atlas-map-heading space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{center ? TYPE_LABEL[center.type] ?? center.type : "\u00a0"}</p>
              <h1 className="text-3xl leading-tight">{center?.label ?? (base.isLoading || metaQ.isLoading ? "Loading map…" : "Not found")}</h1>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {graph && `${graph.nodes.length} items, ${graph.edges.length} links shown.`}
                {graph && graph.hiddenWeak > 0 && ` ${graph.hiddenWeak} weaker links hidden.`}
                
              </span>
              <label className="flex items-center gap-2 text-foreground">
                <Switch checked={showWeak} onCheckedChange={setShowWeak} aria-label="Show weaker links" /> Show weaker links
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => centerId && tapNode(centerId)} disabled={!graph || !!expanding || graph.nodes.length >= MAX_NODES || graph.hiddenOver === 0}>More connections</Button>
              {graph && graph.hiddenOver > 0 && <span className="text-xs text-muted-foreground">{graph.hiddenOver} more direct links available</span>}
              {graph && graph.nodes.length >= MAX_NODES && <span className="text-xs text-muted-foreground">Map limit reached. Put another item at the centre.</span>}
            </div>
            {isGap && <GapState actions={actions} />}
            {base.error && <p className="text-sm text-destructive">Could not load connections. Please refresh.</p>}
            {base.data === null && <p className="text-sm text-muted-foreground">That item is not in the atlas.</p>}
            {graph && graph.edges.length === 0 && !isGap && <GapState actions={actions} missing="No links to this item were found with this filter. Try “Show weaker links”." />}
          </div>
          <div className="atlas-map-surface">
            {(base.isLoading || expanding) && (
              <p className="absolute right-4 top-3 z-10 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading links…</p>
            )}
            {note && <p className="absolute left-4 top-3 z-10 rounded bg-background/90 px-2 text-xs text-muted-foreground" role="status">{note}</p>}
            {graph && centerId && graph.edges.length > 0 && (
              <Graph centerId={centerId} nodes={graph.nodes} edges={graph.edges} level={graph.level} selectedEdgeId={search.edge} onTapNode={tapNode} onSelectEdge={openEdge} />
            )}
          </div>
          <div className="mx-5 border-t py-4 lg:mx-9"><Legend /></div>
          {anchor && <div className="mx-5 mb-8 flex items-center gap-3 border-t pt-5 lg:mx-9"><Network className="h-5 w-5 text-primary" /><Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={() => navigate({ to: "/next-step" })}>Reusable research and people for your next step →</Button></div>}
        </section>

      </main>
      <Footer />
      <EvidenceDrawer edgeId={search.edge} onClose={() => navigate({ search: (s) => ({ node: s.node }) })} onOpenNode={openNode} />
    </div>
  );
}

/* ---------------- Cluster neighbours + counterexamples ---------------- */

function ClusterPanel({ meta, onOpenNode }: { meta: Meta; onOpenNode: (id: string) => void }) {
  const anchor = meta.actions?.anchor ?? meta.anchor ?? "";
  const analysis = meta.analysis;
  const neighbors = Object.entries(meta.actions?.neighbors ?? {}).sort((a, b) => b[1] - a[1]);
  const pairs = analysis?.pairs ?? [];
  const counter = analysis?.counterexamples ?? [];
  const findPair = (x: string) => pairs.find((p) => (p.a === anchor && p.b === x) || (p.b === anchor && p.a === x));
  const ids = new Set<string>([anchor, ...neighbors.map(([id]) => id)]);
  for (const p of [...counter, ...neighbors.map(([id]) => findPair(id)).filter(Boolean) as Pair[]]) {
    ids.add(p.a); ids.add(p.b); p.shared_genes.forEach((g) => ids.add(g));
  }
  const labelsQ = useQuery({ queryKey: ["labels", [...ids].sort().join()], queryFn: () => fetchNodes([...ids]) });
  const L = new Map((labelsQ.data ?? []).map((n) => [n.id, n.label]));
  const lab = (id: string) => L.get(id) ?? id;
  const [open, setOpen] = useState<Pair | null>(null);
  const lookAlike = counter.filter((c) => c.kind === "look_alike_different_mechanism");
  const samePath = counter.filter((c) => c.kind !== "look_alike_different_mechanism");

  return (
    <Tabs defaultValue="neighbours">
      <TabsList className="h-auto w-full flex-wrap">
        <TabsTrigger value="neighbours" className="flex-1">Neighbours</TabsTrigger>
        <TabsTrigger value="counter" className="flex-1">Counterexamples</TabsTrigger>
      </TabsList>
      <TabsContent value="neighbours" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Diseases most similar to {lab(anchor)}, scored by shared symptoms, genes and body processes.</p>
        {labelsQ.error && <p className="text-sm text-destructive">Could not load names.</p>}
        {neighbors.length === 0 && <p className="text-sm text-muted-foreground">No close neighbours were found.</p>}
        <ul className="space-y-2">
          {neighbors.map(([id, score]) => {
            const p = findPair(id);
            const genes = p?.shared_genes.map(lab) ?? [];
            const mechs = p?.shared_mechanisms.map((m) => MECH_LABEL[m] ?? m) ?? [];
            return (
              <li key={id} className="border-l-2 border-border py-3 pl-3 text-sm hover:border-primary">
                <div className="flex items-baseline justify-between gap-2">
                  <Button variant="link" onClick={() => onOpenNode(id)} className="text-left hover:underline">{lab(id)}</Button>
                  <span className="shrink-0 text-xs text-muted-foreground">{Math.round(score * 100)}% similar</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {genes.length ? `Shared genes: ${genes.join(", ")}. ` : "No shared genes. "}
                  {mechs.length ? `Shared pathway: ${mechs.join(", ")}.` : "No shared pathway."}
                </p>
                {p && <Button variant="link" onClick={() => setOpen(p)} className="mt-1 text-xs text-primary hover:underline">Why these are neighbours</Button>}
              </li>
            );
          })}
        </ul>
      </TabsContent>
      <TabsContent value="counter" className="mt-4 space-y-5">
        <p className="text-sm text-muted-foreground">Cases where similar looks and shared causes point in different directions. Useful for checking a lead before acting on it.</p>
        <CounterList title="Look alike, different cause" items={lookAlike} lab={lab} onOpen={setOpen} />
        <CounterList title="Different symptoms, same pathway" items={samePath} lab={lab} onOpen={setOpen} />
      </TabsContent>
      <PairDialog pair={open} onClose={() => setOpen(null)} lab={lab} termLabels={analysis?.term_labels ?? {}} />
    </Tabs>
  );
}

function CounterList({ title, items, lab, onOpen }: { title: string; items: Pair[]; lab: (id: string) => string; onOpen: (p: Pair) => void }) {
  return (
    <section>
      <h3 className="mb-2 text-base">{title}</h3>
      {items.length === 0 && <p className="text-sm text-muted-foreground">None found.</p>}
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.a + p.b}>
            <Button variant="link" onClick={() => onOpen(p)} className="h-auto min-w-0 w-full rounded-md border p-3 text-left text-sm whitespace-normal hover:border-primary">
              <span className="block min-w-0 w-full break-words">
                <span className="block">{lab(p.a)} <span className="text-muted-foreground">and</span> {lab(p.b)}</span>
                <span className="mt-2 block text-xs text-muted-foreground">{p.shared_terms.length} shared symptoms · {p.shared_mechanisms.length ? "same pathway" : "different pathway"}</span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PairDialog({ pair, onClose, lab, termLabels }: { pair: Pair | null; onClose: () => void; lab: (id: string) => string; termLabels: Record<string, string> }) {
  return (
    <Dialog open={!!pair} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {pair && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl font-medium">{lab(pair.a)} and {lab(pair.b)}</DialogTitle>
              <DialogDescription>Similarity score {Math.round(pair.score * 100)}%. This is our own scoring (inferred), not a proven link.</DialogDescription>
            </DialogHeader>
            <section className="text-sm">
              <h4 className="mb-1 font-medium">Top shared symptoms</h4>
              {pair.shared_terms.length ? (
                <ul className="list-disc pl-5">{pair.shared_terms.map((t) => <li key={t}>{termLabels[t] ?? t}</li>)}</ul>
              ) : <p className="text-muted-foreground">None.</p>}
            </section>
            <section className="text-sm">
              <h4 className="mb-1 font-medium">Shared pathways</h4>
              <p>{pair.shared_mechanisms.length ? pair.shared_mechanisms.map((m) => MECH_LABEL[m] ?? m).join(", ") : "None."}</p>
            </section>
            <section className="text-sm">
              <h4 className="mb-1 font-medium">Shared genes</h4>
              <p>{pair.shared_genes.length ? pair.shared_genes.map(lab).join(", ") : "None."}</p>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Node detail ---------------- */

function NodeDetail({
  node, isCenter, edges, nodes, onEdge, onCenter,
}: {
  node: AtlasNode; isCenter: boolean; edges: AtlasEdge[]; nodes: Map<string, AtlasNode>;
  onEdge: (id: string) => void; onCenter: (id: string) => void;
}) {
  const p = (node.props ?? {}) as Record<string, string | number | boolean | null>;
  const url = nodeUrl(node);
  const mine = edges.filter((e) => e.source_id === node.id || e.target_id === node.id);
  const groups = new Map<string, AtlasEdge[]>();
  for (const e of mine) {
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
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><TypeDot type={node.type} />{TYPE_LABEL[node.type] ?? node.type}</p>
        <h2 className="mt-1 text-xl leading-snug">{node.label}</h2>
        {node.synonyms && node.synonyms.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Also called: {node.synonyms.join(", ")}</p>}
        {node.type === "PatientGroup" && (
          <p className="mt-1 text-xs text-muted-foreground">{p["verified"] ? "Confirmed on the group’s own website." : "Not confirmed on the group’s own website."}</p>
        )}
        {p["ambiguous"] && <p className="mt-1 text-xs text-muted-foreground">Name may match several people.</p>}
        {!isCenter && (
          <Button variant="link" onClick={() => onCenter(node.id)} className="mt-2 text-sm text-primary hover:underline">Put this at the centre</Button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Open original record <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <div className="space-y-3">
        {[...groups.entries()].map(([type, es]) => (
          <details key={type} open={groups.size <= 3}>
            <summary className="cursor-pointer text-sm font-medium">{TYPE_LABEL[type] ?? type} <span className="text-muted-foreground">({es.length})</span></summary>
            <ul className="mt-2 space-y-1">
              {es.map((e) => {
                const otherId = e.source_id === node.id ? e.target_id : e.source_id;
                const rel = REL_LABEL[e.type] ?? e.type;
                return (
                  <li key={e.id}>
                    <Button variant="link" onClick={() => onEdge(e.id)} className="flex w-full items-start gap-2 rounded px-1 py-1 text-left text-sm hover:bg-muted">
                      <TierDot tier={e.tier} />
                      <span className="-mt-1 flex-1">
                        {nodes.get(otherId)?.label ?? otherId}
                        <span className="block text-xs text-muted-foreground">
                          {e.source_id === node.id ? `this ${rel} it` : `it ${rel} this`}
                          {e.evidence_type === "inferred" && " · unproven"}
                          {e.contradicts && e.contradicts.length > 0 && <span className="text-contradict"> · evidence against</span>}
                        </span>
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
        {mine.length === 0 && <p className="text-sm text-muted-foreground">No links shown for this item yet.</p>}
      </div>
    </div>
  );
}
