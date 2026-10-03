import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { TYPE_LABEL, searchNodes } from "@/lib/atlas";

export function Search({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDeb(q), 200);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const { data = [], isFetching } = useQuery({
    queryKey: ["search", deb],
    queryFn: () => searchNodes(deb),
    enabled: deb.trim().length >= 2,
  });
  const pick = (id: string) => {
    onPick(id);
    setOpen(false);
    setQ("");
  };
  return (
    <div ref={box} className="relative w-full">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, data.length - 1));
          if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          if (e.key === "Enter" && data[active]) pick(data[active].id);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search a disease, gene, symptom, patient group or process…"
        aria-label="Search"
        className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
      />
      {open && deb.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-96 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {data.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">{isFetching ? "Searching…" : "Nothing found. Try another name or spelling."}</p>
          )}
          {data.map((n, i) => {
            const syn = (n.synonyms ?? []).find((s) => s.toLowerCase().includes(deb.toLowerCase()) && s !== n.label);
            return (
              <button
                key={n.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(n.id)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? "bg-accent" : ""}`}
              >
                <span>
                  {n.label}
                  {syn && <span className="ml-2 text-xs text-muted-foreground">also called “{syn}”</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{TYPE_LABEL[n.type] ?? n.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
