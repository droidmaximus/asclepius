import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Header, Footer } from "@/components/atlas/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ANCHOR, IMPACT, routeWeeks, speedup, type Basis, type RouteStep } from "@/lib/impact";

const TITLE = "The 10× case — Asclepius";
const DESC = "How finding an existing registry could shorten the first step toward treatment for GM2 activator deficiency, with every number sourced or labelled as an assumption.";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Impact,
});

const BASIS_LABEL: Record<Basis, string> = { sourced: "Published figure", atlas: "From the atlas", assumption: "Assumption" };
const BASIS_CLASS: Record<Basis, string> = {
  sourced: "bg-primary text-primary-foreground",
  atlas: "bg-accent text-accent-foreground",
  assumption: "border border-dashed border-muted-foreground/60 text-muted-foreground",
};
const SEGMENT_CLASS: Record<Basis, string> = {
  sourced: "bg-primary",
  atlas: "bg-accent-foreground/70",
  assumption: "bg-muted-foreground/30",
};

const times = (x: number) => `${x < 10 ? x.toFixed(1) : Math.round(x)}×`;
const weeks = (min: number, max: number) => (min === max ? `${max} wk` : `${min}–${max} wk`);
const mid = (s: RouteStep) => (s.minWeeks + s.maxWeeks) / 2;

function BasisBadge({ basis }: { basis: Basis }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", BASIS_CLASS[basis])}>{BASIS_LABEL[basis]}</span>;
}

function Timeline({ title, steps, scale }: { title: string; steps: RouteStep[]; scale: number }) {
  const total = routeWeeks(steps);
  return (
    <section className="rounded-md border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{weeks(total.min, total.max)} in total</p>
      </div>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${title}: ${weeks(total.min, total.max)}`}>
        {steps.map((s) => (
          <div key={s.label} className={cn("h-full border-r border-background last:border-r-0", SEGMENT_CLASS[s.basis])} style={{ width: `${(Math.max(mid(s), 0.4) / scale) * 100}%` }} />
        ))}
      </div>
      <ol className="mt-5 space-y-4">
        {steps.map((s, i) => (
          <li key={s.label} className="grid gap-1 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-3">
            <span className="text-sm text-muted-foreground">{i + 1}.</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{s.label}</p>
                <BasisBadge basis={s.basis} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
              {s.href && (
                <a href={s.href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
                  {s.basis === "sourced" ? "Source" : "Background"} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
              {s.edgeId && (
                <Link to="/explore" search={{ node: ANCHOR, edge: s.edgeId }} className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
                  See the evidence <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <span className="text-sm tabular-nums sm:text-right">{weeks(s.minWeeks, s.maxWeeks)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Impact() {
  const { routes } = IMPACT;
  const s = speedup(routes);
  const usual = routeWeeks(routes.usual);
  const scale = Math.max(...[routes.usual, routes.asclepius].map((r) => r.reduce((t, x) => t + mid(x), 0)));
  const markerAt = Math.min(Math.max((Math.log(10) - Math.log(s.low)) / (Math.log(s.high) - Math.log(s.low)), 0), 1);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 lg:px-9">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">The 10× case</p>
        <h1 className="mt-3 max-w-4xl text-3xl leading-snug md:text-4xl">{IMPACT.milestone}</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          {IMPACT.context.text} (
          <a href={IMPACT.context.href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">{IMPACT.context.source}</a>
          ). A group that starts its own registry waits {Math.round(usual.min / 4.3)}–{Math.round(usual.max / 4.3)} months before the first family is enrolled. Asclepius found an existing registry that already names the disease.
        </p>

        <section className="mt-8 rounded-md bg-accent p-5 text-accent-foreground" aria-label="Speed-up">
          <p className="text-sm">Estimated speed-up to the milestone</p>
          <p className="mt-1 font-serif text-4xl">{times(s.low)} to {times(s.high)}</p>
          <p className="mt-1 text-sm">About {times(s.mid)} at the middle of both ranges. Calculated from the weeks below, not chosen.</p>
          <div className="relative mt-5 h-2 rounded-full bg-background/70">
            <div className="absolute -top-1.5 h-5 w-0.5 bg-primary" style={{ left: `${markerAt * 100}%` }} />
            <span className="absolute top-4 -translate-x-1/2 text-xs font-medium" style={{ left: `${markerAt * 100}%` }}>10×</span>
          </div>
          <div className="mt-7 flex justify-between text-xs"><span>{times(s.low)} (their best case, our worst)</span><span>{times(s.high)} (their worst case, our best)</span></div>
        </section>

        <div className="mt-8 space-y-6">
          <Timeline title="Usual route: build a new registry" steps={routes.usual} scale={scale} />
          <Timeline title="Asclepius route: join the registry that exists" steps={routes.asclepius} scale={scale} />
        </div>

        <section className="mt-8 rounded-md border p-5">
          <h2 className="text-xl">What to validate next</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {IMPACT.validateNext.map((v) => <li key={v}>{v}</li>)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            This is an estimate for one milestone, not a promise of a treatment. Published figures come from studies at other centres; assumptions are ours and are labelled so you can check them.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/next-step">Your next step this week</Link></Button>
            <Button asChild variant="outline"><Link to="/explore" search={{ node: ANCHOR }}>Explore connections</Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
