## Asclepius
- Shared decorative research backgrounds are client-lazy React Three Fiber scenes mounted once in the root; CSS token colours, non-blocking input, pause/reduced-motion support and scroll transforms preserve all read-only research flows.
- Animated background transforms are owned by the frame loop after one-time initialisation; bounded inputs, decaying pulses and viewport-relative scale prevent jumps and off-screen drift.
- Background emblems use lightweight procedural symbolic geometry, not anatomical models, so the staff-and-serpent silhouette remains legible at low opacity.
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
