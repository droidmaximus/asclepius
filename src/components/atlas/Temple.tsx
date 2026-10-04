import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { OPHIUCHUS, fieldStars, headAngle, nearestStars, serpentSegments, voluteSpiral, type Point } from "@/lib/temple-geometry";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A running Greek key (meander) band. */
export function MeanderBand({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden className={cn("block h-3 w-full text-gold", className)}>
      <defs>
        <pattern id={`meander-${id}`} width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 11 H24 M0 1 H24 M2 11 V3 H14 V9 H8 V6" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#meander-${id})`} />
    </svg>
  );
}

export function IonicColumn({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const flutes = Array.from({ length: 9 }, (_, i) => 46 + i * 8.5);
  const eggs = Array.from({ length: 7 }, (_, i) => 35 + i * 15);
  return (
    <svg aria-hidden viewBox="0 0 160 640" className={className} fill="none" stroke="var(--column-line)" strokeWidth="1.4">
      <defs>
        <linearGradient id={`marble-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--marble-shadow)" />
          <stop offset="0.35" stopColor="var(--marble-light)" />
          <stop offset="0.7" stopColor="var(--marble-mid)" />
          <stop offset="1" stopColor="var(--marble-shadow)" />
        </linearGradient>
      </defs>
      <rect x="8" y="2" width="144" height="10" rx="1.5" fill={`url(#marble-${id})`} />
      <path d="M10 14 Q80 26 150 14 L150 30 Q80 42 10 30 Z" fill={`url(#marble-${id})`} />
      {eggs.map((x) => <ellipse key={x} cx={x + 2} cy="27" rx="5" ry="6" />)}
      <circle cx="24" cy="44" r="21" fill={`url(#marble-${id})`} />
      <circle cx="136" cy="44" r="21" fill={`url(#marble-${id})`} />
      <path d={voluteSpiral(24, 44, 20, -1)} />
      <path d={voluteSpiral(136, 44, 20, 1)} />
      <rect x="34" y="60" width="92" height="7" fill={`url(#marble-${id})`} />
      <path d="M37 67 H123 L128 590 H32 Z" fill={`url(#marble-${id})`} />
      {flutes.map((x) => <path key={x} d={`M${x} 72 Q${x + (x - 80) * 0.03} 330 ${x + (x - 80) * 0.06} 584`} strokeOpacity="0.55" />)}
      <rect x="26" y="590" width="108" height="10" rx="5" fill={`url(#marble-${id})`} />
      <rect x="31" y="600" width="98" height="7" fill={`url(#marble-${id})`} />
      <rect x="22" y="607" width="116" height="12" rx="6" fill={`url(#marble-${id})`} />
      <rect x="14" y="619" width="132" height="19" fill={`url(#marble-${id})`} />
    </svg>
  );
}

/** The rod of Asclepius: a single serpent coiled around a staff. The serpent sways and watches the pointer. */
export function AsclepiusRod({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const backRef = useRef<SVGGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const shineRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const initial = useMemo(() => serpentPaths(0, 1), []);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    let pointer: Point | null = null;
    const onMove = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("pointermove", onMove, { passive: true });
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;
      const reveal = reduce ? 1 : Math.min(1, elapsed / 1.6);
      const phase = reduce ? 0 : 0.45 * Math.sin(elapsed * 0.9);
      const p = serpentPaths(phase, easeOut(reveal));
      setPaths(backRef.current, p.back);
      setPaths(frontRef.current, p.front);
      setPaths(shineRef.current, p.front);
      const head = headRef.current;
      const svg = svgRef.current;
      if (head && svg) {
        const box = svg.getBoundingClientRect();
        const scale = box.width / 120;
        const local = { x: p.head.x, y: p.head.y };
        const screen = { x: box.left + local.x * scale, y: box.top + local.y * scale };
        const flip = pointer ? pointer.x < screen.x : false;
        const target = pointer ? { x: screen.x + Math.abs(pointer.x - screen.x), y: pointer.y } : null;
        const angle = headAngle(screen, target, 35);
        head.setAttribute("transform", `translate(${local.x} ${local.y}) scale(${flip ? -HEAD_SCALE : HEAD_SCALE} ${HEAD_SCALE}) rotate(${angle})`);
        head.style.opacity = String(reveal >= 1 ? 1 : 0);
      }
      if (!reduce || reveal < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onMoveReduced = () => { if (reduce) raf = requestAnimationFrame(frame); };
    window.addEventListener("pointermove", onMoveReduced, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", onMoveReduced);
    };
  }, []);

  return (
    <svg ref={svgRef} aria-hidden viewBox="0 0 120 320" className={className} strokeLinecap="round">
      <defs>
        <linearGradient id="rod-wood" x1="0" x2="1">
          <stop offset="0" stopColor="oklch(0.42 0.06 60)" />
          <stop offset="0.45" stopColor="oklch(0.7 0.1 78)" />
          <stop offset="1" stopColor="oklch(0.38 0.05 60)" />
        </linearGradient>
        <radialGradient id="rod-halo">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="150" rx="58" ry="150" fill="url(#rod-halo)" />
      <g ref={backRef} stroke="var(--serpent-back)" fill="none">
        {initial.back.map((d, i) => <path key={i} d={d.d} strokeWidth={d.width} />)}
      </g>
      <rect x="56" y="34" width="8" height="280" rx="4" fill="url(#rod-wood)" />
      <ellipse cx="60" cy="32" rx="8" ry="6" fill="url(#rod-wood)" />
      <rect x="54.5" y="300" width="11" height="4" rx="1.5" fill="var(--gold)" />
      <g ref={frontRef} stroke="var(--serpent)" fill="none">
        {initial.front.map((d, i) => <path key={i} d={d.d} strokeWidth={d.width} />)}
      </g>
      <g ref={shineRef} stroke="var(--serpent-shine)" fill="none" strokeOpacity="0.7">
        {initial.front.map((d, i) => <path key={i} d={d.d} strokeWidth={d.width * 0.3} />)}
      </g>
      <g ref={headRef} transform={`translate(${initial.head.x} ${initial.head.y}) scale(${HEAD_SCALE})`}>
        <path d="M-2 -4 C6 -8 15 -5 17 0 C15 5 6 7 -2 4 Z" fill="var(--serpent)" />
        <circle cx="9" cy="-2" r="1.3" fill="var(--gold)" />
        <path className="serpent-tongue" d="M17 0 H23 M23 0 L26 -2 M23 0 L26 2" stroke="oklch(0.55 0.18 25)" strokeWidth="0.9" fill="none" />
      </g>
    </svg>
  );
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const HEAD_SCALE = 1.45;
const WIDTH_BUCKETS = 5;

function serpentPaths(phase: number, reveal: number) {
  const segs = serpentSegments(phase);
  const firstShown = Math.floor(segs.length * (1 - reveal));
  const bucket = (side: boolean) =>
    Array.from({ length: WIDTH_BUCKETS }, (_, b) => {
      const lo = Math.floor((b * segs.length) / WIDTH_BUCKETS);
      const hi = Math.floor(((b + 1) * segs.length) / WIDTH_BUCKETS);
      const part = segs.slice(Math.max(lo, firstShown), hi).filter((s) => s.front === side);
      const width = segs[lo]!.width;
      return { width, d: part.map((s) => `M${s.x1.toFixed(1)} ${s.y1.toFixed(1)}L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`).join("") || "M0 0" };
    });
  const h = segs[0]!;
  return { back: bucket(false), front: bucket(true), head: { x: h.x1, y: h.y1 - 2 } };
}

function setPaths(group: SVGGElement | null, paths: { d: string }[]) {
  if (!group) return;
  paths.forEach((p, i) => group.children[i]?.setAttribute("d", p.d));
}

/** Two Ionic columns under an entablature, framing the home page hero. */
export function Portico({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div aria-hidden className="parallax-far pointer-events-none absolute inset-x-0 -top-6 hidden md:block">
        <svg viewBox="0 0 1000 70" className="w-full" fill="none" stroke="var(--column-line)" strokeWidth="1.2">
          <path d="M40 58 L500 6 L960 58 Z" fill="var(--marble-light)" fillOpacity="0.55" />
          <path d="M120 52 L500 14 L880 52" strokeOpacity="0.5" />
          <circle cx="500" cy="38" r="9" strokeOpacity="0.7" />
          <path d="M494 38 h12 M500 32 v12" strokeOpacity="0.7" />
        </svg>
        <div className="mx-[4%] border-y border-[var(--column-line)] bg-[var(--marble-light)]/60 py-1">
          <MeanderBand className="opacity-70" />
        </div>
      </div>
      <IonicColumn className="parallax-near pointer-events-none absolute -left-4 top-16 hidden h-[460px] w-[115px] md:block lg:-left-10" />
      <IonicColumn className="parallax-near pointer-events-none absolute -right-4 top-16 hidden h-[460px] w-[115px] md:block lg:-right-10" />
      <div className="relative md:px-28 md:pt-20">{children}</div>
    </div>
  );
}

/**
 * The page backdrop: warm marble, the Ophiuchus constellation (Asclepius among the stars) and a lamp that follows
 * the pointer, uncovering a Greek-key mosaic and linking the nearest stars to it, like a node joining the atlas.
 */
export function TempleBackdrop({ variant = "quiet" }: { variant?: "hero" | "quiet" }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(SVGCircleElement | null)[]>([]);
  const linkRefs = useRef<(SVGLineElement | null)[]>([]);
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const field = useMemo(() => fieldStars(variant === "hero" ? 70 : 40), [variant]);
  const box = variant === "hero" ? { x: 0.06, y: 0.14, w: 0.88, h: 0.78 } : { x: 0.55, y: 0.1, w: 0.42, h: 0.6 };
  const stars = OPHIUCHUS.stars.map((s) => ({
    x: (box.x + s.x * box.w) * size.w,
    y: (box.y + s.y * box.h) * size.h,
    mag: s.mag,
  }));
  const starsRef = useRef(stars);
  starsRef.current = stars;

  useEffect(() => {
    const resize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = prefersReducedMotion();
    let raf = 0;
    let pointer: Point | null = null;
    const paint = () => {
      raf = 0;
      if (!pointer) return;
      root.style.setProperty("--mx", `${pointer.x}px`);
      root.style.setProperty("--my", `${pointer.y}px`);
      if (!reduce) {
        document.documentElement.style.setProperty("--px", ((pointer.x / window.innerWidth) * 2 - 1).toFixed(3));
        document.documentElement.style.setProperty("--py", ((pointer.y / window.innerHeight) * 2 - 1).toFixed(3));
      }
      const list = starsRef.current;
      list.forEach((s, i) => {
        const el = starRefs.current[i];
        if (!el) return;
        const glow = Math.max(0, 1 - Math.hypot(s.x - pointer!.x, s.y - pointer!.y) / 240);
        el.setAttribute("r", (1.6 + s.mag * 1.6 + glow * 3).toFixed(2));
        el.style.opacity = (0.55 + glow * 0.45).toFixed(2);
      });
      const near = nearestStars(pointer, list, 260, 2);
      linkRefs.current.forEach((line, k) => {
        if (!line) return;
        const s = near[k] !== undefined ? list[near[k]] : null;
        line.style.opacity = s ? "1" : "0";
        if (s) {
          line.setAttribute("x1", String(pointer!.x));
          line.setAttribute("y1", String(pointer!.y));
          line.setAttribute("x2", String(s.x));
          line.setAttribute("y2", String(s.y));
        }
      });
    };
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);

  const hero = variant === "hero";
  return (
    <div ref={rootRef} aria-hidden className={cn("temple-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden", hero ? "is-hero" : "is-quiet")}>
      <div className="temple-marble absolute inset-0" />
      <div className="temple-mosaic absolute inset-0" />
      <div className="temple-lamp absolute inset-0" />
      <svg className="parallax-far absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none">
        {field.map((s, i) => (
          <circle key={i} className="temple-twinkle" style={{ animationDelay: `${s.delay}s` }} cx={s.x * size.w} cy={s.y * size.h} r={s.r} fill="var(--star)" />
        ))}
        <g stroke="var(--constellation)" strokeWidth="1" strokeDasharray="2 5">
          {OPHIUCHUS.lines.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={stars[a]!.x} y1={stars[a]!.y} x2={stars[b]!.x} y2={stars[b]!.y} />
          ))}
        </g>
        <g stroke="var(--gold)" strokeWidth="1.2">
          {[0, 1].map((k) => (
            <line key={k} ref={(el) => { linkRefs.current[k] = el; }} className="transition-opacity duration-300" style={{ opacity: 0 }} />
          ))}
        </g>
        {stars.map((s, i) => (
          <circle key={i} ref={(el) => { starRefs.current[i] = el; }} cx={s.x} cy={s.y} r={1.6 + s.mag * 1.6} fill="var(--star-bright)" style={{ opacity: 0.55 }} />
        ))}
      </svg>
      {!hero && (
        <>
          <IonicColumn className="parallax-near absolute -left-6 bottom-0 hidden h-[78vh] w-[19.5vh] opacity-25 2xl:block" />
          <IonicColumn className="parallax-near absolute -right-6 bottom-0 hidden h-[78vh] w-[19.5vh] opacity-25 2xl:block" />
        </>
      )}
    </div>
  );
}