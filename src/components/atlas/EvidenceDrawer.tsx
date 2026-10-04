import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  EVTYPE_LABEL,
  REL_LABEL,
  fetchEdgesByIds,
  fetchEvidenceForEdge,
  fetchNodes,
  sourceName,
} from "@/lib/atlas";
import { EvBadge, TierBadge } from "./Legend";
import { SourceEvidence } from "./SourceEvidence";
import { citationDate, sourceRecordId } from "@/lib/citations";
import { Button } from "@/components/ui/button";

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
      if (!edgeId) return null;
      const [edge] = await fetchEdgesByIds([edgeId]);
      if (!edge) return null;
      const [ns, ev] = await Promise.all([
        fetchNodes([edge.source_id, edge.target_id]),
        fetchEvidenceForEdge(edge.id, [...(edge.evidence_ids ?? []), ...(edge.contradicts ?? [])]),
      ]);
      const paperIds = [...new Set(ev.map((e) => sourceRecordId(e.url)).filter((id): id is string => !!id))];
      const papers = await fetchNodes(paperIds.filter((id) => !ns.some((n) => n.id === id)));
      return { edge, nodes: new Map([...ns, ...papers].map((n) => [n.id, n])), ev };
    },
  });
  const d = q.data;
  const src = d?.nodes.get(d.edge.source_id)?.label ?? d?.edge.source_id;
  const tgt = d?.nodes.get(d.edge.target_id)?.label ?? d?.edge.target_id;

  return (
    <Sheet open={!!edgeId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
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
                  <Button variant="link" className="h-auto whitespace-normal p-0 text-left text-xs" onClick={() => onOpenNode(d.edge.source_id)}>Open {src}</Button>
                  <Button variant="link" className="h-auto whitespace-normal p-0 text-left text-xs" onClick={() => onOpenNode(d.edge.target_id)}>Open {tgt}</Button>
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
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm [&_dd]:break-words">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd><TierBadge tier={d.edge.tier} /></dd>
              <dt className="text-muted-foreground">Connection origin</dt>
              <dd>{sourceName(d.edge.source)}</dd>
              <dt className="text-muted-foreground">Retrieved on</dt>
              <dd>{citationDate(d.edge.retrieved_at)}</dd>
              <dt className="text-muted-foreground">Evidence type</dt>
              <dd className="flex flex-wrap items-center gap-2"><EvBadge ev={d.edge.evidence_type} />{d.edge.evidence_type ? EVTYPE_LABEL[d.edge.evidence_type] : "Not recorded"}</dd>
              {typeof d.edge.props?.["reason"] === "string" && !!d.edge.props["reason"] && (
                <>
                  <dt className="text-muted-foreground">Note</dt>
                  <dd>{d.edge.props["reason"] as string}</dd>
                </>
              )}
            </dl>

            <SourceEvidence edge={d.edge} evidence={d.ev} nodes={d.nodes} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

