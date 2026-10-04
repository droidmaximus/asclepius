import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BackgroundInput } from "./ResearchScene";

const ResearchScene = lazy(() => import("./ResearchScene"));

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}

// CSS resolves oklch tokens before Three receives its supported RGB values.
function tokenColor(token: string) {
  const el = document.createElement("span");
  el.style.color = `var(${token})`;
  document.body.appendChild(el);
  const color = getComputedStyle(el).color;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  el.remove();
  if (!context) return color;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const data = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
}

export function ResearchBackground() {
  const mode = useRouterState({ select: s => s.location.pathname });
  const [colors, setColors] = useState<{ ink: string; faint: string; paper: string }>();
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const input = useRef<BackgroundInput>({ x: 0, y: 0, scroll: 0, pulse: 0 });
  useEffect(() => {
    setColors({ ink: tokenColor("--research-ink"), faint: tokenColor("--research-faint"), paper: tokenColor("--background") });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    const scroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      input.current.scroll = available > 0 ? window.scrollY / available : 0;
    };
    const pointer = (event: PointerEvent) => {
      input.current.x = event.clientX / window.innerWidth * 2 - 1;
      input.current.y = 1 - event.clientY / window.innerHeight * 2;
    };
    const click = (event: MouseEvent) => {
      if ((event.target as Element).closest("button, a, input, [role=dialog]")) return;
      input.current.pulse += 1;
    };
    motion(); scroll(); visibility();
    media.addEventListener("change", motion);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("click", click);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => { input.current.scroll = 0; input.current.pulse = 0; }, [mode]);
  if (!colors) return null;
  return <>
    <div className={`research-background ${mode === "/" ? "is-search" : ""}`} aria-hidden="true" data-background-mode={mode} data-motion={paused || reduced ? "paused" : "active"}>
      <SceneBoundary><Suspense fallback={null}><ResearchScene mode={mode} colors={colors} input={input} paused={paused || reduced || hidden} /></Suspense></SceneBoundary>
    </div>
    {!reduced && <Button variant="outline" size="icon" className="research-motion-control" aria-label={paused ? "Resume background animation" : "Pause background animation"} title={paused ? "Resume background animation" : "Pause background animation"} onClick={() => setPaused(p => !p)}>
      {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
    </Button>}
  </>;
}