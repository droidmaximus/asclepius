import { supabase } from "@/integrations/supabase/client";

export type Tier = "high" | "medium" | "low";
export type EvidenceType = "observed" | "extracted" | "inferred";

export interface AtlasNode {
  id: string;
  type: string;
  label: string;
  synonyms: string[] | null;
  props: Record<string, unknown> | null;
}
export interface AtlasEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  source: string | null;
  retrieved_at: string | null;
  confidence: number | null;
  tier: Tier | null;
  evidence_type: EvidenceType | null;
  contradicts: string[] | null;
  evidence_ids: string[] | null;
  props: Record<string, unknown> | null;
}
export interface Evidence {
  id: string;
  edge_id: string | null;
  source: string | null;
  url: string | null;
  quote: string | null;
  polarity: string | null;
  retrieved_at: string | null;
}

export interface Step {
  id: string;
  kind: string;
  title: string;
  why?: string;
  asset_id?: string;
  asset_kind?: string;
  relation?: string;
  confidence?: number;
  differences?: string[];
  edge_ids?: string[];
  review_questions?: string[];
  explanation?: { text?: string; fallback?: boolean };
}
export interface Actions {
  anchor: string;
  family: string[];
  gaps: unknown[];
  steps: Step[];
  next_question?: string;
  neighbors?: Record<string, number>;
  coverage?: {
    papers?: number;
    studies?: number;
    patient_groups?: number;
    verified_patient_groups?: number;
    sources_searched?: string[];
  };
}
export interface SharedResearcher {
  name: string;
  researcher_id: string;
  diseases: string[];
  edge_ids: string[];
  ambiguous: boolean;
}
export interface Meta {
  anchor?: string;
  retrieved_at?: string;
  trials_scanned?: number;
  claims_kept?: number;
  claims_dropped?: number;
  actions?: Actions;
  shared_researchers?: SharedResearcher[];
  [k: string]: unknown;
}

// Generated types may not include these tables; use a loose client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchMeta(): Promise<Meta> {
  const { data, error } = await db.from("meta").select("key,value");
  if (error) throw error;
  const out: Meta = {};
  for (const row of data as { key: string; value: unknown }[]) out[row.key] = row.value;
  return out;
}

export const SEARCH_TYPES = ["Disease", "Gene", "Phenotype", "Mechanism", "PatientGroup"];

let searchable: Promise<AtlasNode[]> | null = null;
function loadSearchable() {
  searchable ??= (async () => {
    const { data, error } = await db.from("nodes").select("id,type,label,synonyms").in("type", SEARCH_TYPES).limit(5000);
    if (error) { searchable = null; throw error; }
    return data as AtlasNode[];
  })();
  return searchable;
}

export interface SearchHit { node: AtlasNode; matchedSynonym: string | null; exact: boolean }

export async function searchNodes(q: string): Promise<SearchHit[]> {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const all = await loadSearchable();
  const hits: SearchHit[] = [];
  for (const n of all) {
    const l = n.label.toLowerCase();
    if (l === t) { hits.push({ node: n, matchedSynonym: null, exact: true }); continue; }
    const syn = n.synonyms ?? [];
    const se = syn.find((s) => s.toLowerCase() === t);
    if (se) { hits.push({ node: n, matchedSynonym: se, exact: true }); continue; }
    if (l.includes(t)) { hits.push({ node: n, matchedSynonym: null, exact: false }); continue; }
    const sp = syn.find((s) => s.toLowerCase().includes(t));
    if (sp) hits.push({ node: n, matchedSynonym: sp, exact: false });
  }
  const rank = (h: SearchHit) => (h.exact ? 0 : 10) + SEARCH_TYPES.indexOf(h.node.type);
  return hits.sort((a, b) => rank(a) - rank(b) || a.node.label.length - b.node.label.length).slice(0, 10);
}

export async function fetchNodes(ids: string[]): Promise<AtlasNode[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from("nodes").select("id,type,label,synonyms,props").in("id", ids);
  if (error) throw error;
  return data as AtlasNode[];
}

