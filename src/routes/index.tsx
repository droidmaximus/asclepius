import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "@/components/atlas/Search";
import { Header, Footer } from "@/components/atlas/Header";

const TITLE = "Asclepius — find studies, groups and next steps";
const DESC =
  "Search a rare disease, gene, symptom or patient group and see connected studies, reusable research and people, with a source for every claim.";

export const Route = createFileRoute("/")({
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
  component: Home,
});

const EXAMPLES = ["GM2 activator deficiency", "Krabbe disease", "HEXA"];

function Home() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<string | undefined>();
  const open = (id: string) => navigate({ to: "/explore", search: { node: id } });
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl md:text-5xl">Asclepius</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Find the studies, research and people connected to a rare disease, and a next step you can take this week.
          </p>
          <div className="mt-8">
            <Search size="lg" onPick={open} value={preset} autoFocus />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e) => (
              <Button variant="outline" size="sm"
                key={e}
                onClick={() => setPreset(e)}
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {e}
              </Button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
