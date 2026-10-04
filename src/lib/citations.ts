import type { AtlasEdge, AtlasNode, Evidence } from "./atlas";

export function safeSourceUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

export function sourceRecordId(url?: string | null): string | null {
  const safe = safeSourceUrl(url);
  if (!safe) return null;
  const parsed = new URL(safe);
  if (parsed.hostname === "pubmed.ncbi.nlm.nih.gov") {
    const id = parsed.pathname.match(/^\/(\d+)(?:\/|$)/)?.[1];
    return id ? `PMID:${id}` : null;
  }
  if (parsed.hostname === "clinicaltrials.gov" || parsed.hostname === "www.clinicaltrials.gov") {
    return parsed.pathname.match(/NCT\d+/)?.[0] ?? null;
  }
  return null;
}

export function citationDate(value?: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function recordSources(edge: AtlasEdge, nodes: Map<string, AtlasNode>) {
  return [edge.source_id, edge.target_id].flatMap((id) => {
    const node = nodes.get(id);
    if (!node) return [];
    const p = node.props ?? {};
    const raw = p.url ?? p.website ?? p.source_url;
    const url = safeSourceUrl(typeof raw === "string" ? raw : null);
    return url ? [{ node, url }] : [];
  });
}

export function isContradicting(evidence: Evidence, edge: AtlasEdge) {
  return evidence.polarity === "contradicts" || (edge.contradicts ?? []).includes(evidence.id);
}