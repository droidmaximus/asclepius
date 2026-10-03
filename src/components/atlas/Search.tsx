import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { TYPE_LABEL, searchNodes } from "@/lib/atlas";

export const SEARCH_PLACEHOLDER = "Search a disease, gene, symptom, patient group or pathway";

export function Search({
  onPick,
  size = "md",
  value,
  autoFocus,
}: {
  onPick: (id: string) => void;
  size?: "md" | "lg";
  value?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [deb, setDeb] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (value !== undefined) { setQ(value); setDeb(value); setOpen(true); }
  }, [value]);
  useEffect(() => {
    const t = setTimeout(() => setDeb(q), 150);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const { data = [], isFetching, error } = useQuery({
    queryKey: ["search", deb.trim().toLowerCase()],
    queryFn: () => searchNodes(deb),
    enabled: deb.trim().length >= 2,
  });
  const pick = (id: string) => {
    onPick(id);
    setOpen(false);
    setQ("");
  };
  const lg = size === "lg";
  return (
    <div ref={box} className="relative w-full">
      <SearchIcon className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${lg ? "left-4 h-5 w-5" : "left-3 h-4 w-4"}`} />
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, data.length - 1));
          if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          if (e.key === "Enter" && data[active]) pick(data[active].node.id);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label="Search"
        className={`w-full rounded-md border border-input bg-background pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 ${lg ? "h-14 pl-12 text-base" : "h-11 pl-9 text-sm"}`}
      />
      {open && deb.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-96 w-full overflow-auto rounded-md border bg-popover text-left shadow-lg">
          {error ? (
            <p className="p-3 text-sm text-destructive">Search is not available right now. Please try again.</p>
          ) : isFetching && data.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          ) : data.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nothing matches yet. Try a gene name or the disease's other names.</p>
          ) : null}
          {!error && data.map(({ node: n, matchedSynonym }, i) => (
            <button
              key={n.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(n.id)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? "bg-accent" : ""}`}
            >
              <span>
                {n.label}
                {matchedSynonym && <span className="ml-2 text-xs text-muted-foreground">matched synonym: {matchedSynonym}</span>}
              </span>
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{TYPE_LABEL[n.type] ?? n.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
