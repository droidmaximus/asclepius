import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Loader2, AlertTriangle, ArrowUpRight, BookOpen, Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { draftProposal, explainStep } from "@/lib/ai.functions";
import { Header, Footer } from "@/components/atlas/Header";
import { EvidenceDrawer } from "@/components/atlas/EvidenceDrawer";
import { SourceEvidence } from "@/components/atlas/SourceEvidence";
import { citationDate, sourceRecordId } from "@/lib/citations";
import { GapState } from "@/components/atlas/GapState";
import { TierBadge } from "@/components/atlas/Legend";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ASSET_KIND_LABEL, REL_LABEL, sourceName, fetchEvidenceBundle, fetchEdgesByIds, fetchMeta, fetchNodes, type AtlasEdge, type AtlasNode, type Evidence, type Step, type Tier } from "@/lib/atlas";

const TITLE = "Your next step this week — Rare Disease Atlas";
const DESC = "Reusable registries, studies and patient groups for your disease, with what differs, what to ask an expert, and the source for each.";

export const Route = createFileRoute("/next-step")({
  validateSearch: z.object({ edge: z.string().optional() }),
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
  component: NextStep,
});

const GROUPS: { key: string; title: string; match: (s: Step) => boolean }[] = [
  { key: "direct", title: "Covers your disease family", match: (s) => s.kind !== "join_forces" && s.relation === "direct" },
  { key: "neighbor", title: "Close neighbour you could adapt from", match: (s) => s.kind !== "join_forces" && s.relation === "neighbor" },
  { key: "mechanism", title: "Linked through the same pathway", match: (s) => s.kind !== "join_forces" && s.relation === "mechanism" },
  { key: "groups", title: "Patient groups", match: (s) => s.kind === "join_forces" },
];
const rank: Record<string, number> = { low: 0, medium: 1, high: 2 };

