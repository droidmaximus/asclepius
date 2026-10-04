## Asclepius
- Pages use static reading surfaces without decorative background scenes or motion controls, keeping research content unobstructed.
- The logo lives in src/assets/asclepius-logo.jpeg and the favicon in public/favicon.png; keep them in sync.
- App is read-only against Supabase tables nodes/edges/evidence/meta via the browser client; never add tables or writes — data comes from an external pipeline.
- Data-driven routes (/explore, /next-step) use ssr:false because Cytoscape and on-demand queries are browser-only.
- Graph colours come from CSS tokens resolved to rgb at runtime (Cytoscape cannot parse oklch); keep colours in src/styles.css.
- Graph never exceeds 60 nodes (MAX_NODES); expansions add at most 12 links per click.
- Start maps with at most 12 nodes balanced across relation types, then reveal more on demand; label-aware force layout prevents unreadable initial hubs.
- Frame maps at a readable scale (at least 1×), compact the initial layout then resolve actual label-bounding-box collisions, and preserve the user's viewport on expansion and resize so labels do not shrink automatically.
- AI drafting/explaining runs in TanStack server functions (src/lib/ai.functions.ts), not Supabase Edge Functions; output is rejected (fallback to the step's `why`) unless every cited edge id belongs to the step.

- Atlas presentation uses a two-column context rail and map/content surface; preserve source-backed content and existing read-only flows when changing layout.
- Evidence displays share source citation helpers and quote rendering; load both edge-linked and explicitly referenced evidence, preserve stored wording, and distinguish summaries and connected records from quotations so missing evidence is never implied to exist.
