import { useQuery } from "@tanstack/react-query";
import { ExternalLink, AlertTriangle } from "lucide-react";
import {
  EVTYPE_LABEL,
  REL_LABEL,
  TIER_LABEL,
  fetchEvidence,
  sourceName,
  type AtlasEdge,
  type AtlasNode,
} from "@/lib/atlas";
import { TierDot, EvBadge } from "./Legend";

export function EdgeDetail({
  edge,
  nodes,
  onOpenNode,
}: {
  edge: AtlasEdge;
  nodes: Map<string, AtlasNode>;
  onOpenNode: (id: string) => void;
}) {
  const ids = [...new Set([...(edge.evidence_ids ?? []), ...(edge.contradicts ?? [])])];
  const { data: ev = [], isLoading } = useQuery({
    queryKey: ["evidence", edge.id],
    queryFn: () => fetchEvidence(ids),
  });
  const src = nodes.get(edge.source_id);
  const tgt = nodes.get(edge.target_id);
  const contraSet = new Set(edge.contradicts ?? []);
  const supporting = ev.filter((e) => !contraSet.has(e.id) && e.polarity !== "contradicts");
  const against = ev.filter((e) => contraSet.has(e.id) || e.polarity === "contradicts");

  return (
    <div className="space-y-5">
      <p className="text-lg leading-snug font-serif">
        <button className="underline decoration-border underline-offset-4 hover:decoration-primary" onClick={() => onOpenNode(edge.source_id)}>
          {src?.label ?? edge.source_id}
        </button>{" "}
        <span className="text-muted-foreground">{REL_LABEL[edge.type] ?? edge.type.replace(/_/g, " ")}</span>{" "}
        <button className="underline decoration-border underline-offset-4 hover:decoration-primary" onClick={() => onOpenNode(edge.target_id)}>
          {tgt?.label ?? edge.target_id}
        </button>
      </p>
      {edge.evidence_type === "inferred" && (
        <p className="rounded-md bg-muted p-3 text-sm">
          This link is a hypothesis worked out by the tool. It has not been shown in a study.
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Source</dt>
        <dd>{sourceName(edge.source)}</dd>
        <dt className="text-muted-foreground">Relationship</dt>
        <dd>{REL_LABEL[edge.type] ?? edge.type} <span className="text-muted-foreground">({edge.type})</span></dd>
        <dt className="text-muted-foreground">Confidence</dt>
        <dd className="flex items-center gap-2"><TierDot tier={edge.tier} />{TIER_LABEL[edge.tier ?? "low"]}{edge.confidence != null && <span className="text-muted-foreground">· {Math.round(edge.confidence * 100)}%</span>}</dd>
        <dt className="text-muted-foreground">Evidence</dt>
        <dd className="flex items-center gap-2"><EvBadge ev={edge.evidence_type} />{EVTYPE_LABEL[edge.evidence_type ?? "observed"]}</dd>
        <dt className="text-muted-foreground">Retrieved</dt>
        <dd>{edge.retrieved_at ?? "Unknown"}</dd>
      </dl>

      {isLoading && <p className="text-sm text-muted-foreground">Loading sources…</p>}
      {supporting.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground font-sans">What the source says</h4>
          {supporting.map((e) => (
            <blockquote key={e.id} className="border-l-2 border-primary pl-3 text-sm">
              {e.quote ? <p>“{e.quote}”</p> : <p className="text-muted-foreground">No quoted sentence (taken from a database record).</p>}
              <SourceLink url={e.url} source={e.source} date={e.retrieved_at} />
            </blockquote>
          ))}
        </section>
      )}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground font-sans">Evidence against</h4>
        {against.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contradicting evidence was found in the sources searched.</p>
        ) : (
          against.map((e) => (
            <blockquote key={e.id} className="border-l-2 border-contradict pl-3 text-sm">
              <p className="mb-1 flex items-center gap-1 text-contradict"><AlertTriangle className="h-3.5 w-3.5" /> Contradicts this link</p>
              {e.quote && <p>“{e.quote}”</p>}
              <SourceLink url={e.url} source={e.source} date={e.retrieved_at} />
            </blockquote>
          ))
        )}
      </section>
      {!isLoading && ev.length === 0 && (
        <p className="text-sm text-muted-foreground">This link comes from a structured database record with no quoted text.</p>
      )}
    </div>
  );
}

function SourceLink({ url, source, date }: { url: string | null; source: string | null; date: string | null }) {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          {sourceName(source)} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        sourceName(source)
      )}
      {date && <> · retrieved {date}</>}
    </p>
  );
}