function NextStep() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/next-step" });
  const metaQ = useQuery({ queryKey: ["meta"], queryFn: fetchMeta, staleTime: Infinity });
  const a = metaQ.data?.actions;
  const anchor = a?.anchor ?? metaQ.data?.anchor;
  const anchorQ = useQuery({ queryKey: ["node", anchor], queryFn: () => fetchNodes(anchor ? [anchor] : []), enabled: !!anchor });
  const steps = a?.steps ?? [];
  const allEdgeIds = [...new Set(steps.flatMap((s) => s.edge_ids ?? []))];
  const edgesQ = useQuery({ queryKey: ["step-edges", allEdgeIds.join()], queryFn: () => fetchEdgesByIds(allEdgeIds), enabled: allEdgeIds.length > 0 });
  const evidenceQ = useQuery({
    queryKey: ["step-source-evidence", allEdgeIds.join()],
    enabled: !!edgesQ.data,
    queryFn: async () => {
      const edges = edgesQ.data ?? [];
      const evidence = await fetchEvidenceBundle(edges);
      const ids = [...new Set([...edges.flatMap((e) => [e.source_id, e.target_id]), ...evidence.map((e) => sourceRecordId(e.url)).filter((id): id is string => !!id)])];
      const nodes = await fetchNodes(ids);
      return { evidence, nodes: new Map(nodes.map((n) => [n.id, n])) };
    },
  });
  const tierOf = new Map((edgesQ.data ?? []).map((e) => [e.id, e.tier]));
  const lowest = (s: Step): Tier | null => {
    const ts = (s.edge_ids ?? []).map((id) => tierOf.get(id)).filter(Boolean) as Tier[];
    return ts.length ? ts.reduce((m, t) => ((rank[t] ?? 0) < (rank[m] ?? 0) ? t : m)) : null;
  };
  const researchers = metaQ.data?.shared_researchers ?? [];
  const resDiseaseIds = [...new Set(researchers.flatMap((r) => r.diseases))];
  const resLabels = useQuery({ queryKey: ["labels", resDiseaseIds.join()], queryFn: () => fetchNodes(resDiseaseIds), enabled: resDiseaseIds.length > 0 });
  const dl = new Map((resLabels.data ?? []).map((n) => [n.id, n.label]));
  const name = anchorQ.data?.[0]?.label ?? "your disease";
  const leads = steps.filter((s) => s.kind === "reuse_asset").length;
  const openEdge = (id: string) => navigate({ search: { edge: id } });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-8 lg:px-9">
        {metaQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {metaQ.error && <p className="text-sm text-destructive">Could not load your next steps. Please refresh.</p>}
        {a && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Your next step this week</p>
            <h1 className="mt-3 max-w-4xl text-3xl leading-snug md:text-4xl">{name}</h1>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground">For {name}, we found {leads} reusable research {leads === 1 ? "lead" : "leads"} you could ask about.</p>
              {anchor && <Button variant="outline" onClick={() => navigate({ to: "/explore", search: { node: anchor } })}><ArrowUpRight /> Explore connections</Button>}
            </div>
            {edgesQ.error && <p className="mt-2 text-sm text-destructive">Could not load confidence for some cards.</p>}

            <div className="mt-8 grid gap-8 border-t pt-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="min-w-0 space-y-10 lg:col-start-2 lg:row-start-1">
                {steps.length === 0 && <GapState actions={a} />}
                {GROUPS.map((g) => {
                  const items = steps.filter(g.match);
                  if (!items.length) return null;
                  return (
                    <section key={g.key}>
                      <h2 className="mb-3 text-xl">{g.title} <span className="text-base text-muted-foreground">({items.length})</span></h2>
                      <div className="space-y-4">
                        {items.map((s) => <StepCard key={s.id} step={s} tier={lowest(s)} onEvidence={openEdge} edges={edgesQ.data ?? []} sourceData={evidenceQ.data} sourceError={!!evidenceQ.error || !!edgesQ.error} />)}
                      </div>
                    </section>
                  );
                })}
              </div>

              <aside className="atlas-context space-y-2 text-sm lg:col-start-1 lg:row-start-1">
                {a.next_question && (
                  <section className="rounded-md bg-accent p-4 text-accent-foreground">
                    <h3 className="mb-1 text-base">Question to test next</h3>
                    <p>{a.next_question}</p>
                  </section>
                )}
                <section className="rounded-md border p-4">
                  <h3 className="mb-2 text-base">Gaps</h3>
                  {a.gaps.length === 0 ? (
                    <p className="text-muted-foreground">No gaps were flagged for this disease in the sources searched.</p>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5">{a.gaps.map((g, i) => <li key={i}>{typeof g === "string" ? g : JSON.stringify(g)}</li>)}</ul>
                  )}
                </section>
                <section className="rounded-md border p-4">
                  <h3 className="mb-2 text-base">What we searched</h3>
                  <ul className="list-disc pl-5">{(a.coverage?.sources_searched ?? []).map((s) => <li key={s}>{s}</li>)}</ul>
                  {a.coverage && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {a.coverage.papers} papers, {a.coverage.studies} studies, {a.coverage.verified_patient_groups} confirmed patient group(s). Retrieved {citationDate(metaQ.data?.retrieved_at)}.
                    </p>
                  )}
                </section>
                <section className="rounded-md border p-4">
                  <h3 className="mb-2 text-base">People working across these diseases</h3>
                  {researchers.length === 0 && <p className="text-muted-foreground">None found.</p>}
                  <ul className="space-y-3">
                    {researchers.map((r) => (
                      <li key={r.researcher_id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{tidy(r.name)}</span>
                          {r.ambiguous && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-tier-medium px-2 py-0.5 text-[11px] text-muted-foreground">
                              <AlertTriangle className="h-3 w-3" /> Name may match several people
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{r.diseases.map((d) => dl.get(d) ?? d).join(", ")}</p>
                        {r.edge_ids.map((id, i) => <Button key={id} variant="link" onClick={() => openEdge(id)} className="h-auto whitespace-normal p-0 pr-3 text-left text-xs">Research connection {i + 1}</Button>)}
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
      <EvidenceDrawer edgeId={search.edge} onClose={() => navigate({ search: {} })} />
    </div>
  );
}

function StepCard({ step: s, tier, onEvidence, edges, sourceData, sourceError }: { step: Step; tier: Tier | null; onEvidence: (id: string) => void; edges: AtlasEdge[]; sourceData: { evidence: Evidence[]; nodes: Map<string, AtlasNode> } | undefined; sourceError: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [cites, setCites] = useState<string[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [plain, setPlain] = useState<{ text: string; fallback: boolean } | null>(null);
  const [explBusy, setExplBusy] = useState(false);
  const draftFn = useServerFn(draftProposal);
  const explainFn = useServerFn(explainStep);
  const draftIt = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await draftFn({ data: { step_id: s.id } });
      setDraft(r.text); setCites(r.cited_edge_ids); setIsFallback(r.fallback);
      if (r.error) setErr(r.error);
    } catch {
      setErr("Could not draft a message right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const explainIt = async () => {
    setExplBusy(true);
    try {
      const r = await explainFn({ data: { step_id: s.id } });
      setPlain({ text: r.text, fallback: r.fallback });
    } catch {
      setPlain({ text: s.why ?? "", fallback: true });
    } finally {
      setExplBusy(false);
    }
  };
  const hasExplanation = !!s.explanation?.text;
  const stepEdges = (s.edge_ids ?? []).flatMap((id) => edges.filter((e) => e.id === id));
  const connectionLabel = (edge: AtlasEdge) => `${sourceData?.nodes.get(edge.source_id)?.label ?? edge.source_id} ${REL_LABEL[edge.type] ?? edge.type.replace(/_/g, " ")} ${sourceData?.nodes.get(edge.target_id)?.label ?? edge.target_id}`;
  const citationLabel = (id: string) => {
    const edge = edges.find((e) => e.id === id);
    return edge ? `${sourceName(edge.source)} · ${connectionLabel(edge)}` : id;
  };
  return (
    <article className="atlas-lead">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-snug">{s.title}</h3>
          {s.asset_kind && <p className="text-xs text-muted-foreground">{ASSET_KIND_LABEL[s.asset_kind] ?? s.asset_kind}</p>}
        </div>
        {tier && <TierBadge tier={tier} />}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{hasExplanation || (plain && !plain.fallback) ? "Suggested lead · summary, not a source quotation" : "Why this lead was suggested · not a source quotation"}</p>
      <p className="mt-1 text-sm leading-relaxed">{hasExplanation ? s.explanation?.text : plain?.text || s.why}</p>
      {!hasExplanation && !plain && (
        <Button variant="link" onClick={explainIt} disabled={explBusy} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          {explBusy && <Loader2 className="h-3 w-3 animate-spin" />} Explain in plain words
        </Button>
      )}
      {plain?.fallback && <p className="mt-1 text-xs text-muted-foreground">This is a plain summary of the stored reason.</p>}
      <details className="mt-4 min-w-0 border-t pt-3">
        <summary className="cursor-pointer text-sm font-medium">Sources & quoted evidence ({s.edge_ids?.length ?? 0} connections)</summary>
        <div className="mt-4 space-y-6">
          {sourceError ? <p className="text-sm text-destructive">Could not load the sources. Open a connection below to try again.</p> : !sourceData ? <p className="text-sm text-muted-foreground">Loading source passages…</p> : <>
            {!stepEdges.length && <p className="text-sm text-muted-foreground">No source connections were supplied for this lead.</p>}
            {stepEdges.map((edge) => <section key={edge.id} className="min-w-0 space-y-3">
              <h4 className="break-words font-sans text-sm font-semibold">{connectionLabel(edge)}</h4>
              <p className="text-xs text-muted-foreground">{sourceName(edge.source)} · {edge.evidence_type === "inferred" ? "Suggested connection, not proven" : edge.evidence_type === "extracted" ? "Read from a source by AI" : "Database connection"} · retrieved {citationDate(edge.retrieved_at)}</p>
              <SourceEvidence edge={edge} evidence={sourceData.evidence.filter((e) => e.edge_id === edge.id || (edge.evidence_ids ?? []).includes(e.id) || (edge.contradicts ?? []).includes(e.id))} nodes={sourceData.nodes} />
            </section>)}
          </>}
        </div>
      </details>
      <details className="mt-4 border-t pt-4">
        <summary>What differs & questions to ask</summary>
      {s.differences && s.differences.length > 0 && (
        <div className="mt-3 text-sm">
          <h4 className="font-medium">What differs</h4>
          <ul className="list-disc pl-5 text-muted-foreground">{s.differences.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
      {s.review_questions && s.review_questions.length > 0 && (
        <div className="mt-3 text-sm">
          <h4 className="font-medium">Ask an expert first</h4>
          <ul className="mt-1 space-y-1">
            {s.review_questions.map((q) => (
              <li key={q}>
                <label className="flex items-start gap-2"><Checkbox className="mt-0.5" /> <span>{q}</span></label>
              </li>
            ))}
          </ul>
        </div>
      )}
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        {(s.edge_ids ?? []).map((e, i) => (
          <Button key={e} variant="outline" size="sm" onClick={() => onEvidence(e)} className="h-auto max-w-full whitespace-normal text-left">
            <BookOpen /> <span className="min-w-0 break-words">{edges.find((edge) => edge.id === e) ? sourceName(edges.find((edge) => edge.id === e)?.source) : "Show the evidence"}{(s.edge_ids?.length ?? 0) > 1 ? ` · connection ${i + 1}` : ""}</span>
          </Button>
        ))}
        <Button size="sm" onClick={draftIt} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail />} Draft a message
        </Button>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      {draft !== null && (
        <div className="mt-4 space-y-2">
          {isFallback && (
            <p className="text-xs text-muted-foreground">We could not write a checked draft, so this is a plain summary of why this step was suggested.</p>
          )}
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} aria-label="Draft message" />
          {cites.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Citations:{" "}
              {cites.map((c) => <Button variant="link" key={c} onClick={() => onEvidence(c)} className="h-auto max-w-full whitespace-normal p-0 text-left"><span className="min-w-0 break-words">{citationLabel(c)}</span></Button>)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Check every claim before sending. This draft is not medical advice.</p>
        </div>
      )}
    </article>
  );
}

function tidy(s: string) {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}
