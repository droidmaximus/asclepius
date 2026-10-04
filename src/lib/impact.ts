export type Basis = "sourced" | "atlas" | "assumption";

export interface RouteStep {
  label: string;
  minWeeks: number;
  maxWeeks: number;
  basis: Basis;
  /** For sourced steps: the figure and where it comes from. For assumptions: what would confirm it. */
  detail: string;
  href?: string;
  edgeId?: string;
}

export interface Routes {
  usual: RouteStep[];
  asclepius: RouteStep[];
}

export const ANCHOR = "MONDO:0010099";
export const REGISTRY_EDGE = "NCT04624789|reusable_for|MONDO:0010099";

export const IMPACT = {
  milestone: "Maria's group starts collecting natural-history data for GM2 activator deficiency",
  context: {
    text: "GM2 activator deficiency is ultra-rare: fewer than 30 patients have ever been reported worldwide",
    href: "https://ntsad.org/diseases/gm2-activator-protein-deficiency/",
    source: "NTSAD",
  },
  routes: {
    usual: [
      {
        label: "Search by hand for anything reusable",
        minWeeks: 4,
        maxWeeks: 12,
        basis: "assumption",
        detail: "Trial registries, papers and group websites searched one by one. Confirm by asking patient-group leaders how long their search took.",
      },
      {
        label: "Write a protocol and secure funding",
        minWeeks: 12,
        maxWeeks: 26,
        basis: "assumption",
        detail: "A small group drafting its own registry protocol and grant. Confirm with groups that have built a registry, such as those listed in the NCATS Toolkit.",
        href: "https://toolkit.ncats.nih.gov/module/discovery/starting-a-patient-registry-natural-history-study-database/",
      },
      {
        label: "Ethics approval and site start-up",
        minWeeks: 22,
        maxWeeks: 31,
        basis: "sourced",
        detail: "After funding, the median time to activate a study was 157 days at a single site and 214 days across several sites (Cernik et al. 2021).",
        href: "https://pubmed.ncbi.nlm.nih.gov/34027224/",
      },
      {
        label: "Find and enrol the first families",
        minWeeks: 12,
        maxWeeks: 52,
        basis: "assumption",
        detail: "With fewer than 30 known patients worldwide, a new registry starts with no participants. Confirm against enrolment logs of other ultra-rare registries.",
      },
    ],
    asclepius: [
      {
        label: "Find the registry that already names her disease",
        minWeeks: 0,
        maxWeeks: 1,
        basis: "atlas",
        detail: "Registry Gangliosidoses (NCT04624789) lists Tay-Sachs disease AB variant, the ontology name for GM2 activator deficiency. Found in one search; up to a week to review it with an expert. The week to review it is our assumption.",
        edgeId: REGISTRY_EDGE,
      },
      {
        label: "Confirm with the sponsor that it is active and eligible",
        minWeeks: 2,
        maxWeeks: 6,
        basis: "assumption",
        detail: "Its registered status is UNKNOWN, so the first email asks whether it still enrols. Confirm by recording how long the sponsor takes to reply.",
      },
      {
        label: "Enrol families at a site that is already running",
        minWeeks: 2,
        maxWeeks: 8,
        basis: "assumption",
        detail: "No new protocol or ethics approval for the group itself: families consent into an existing study. Confirm with the registry's enrolment process.",
      },
    ],
  } satisfies Routes,
  validateNext: [
    "Registry Gangliosidoses still enrols: its status on ClinicalTrials.gov is UNKNOWN.",
    "It accepts GM2 activator deficiency genotypes and our families' age range.",
    "Its consent terms let the group see and reuse the data it contributes.",
    "Each assumption above, by recording the real number of weeks with the first family.",
  ],
};

export function routeWeeks(steps: RouteStep[]): { min: number; max: number } {
  return steps.reduce((t, s) => ({ min: t.min + s.minWeeks, max: t.max + s.maxWeeks }), { min: 0, max: 0 });
}

/** low: usual best case vs our worst case; high: usual worst case vs our best case; mid: midpoints. */
export function speedup(routes: Routes): { low: number; high: number; mid: number } {
  const u = routeWeeks(routes.usual);
  const a = routeWeeks(routes.asclepius);
  return { low: u.min / a.max, high: u.max / a.min, mid: (u.min + u.max) / (a.min + a.max) };
}
