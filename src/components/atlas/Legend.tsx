import { cn } from "@/lib/utils";
import type { EvidenceType, Tier } from "@/lib/atlas";

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

export function EvBadge({ ev }: { ev: EvidenceType | null | undefined }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block w-5 border-t-2 border-foreground/70",
        ev === "extracted" ? "border-dashed" : ev === "inferred" ? "border-dotted" : "border-solid",
      )}
    />
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><TierDot tier="high" /> Strong</span>
      <span className="flex items-center gap-1.5"><TierDot tier="medium" /> Some</span>
      <span className="flex items-center gap-1.5"><TierDot tier="low" /> Weak</span>
      <span className="flex items-center gap-1.5"><EvBadge ev="observed" /> From a database</span>
      <span className="flex items-center gap-1.5"><EvBadge ev="extracted" /> From a paper sentence</span>
      <span className="flex items-center gap-1.5"><EvBadge ev="inferred" /> Worked out (unproven)</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-contradict" /> Has evidence against</span>
    </div>
  );
}
