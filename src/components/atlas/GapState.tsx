import type { Actions } from "@/lib/atlas";

export function GapState({ actions, missing }: { actions?: Actions | undefined; missing?: string | undefined }) {
  const sources = actions?.coverage?.sources_searched ?? [];
  return (
    <div className="rounded-md border bg-muted/50 p-4 text-sm">
      <p className="font-serif text-lg">We did not find a supported route yet.</p>
      {sources.length > 0 && <p className="mt-2"><span className="text-muted-foreground">Sources searched: </span>{sources.join(", ")}.</p>}
      <p className="mt-1">
        <span className="text-muted-foreground">What is missing: </span>
        {missing ?? "No registry, follow-up study or patient group is linked to this disease in those sources."}
      </p>
      {actions?.next_question && (
        <p className="mt-1"><span className="text-muted-foreground">Next question to test: </span>{actions.next_question}</p>
      )}
    </div>
  );
}
