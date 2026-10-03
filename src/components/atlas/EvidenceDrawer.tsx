import { useQuery } from "@tanstack/react-query";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  EVTYPE_LABEL,
  REL_LABEL,
  fetchEdgesByIds,
  fetchEvidenceForEdge,
  fetchNodes,
  sourceName,
  type Evidence,
} from "@/lib/atlas";
import { EvBadge, TierBadge } from "./Legend";

export function EvidenceDrawer({
  edgeId,
  onClose,
  onOpenNode,
}: {
  edgeId: string | undefined;
  onClose: () => void;
  onOpenNode?: (id: string) => void;
}) {
  const q = useQuery({
    queryKey: ["edge-full", edgeId],
    enabled: !!edgeId,
    queryFn: async () => {
      const [edge] = await fetchEdgesByIds([edgeId!]);
      if (!edge) return null;
      const [ns, ev] = await Promise.all([
        fetchNodes([edge.source_id, edge.target_id]),
        fetchEvidenceForEdge(edge.id, edge.contradicts ?? []),
      ]);
      return { edge, nodes: new Map(ns.map((n) => [n.id, n])), ev };
    },
  });
  const d = q.data;
  const contraIds = new Set(d?.edge.contradicts ?? []);
  const isAgainst = (e: Evidence) => e.polarity === "contradicts" || contraIds.has(e.id);
  const supporting = d?.ev.filter((e) => !isAgainst(e)) ?? [];
  const against = d?.ev.filter(isAgainst) ?? [];
  const src = d?.nodes.get(d.edge.source_id)?.label ?? d?.edge.source_id;
  const tgt = d?.nodes.get(d.edge.target_id)?.label ?? d?.edge.target_id;

  return (
    <Sheet open={!!edgeId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Why this connection</p>
          <SheetTitle className="font-serif text-xl font-medium leading-snug">
            {d ? `${src} ${REL_LABEL[d.edge.type] ?? d.edge.type.replace(/_/g, " ")} ${tgt}` : q.isLoading ? "Loading…" : "Connection not found"}
          </SheetTitle>
          <SheetDescription className="sr-only">Source, confidence and quotes for this connection.</SheetDescription>
        </SheetHeader>
        {q.error && <p className="mt-4 text-sm text-destructive">Could not load this connection. Please try again.</p>}
        {d && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap gap-2">
              {onOpenNode && (
                <>
                  <button className="text-xs text-primary hover:underline" onClick={() => onOpenNode(d.edge.source_id)}>Open {src}</button>
                  <button className="text-xs text-primary hover:underline" onClick={() => onOpenNode(d.edge.target_id)}>Open {tgt}</button>
                </>
              )}
            </div>
            {d.edge.props?.["weak"] === true && (
              <p className="rounded-md border border-tier-medium bg-accent p-3 text-sm text-accent-foreground">
                This study lists many diseases, so check it covers yours specifically.
              </p>
            )}
            {d.edge.evidence_type === "inferred" && (
              <p className="rounded-md bg-muted p-3 text-sm">This link comes from our own scoring. It is a lead to check, not a proven result.</p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd><TierBadge tier={d.edge.tier} /></dd>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{sourceName(d.edge.source)}</dd>
              <dt className="text-muted-foreground">Retrieved on</dt>
              <dd>{d.edge.retrieved_at}</dd>
              <dt className="text-muted-foreground">Evidence type</dt>
              <dd className="flex items-center gap-2"><EvBadge ev={d.edge.evidence_type} />{EVTYPE_LABEL[d.edge.evidence_type ?? "observed"]}</dd>
              {typeof d.edge.props?.["reason"] === "string" && (
                <>
                  <dt className="text-muted-foreground">Note</dt>
                  <dd>{d.edge.props["reason"] as string}</dd>
                </>
              )}
            </dl>

            <section className="space-y-2">
              <h4 className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">Supporting quotes</h4>
              {supporting.length === 0 && (
                <p className="text-sm text-muted-foreground">No quoted sentence. This link comes from a database record.</p>
              )}
              {supporting.map((e) => <Quote key={e.id} e={e} />)}
            </section>

            <section className="space-y-2 rounded-md border border-contradict/40 p-3">
              <h4 className="flex items-center gap-1.5 font-sans text-xs font-medium uppercase tracking-wide text-contradict">
                <AlertTriangle className="h-3.5 w-3.5" /> Contradicting evidence
              </h4>
              {against.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contradicting evidence found in the sources searched</p>
              ) : (
                against.map((e) => <Quote key={e.id} e={e} against />)
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Quote({ e, against }: { e: Evidence; against?: boolean }) {
  return (
    <blockquote className={`border-l-2 pl-3 text-sm ${against ? "border-contradict" : "border-primary"}`}>
      {e.quote ? <p>“{e.quote}”</p> : <p className="text-muted-foreground">No quote recorded.</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        <span className={against ? "text-contradict" : "text-primary"}>{against ? "Contradicts" : "Supports"}</span>
        {" · "}
        {e.url ? (
          <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {sourceName(e.source)} <ExternalLink className="h-3 w-3" />
          </a>
        ) : sourceName(e.source)}
        {e.retrieved_at && <> · retrieved {e.retrieved_at}</>}
      </p>
    </blockquote>
  );
}
