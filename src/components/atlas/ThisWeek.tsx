import { useState } from "react";
import { ChevronDown, Users, FlaskConical, Info } from "lucide-react";
import { ASSET_KIND_LABEL, type Meta } from "@/lib/atlas";

export function ThisWeek({
  meta,
  anchorLabel,
  onOpenNode,
  onOpenEdge,
}: {
  meta: Meta;
  anchorLabel: string;
  onOpenNode: (id: string) => void;
  onOpenEdge: (id: string) => void;
}) {
  const a = meta.actions;
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!a) return null;
  const steps = a.steps ?? [];
  const groups = steps.filter((s) => s.kind === "join_forces");
  const reuse = steps.filter((s) => s.kind === "reuse_asset");
  const top = reuse[0];
  const visibleReuse = showAll ? reuse : reuse.slice(0, 3);
  const researchers = (meta.shared_researchers ?? []).filter((r) => !r.ambiguous).slice(0, 4);
  const cov = a.coverage;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">This week</p>
        <h2 className="mt-1 text-2xl leading-tight">{top ? top.title : "No supported next step found yet"}</h2>
        {top?.explanation?.text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{top.explanation.text}</p>}
        {a.next_question && (
          <p className="mt-3 rounded-md bg-accent p-3 text-sm text-accent-foreground">
            <span className="font-medium">Question to ask: </span>{a.next_question}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base"><FlaskConical className="h-4 w-4 text-primary" /> Research you could reuse</h3>
        {reuse.length === 0 && <Gap />}
        <ul className="divide-y rounded-md border">
          {visibleReuse.map((s) => {
            const open = openId === s.id;
            return (
              <li key={s.id}>
                <button onClick={() => setOpenId(open ? null : s.id)} className="flex w-full items-start justify-between gap-2 p-3 text-left">
                  <span>
                    <span className="block text-sm">{s.title.replace(/^Ask .*? about reusing /, "")}</span>
                    <span className="text-xs text-muted-foreground">
                      {ASSET_KIND_LABEL[s.asset_kind ?? ""] ?? s.asset_kind} · {s.relation === "direct" ? "registered for your disease family" : "for a related disease"}
                    </span>
                  </span>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="space-y-3 px-3 pb-3 text-sm">
                    <p>{s.title}.</p>
                    {s.explanation?.text && <p className="text-muted-foreground">{s.explanation.text}</p>}
                    {s.differences && s.differences.length > 0 && (
                      <p className="flex gap-2 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />{s.differences.join(" ")}</p>
                    )}
                    {s.review_questions && (
                      <ul className="list-disc pl-5">{s.review_questions.map((q) => <li key={q}>{q}</li>)}</ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {s.asset_id && <button onClick={() => onOpenNode(s.asset_id!)} className="text-xs text-primary hover:underline">Show on map</button>}
                      {(s.edge_ids ?? []).map((e) => (
                        <button key={e} onClick={() => onOpenEdge(e)} className="text-xs text-primary hover:underline">See source</button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {reuse.length > 3 && (
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-primary hover:underline">
            {showAll ? "Show fewer" : `Show all ${reuse.length}`}
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Groups and people to connect with</h3>
        {groups.length === 0 && researchers.length === 0 && <Gap />}
        <ul className="space-y-2 text-sm">
          {groups.map((g) => (
            <li key={g.id} className="rounded-md border p-3">
              <p>{g.title}</p>
              <p className="text-xs text-muted-foreground">{g.why}</p>
              {g.review_questions?.[0] && <p className="mt-1 text-xs">Ask: {g.review_questions[0]}</p>}
              {(g.edge_ids ?? []).slice(0, 1).map((e) => (
                <button key={e} onClick={() => onOpenEdge(e)} className="mt-1 text-xs text-primary hover:underline">See source</button>
              ))}
            </li>
          ))}
          {researchers.map((r) => (
            <li key={r.researcher_id} className="rounded-md border p-3">
              <button onClick={() => onOpenNode(r.researcher_id)} className="hover:underline">{titleCase(r.name)}</button>
              <p className="text-xs text-muted-foreground">Researcher funded to work on {r.diseases.length} related diseases</p>
            </li>
          ))}
        </ul>
      </section>

      {cov && (
        <section className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">How we searched for {anchorLabel}</p>
          <p>Sources: {cov.sources_searched?.join(", ")}.</p>
          <p>
            Found {cov.papers ?? 0} papers, {cov.studies ?? 0} studies and {cov.verified_patient_groups ?? 0} confirmed patient group
            {cov.verified_patient_groups === 1 ? "" : "s"}. {meta.claims_kept ?? 0} claims kept, {meta.claims_dropped ?? 0} dropped as too weak.
            Data retrieved {meta.retrieved_at}.
          </p>
          <p>No result here means a treatment works. A new natural history study or registry listing your disease by name would make these suggestions stronger.</p>
        </section>
      )}
    </div>
  );
}

function Gap() {
  return (
    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
      We found no supported route here in the sources searched. A published case report, a registry entry or a patient group listing this disease would change this answer.
    </p>
  );
}

function titleCase(s: string) {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}
