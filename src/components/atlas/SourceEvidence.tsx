import { ExternalLink, AlertTriangle } from "lucide-react";
import { sourceName, type AtlasEdge, type AtlasNode, type Evidence } from "@/lib/atlas";
import { citationDate, isContradicting, recordSources, safeSourceUrl, sourceRecordId } from "@/lib/citations";

export function SourceQuote({ evidence: e, nodes, against = false }: { evidence: Evidence; nodes: Map<string, AtlasNode>; against?: boolean }) {
  const url = safeSourceUrl(e.url);
  const id = sourceRecordId(url);
  const paper = id ? nodes.get(id) : undefined;
  const year = paper?.props?.["year"];
  return (
    <figure className={`min-w-0 border-l-2 pl-4 ${against ? "border-contradict" : "border-primary"}`}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{e.quote ? "Quoted passage · as stored in the atlas" : "No quoted passage supplied"}</p>
      {e.quote ? <blockquote className="whitespace-pre-wrap break-words text-sm leading-relaxed">“{e.quote}”</blockquote> : <p className="text-sm text-muted-foreground">This evidence entry does not contain source wording.</p>}
      <figcaption className="mt-3 space-y-1 text-xs leading-relaxed">
        <p className={against ? "text-contradict" : "text-primary"}>{against ? "Evidence against this connection" : e.polarity === "supports" ? "Recorded as supporting this connection" : "Evidence direction not recorded"}</p>
        <p className="break-words font-medium">{paper?.label ?? `${sourceName(e.source)} — ${id ?? "source entry"}`}{typeof year === "number" || typeof year === "string" ? ` (${year})` : ""}</p>
        {id && paper && <p className="text-muted-foreground">{id}</p>}
        {url ? <a href={url} target="_blank" rel="noreferrer" className="flex items-start gap-1 break-all text-primary underline underline-offset-2"><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /><span>{url}</span></a> : <p className="text-muted-foreground">Original source link not supplied.</p>}
        <p className="text-muted-foreground">Retrieved: {citationDate(e.retrieved_at)}</p>
      </figcaption>
    </figure>
  );
}

export function SourceEvidence({ edge, evidence, nodes }: { edge: AtlasEdge; evidence: Evidence[]; nodes: Map<string, AtlasNode> }) {
  const supporting = evidence.filter((e) => !isContradicting(e, edge));
  const against = evidence.filter((e) => isContradicting(e, edge));
  const records = recordSources(edge, nodes);
  return (
    <div className="min-w-0 space-y-5">
      <section className="space-y-4">
        <h4 className="font-sans text-sm font-semibold">{edge.evidence_type === "inferred" ? "Source material behind this lead" : "Supporting evidence"}</h4>
        {edge.evidence_type === "inferred" && <p className="text-sm text-muted-foreground">These records inform a suggested connection. They do not establish that the resource can be reused for your disease.</p>}
        {supporting.length === 0 && <p className="text-sm text-muted-foreground">No supporting quotation is supplied for this connection. {edge.evidence_type === "inferred" ? "This is a scored suggestion, not a quoted finding." : "The atlas records a database connection, not a quoted finding."}</p>}
        {supporting.map((e) => <SourceQuote key={e.id} evidence={e} nodes={nodes} />)}
        {records.length > 0 && <div className="space-y-2 border-t pt-3">
          <h5 className="text-xs font-medium text-muted-foreground">Connected original records · not quotations</h5>
          {records.map(({ node, url }) => <div key={node.id} className="text-xs leading-relaxed"><p className="break-words font-medium">{node.label} · {node.id}</p><a href={url} target="_blank" rel="noreferrer" className="flex items-start gap-1 break-all text-primary underline"><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /><span>{url}</span></a></div>)}
        </div>}
        {!supporting.length && !records.length && <p className="text-xs text-muted-foreground">A record-level source link has not been supplied. This connection cannot be checked against an original record here.</p>}
      </section>
      <section className="space-y-4 border-t pt-4">
        <h4 className="flex items-center gap-2 font-sans text-sm font-semibold text-contradict"><AlertTriangle className="h-4 w-4" />Contradicting evidence</h4>
        {against.length ? against.map((e) => <SourceQuote key={e.id} evidence={e} nodes={nodes} against />) : <p className="text-xs text-muted-foreground">No contradicting passages are attached to this connection in the atlas. This does not mean none exist.</p>}
      </section>
    </div>
  );
}