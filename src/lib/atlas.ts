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
export interface Pair {
  a: string; b: string; score: number; kind?: string;
  shared_genes: string[]; shared_terms: string[]; shared_mechanisms: string[]; subtype_pair: boolean;
}
export interface Analysis {
  pairs: Pair[];
  counterexamples: Pair[];
  term_labels: Record<string, string>;
  threshold?: number;
}
export interface Meta {
  analysis?: Analysis;
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
export const INITIAL_NODES = 12;
export const EXPAND_LIMIT = 12;
const tierRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
const strongestFirst = (x: AtlasEdge, y: AtlasEdge) =>
  ((tierRank[x.tier ?? "low"] ?? 2) - (tierRank[y.tier ?? "low"] ?? 2)) || ((y.confidence ?? 0) - (x.confidence ?? 0));

async function edgesOf(id: string): Promise<AtlasEdge[]> {
  const [a, b] = await Promise.all([
    db.from("edges").select("*").eq("source_id", id).limit(1000),
    db.from("edges").select("*").eq("target_id", id).limit(1000),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  return [...(a.data as AtlasEdge[]), ...(b.data as AtlasEdge[])];
}

export interface GraphData {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  level: Record<string, number>; // 0 centre, 1 family/direct, 2+ expanded
  hiddenWeak: number;
  hiddenOver: number;
}

/** Level 1: direct edges plus disease family (subtype_of upward). */
export async function fetchNeighborhood(id: string, showWeak: boolean): Promise<(GraphData & { center: AtlasNode; totalEdges: number }) | null> {
  const [center] = await fetchNodes([id]);
  if (!center) return null;
  const direct = await edgesOf(id);
  const level: Record<string, number> = { [id]: 0 };
  const picked: AtlasEdge[] = [];
  // family upward
  let frontier = [id];
  const seen = new Set([id]);
  for (let depth = 0; depth < 4 && frontier.length; depth++) {
    const { data, error } = await db.from("edges").select("*").eq("type", "subtype_of").in("source_id", frontier);
    if (error) throw error;
    frontier = [];
    for (const e of data as AtlasEdge[]) {
      if (!seen.has(e.target_id) && seen.size >= INITIAL_NODES) continue;
      if (!picked.some((p) => p.id === e.id)) picked.push(e);
      if (!seen.has(e.target_id)) { seen.add(e.target_id); frontier.push(e.target_id); level[e.target_id] = 1; }
    }
  }
  const visible = direct.filter((e) => showWeak || e.tier !== "low").sort(strongestFirst);
  // Balance relation types so symptoms/papers cannot consume the first view.
  // Confidence still orders the candidates within each relation type.
  const buckets = new Map<string, AtlasEdge[]>();
  for (const e of visible) buckets.set(e.type, [...(buckets.get(e.type) ?? []), e]);
  const balanced: AtlasEdge[] = [];
  while ([...buckets.values()].some((items) => items.length)) {
    for (const items of buckets.values()) {
      const next = items.shift();
      if (next) balanced.push(next);
    }
  }
  const hiddenWeak = showWeak ? 0 : direct.length - visible.length;
  let hiddenOver = 0;
  for (const e of balanced) {
    if (picked.some((p) => p.id === e.id)) continue;
    const other = e.source_id === id ? e.target_id : e.source_id;
    if (!(other in level) && Object.keys(level).length >= INITIAL_NODES) { hiddenOver++; continue; }
    level[other] ??= 1;
    picked.push(e);
  }
  const nodes = await fetchNodes(Object.keys(level));
  const known = new Set(nodes.map((n) => n.id));
  return {
    center,
    nodes,
    edges: picked.filter((e) => known.has(e.source_id) && known.has(e.target_id)),
    level,
    hiddenWeak,
    hiddenOver,
    totalEdges: direct.length,
  };
}

/** Add up to 12 strongest new neighbours of a node to an existing graph. */
export async function expandNode(g: GraphData, id: string, showWeak: boolean): Promise<GraphData & { added: number }> {
  const have = new Set(g.edges.map((e) => e.id));
  const cand = (await edgesOf(id)).filter((e) => !have.has(e.id) && (showWeak || e.tier !== "low")).sort(strongestFirst);
  const level = { ...g.level };
  const newEdges: AtlasEdge[] = [];
  const newIds: string[] = [];
  for (const e of cand) {
    if (newEdges.length >= EXPAND_LIMIT) break;
    const other = e.source_id === id ? e.target_id : e.source_id;
    if (!(other in level)) {
      if (Object.keys(level).length >= MAX_NODES) continue;
      level[other] = (level[id] ?? 1) + 1;
      newIds.push(other);
    }
    newEdges.push(e);
  }
  const nodes = await fetchNodes(newIds);
  const known = new Set([...g.nodes, ...nodes].map((n) => n.id));
  const validEdges = newEdges.filter((e) => known.has(e.source_id) && known.has(e.target_id));
  return { ...g, nodes: [...g.nodes, ...nodes], edges: [...g.edges, ...validEdges], level, hiddenOver: id === Object.keys(g.level).find((k) => g.level[k] === 0) ? cand.length - validEdges.length : g.hiddenOver, added: validEdges.length };
}

export async function fetchEdgesByIds(ids: string[]): Promise<AtlasEdge[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from("edges").select("*").in("id", ids);
  if (error) throw error;
  return data as AtlasEdge[];
}

export async function fetchEvidenceForEdge(edgeId: string, extraIds: string[]): Promise<Evidence[]> {
  const a = await db.from("evidence").select("*").eq("edge_id", edgeId);
  if (a.error) throw a.error;
  const rows = a.data as Evidence[];
  const missing = extraIds.filter((i) => !rows.some((r) => r.id === i));
  if (missing.length) rows.push(...(await fetchEvidence(missing)));
  return rows;
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

export const MECH_LABEL: Record<string, string> = {
  "mech:glycosphingolipid-catabolism": "Lysosomal glycosphingolipid catabolism",
  "mech:lysosomal-lipid-transport": "Lysosomal lipid transport",
  "mech:lysosome-organization": "Lysosome organization and function",
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
  shares_mechanism_with: "shares a body process with",
};

export const TIER_LABEL: Record<string, string> = {
  high: "Strong support",
  medium: "Some support",
  low: "Weak support",
};
export const EVTYPE_LABEL: Record<string, string> = {
  observed: "Observed: from a curated database",
  extracted: "Extracted: read from a paper by AI, with the quote",
  inferred: "Inferred: our own scoring, not proven",
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
