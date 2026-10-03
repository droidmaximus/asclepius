import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/atlas/Header";
import { EvidenceDrawer } from "@/components/atlas/EvidenceDrawer";
import { GapState } from "@/components/atlas/GapState";
import { TierBadge } from "@/components/atlas/Legend";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ASSET_KIND_LABEL, fetchEdgesByIds, fetchMeta, fetchNodes, type Step, type Tier } from "@/lib/atlas";

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
  const anchorQ = useQuery({ queryKey: ["node", anchor], queryFn: () => fetchNodes([anchor!]), enabled: !!anchor });
  const steps = a?.steps ?? [];
  const allEdgeIds = [...new Set(steps.flatMap((s) => s.edge_ids ?? []))];
  const edgesQ = useQuery({ queryKey: ["step-edges", allEdgeIds.join()], queryFn: () => fetchEdgesByIds(allEdgeIds), enabled: allEdgeIds.length > 0 });
  const tierOf = new Map((edgesQ.data ?? []).map((e) => [e.id, e.tier]));
  const lowest = (s: Step): Tier | null => {
    const ts = (s.edge_ids ?? []).map((id) => tierOf.get(id)).filter(Boolean) as Tier[];
    return ts.length ? ts.reduce((m, t) => (rank[t] < rank[m] ? t : m)) : null;
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {metaQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {metaQ.error && <p className="text-sm text-destructive">Could not load your next steps. Please refresh.</p>}
        {a && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Your next step this week</p>
            <h1 className="mt-1 max-w-3xl text-3xl leading-tight md:text-4xl">
              For {name}, we found {leads} reusable research {leads === 1 ? "lead" : "leads"} you could ask about.
            </h1>
            {edgesQ.error && <p className="mt-2 text-sm text-destructive">Could not load confidence for some cards.</p>}

            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
              <div className="space-y-10">
                {steps.length === 0 && <GapState actions={a} />}
                {GROUPS.map((g) => {
                  const items = steps.filter(g.match);
                  if (!items.length) return null;
                  return (
                    <section key={g.key}>
                      <h2 className="mb-3 text-xl">{g.title} <span className="text-base text-muted-foreground">({items.length})</span></h2>
                      <div className="space-y-4">
                        {items.map((s) => <StepCard key={s.id} step={s} tier={lowest(s)} onEvidence={openEdge} />)}
                      </div>
                    </section>
                  );
                })}
              </div>

              <aside className="space-y-6 text-sm">
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
                      {a.coverage.papers} papers, {a.coverage.studies} studies, {a.coverage.verified_patient_groups} confirmed patient group(s). Retrieved {metaQ.data?.retrieved_at}.
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
                        {r.edge_ids[0] && <button onClick={() => openEdge(r.edge_ids[0])} className="text-xs text-primary hover:underline">Show the evidence</button>}
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

function StepCard({ step: s, tier, onEvidence }: { step: Step; tier: Tier | null; onEvidence: (id: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [cites, setCites] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const draftIt = async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("draft-proposal", { body: { step_id: s.id, step: s } });
      if (error) throw error;
      const d = data as Record<string, unknown>;
      setDraft(String(d["text"] ?? d["draft"] ?? d["message"] ?? d["body"] ?? ""));
      const c = (d["citations"] ?? d["cited_edge_ids"] ?? []) as unknown[];
      setCites(c.map((x) => (typeof x === "string" ? x : String((x as Record<string, unknown>)["edge_id"] ?? (x as Record<string, unknown>)["id"] ?? JSON.stringify(x)))));
    } catch {
      setErr("The message drafting service is not available right now.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-md border p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-snug">{s.title}</h3>
          {s.asset_kind && <p className="text-xs text-muted-foreground">{ASSET_KIND_LABEL[s.asset_kind] ?? s.asset_kind}</p>}
        </div>
        {tier && <TierBadge tier={tier} />}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{s.explanation?.text || s.why}</p>
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
      <div className="mt-4 flex flex-wrap gap-2">
        {(s.edge_ids ?? []).map((e, i) => (
          <Button key={e} variant="outline" size="sm" onClick={() => onEvidence(e)}>
            Show the evidence{(s.edge_ids?.length ?? 0) > 1 ? ` ${i + 1}` : ""}
          </Button>
        ))}
        <Button size="sm" onClick={draftIt} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Draft a message
        </Button>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      {draft !== null && (
        <div className="mt-4 space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} aria-label="Draft message" />
          {cites.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Citations:{" "}
              {cites.map((c) => <button key={c} onClick={() => onEvidence(c)} className="mr-2 text-primary hover:underline">{c}</button>)}
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