export const MAX_NODES = 60;
const tierRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function fetchNeighborhood(id: string) {
  const [center] = await fetchNodes([id]);
  if (!center) return null;
  const [a, b] = await Promise.all([
    db.from("edges").select("*").eq("source_id", id).limit(500),
    db.from("edges").select("*").eq("target_id", id).limit(500),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  const all = [...(a.data as AtlasEdge[]), ...(b.data as AtlasEdge[])];
  // Group by edge type to keep variety, then strongest first.
  all.sort((x, y) => (tierRank[x.tier ?? "low"] - tierRank[y.tier ?? "low"]) || ((y.confidence ?? 0) - (x.confidence ?? 0)));
  const byType = new Map<string, AtlasEdge[]>();
  for (const e of all) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }
  const picked: AtlasEdge[] = [];
  const neighborIds = new Set<string>();
  let added = true;
  while (neighborIds.size < MAX_NODES - 1 && added) {
    added = false;
    for (const list of byType.values()) {
      const e = list.shift();
      if (!e) continue;
      added = true;
      const other = e.source_id === id ? e.target_id : e.source_id;
      if (!neighborIds.has(other) && neighborIds.size >= MAX_NODES - 1) continue;
      neighborIds.add(other);
      picked.push(e);
    }
  }
  const nodes = await fetchNodes([...neighborIds]);
  const known = new Set(nodes.map((n) => n.id));
  return {
    center,
    nodes: [center, ...nodes],
    edges: picked.filter((e) => known.has(e.source_id === id ? e.target_id : e.source_id)),
    totalEdges: all.length,
  };
}

export async function fetchEdgesByIds(ids: string[]): Promise<AtlasEdge[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from("edges").select("*").in("id", ids);
  if (error) throw error;
  return data as AtlasEdge[];
}

export async function fetchEvidence(ids: string[]): Promise<Evidence[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from("evidence").select("*").in("id", ids);
  if (error) throw error;
  return data as Evidence[];
}

/* ---------- plain-language helpers ---------- */

export const TYPE_LABEL: Record<string, string> = {
  Disease: "Disease",
  Gene: "Gene",
  Phenotype: "Symptom",
  PatientGroup: "Patient group",
  Mechanism: "How the body works",
  Study: "Study",
  Asset: "Reusable research resource",
  Researcher: "Researcher",
  Paper: "Published paper",
};

export const REL_LABEL: Record<string, string> = {
  about: "is about",
  associated_with: "is linked to",
  authored: "wrote",
  biomarker_for: "may be a measurable sign of",
  causes: "causes",
  has_phenotype: "can show the symptom",
  leads: "leads",
  participates_in: "takes part in",
  relevant_to: "may be relevant to",
  reusable_for: "could be reused for",
  serves: "supports families with",
  studies: "studies",
  subtype_of: "is a form of",
  treats: "is being tested for",
};

export const TIER_LABEL: Record<string, string> = {
  high: "Strong support",
  medium: "Some support",
  low: "Weak support",
};
export const EVTYPE_LABEL: Record<string, string> = {
  observed: "Taken directly from a database",
  extracted: "Read from a published sentence",
  inferred: "Worked out by the tool (not proven)",
};
export const SOURCE_LABEL: Record<string, string> = {
  pubmed: "PubMed",
  monarch: "Monarch / MONDO / HPO",
  clinicaltrials: "ClinicalTrials.gov",
  "clinicaltrials.gov": "ClinicalTrials.gov",
  nih_reporter: "NIH RePORTER",
  reporter: "NIH RePORTER",
};
export const sourceName = (s?: string | null) => (s ? SOURCE_LABEL[s] ?? s : "Unknown source");

export const ASSET_KIND_LABEL: Record<string, string> = {
  registry: "Patient registry",
  natural_history: "Study that follows families over time",
  long_term_follow_up: "Long-term follow-up study",
  biorepository: "Sample bank",
  nih_project: "Funded research project",
  interventional: "Study testing a treatment",
  observational: "Observational study",
};

export function nodeUrl(n: AtlasNode): string | null {
  const p = n.props ?? {};
  const u = (p["url"] ?? p["website"] ?? p["source_url"]) as string | undefined;
  return u ?? null;
}
