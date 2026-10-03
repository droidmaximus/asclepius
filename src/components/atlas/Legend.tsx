import { cn } from "@/lib/utils";
import { TIER_LABEL, TYPE_LABEL, type EvidenceType, type Tier } from "@/lib/atlas";

export const TYPE_TOKEN: Record<string, string> = {
  Disease: "--type-disease",
  Gene: "--type-gene",
  Phenotype: "--type-phenotype",
  PatientGroup: "--type-group",
  Mechanism: "--type-mechanism",
  Study: "--type-study",
  Asset: "--type-asset",
  Researcher: "--type-person",
  Paper: "--type-paper",
};
const TYPE_BG: Record<string, string> = {
  Disease: "bg-type-disease",
  Gene: "bg-type-gene",
  Phenotype: "bg-type-phenotype",
  PatientGroup: "bg-type-group",
  Mechanism: "bg-type-mechanism",
  Study: "bg-type-study",
  Asset: "bg-type-asset",
  Researcher: "bg-type-person",
  Paper: "bg-type-paper",
};

export function TypeDot({ type }: { type: string }) {
  return <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", TYPE_BG[type] ?? "bg-muted-foreground")} />;
}

export function TierDot({ tier }: { tier: Tier | null | undefined }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        tier === "high" ? "bg-tier-high" : tier === "medium" ? "bg-tier-medium" : "bg-tier-low",
      )}
    />
  );
}

export function TierBadge({ tier }: { tier: Tier | null | undefined }) {
  const t = tier ?? "low";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        t === "high" ? "bg-tier-high text-primary-foreground" : t === "medium" ? "bg-tier-medium text-foreground" : "bg-tier-low text-foreground",
      )}
    >
      {TIER_LABEL[t]}
    </span>
  );
}

export function EvBadge({ ev }: { ev: EvidenceType | null | undefined }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block w-5 border-t-2 border-foreground/70",
        ev === "inferred" ? "border-dashed" : ev === "extracted" ? "border-dotted" : "border-solid",
      )}
    />
  );
}

export function Legend() {
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.keys(TYPE_TOKEN).map((t) => (
          <span key={t} className="flex items-center gap-1.5"><TypeDot type={t} /> {TYPE_LABEL[t]}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5"><TierDot tier="high" /> Strong link</span>
        <span className="flex items-center gap-1.5"><TierDot tier="medium" /> Some support</span>
        <span className="flex items-center gap-1.5"><TierDot tier="low" /> Weak</span>
        <span className="flex items-center gap-1.5"><EvBadge ev="observed" /> Observed</span>
        <span className="flex items-center gap-1.5"><EvBadge ev="extracted" /> Extracted</span>
        <span className="flex items-center gap-1.5"><EvBadge ev="inferred" /> Inferred</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-contradict" /> Has evidence against</span>
      </div>
    </div>
  );
}
