import { Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import logo from "@/assets/asclepius-logo.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { EvBadge, TierBadge } from "./Legend";
import { MeanderBand } from "./Temple";

export function Header({ children }: { children?: React.ReactNode }) {
  const link = "whitespace-nowrap rounded px-2 py-1 max-sm:px-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <header className="relative z-20 bg-background/75 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-3 font-serif text-lg"><img src={logo} alt="" className="h-12 w-12 shrink-0 object-contain mix-blend-multiply" />Asclepius</Link>
        <nav className="flex max-w-full items-center gap-1 max-sm:gap-0 max-sm:overflow-x-auto max-sm:py-0.5 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
          <Link to="/" className={link} activeOptions={{ exact: true }} activeProps={{ className: "text-foreground font-medium" }}>Search</Link>
          <Link to="/explore" className={link} activeProps={{ className: "text-foreground font-medium" }}>Connections</Link>
          <Link to="/next-step" className={link} activeProps={{ className: "text-foreground font-medium" }}>Your next step</Link>
          <Link to="/impact" className={link} activeProps={{ className: "text-foreground font-medium" }}>10× case</Link>
          <HowToRead className={link} />
        </nav>
        {children && <div className="w-full md:ml-auto md:w-auto md:min-w-[420px] md:max-w-xl md:flex-1">{children}</div>}
      </div>
      <div className="border-y border-gold/40 py-[3px]"><MeanderBand className="opacity-60" /></div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 bg-background/75 text-center text-xs text-muted-foreground backdrop-blur-sm">
      <div className="border-y border-gold/40 py-[3px]"><MeanderBand className="opacity-60" /></div>
      <p className="px-4 py-4">Research navigation tool, not medical advice. Always check with the study team or a clinician.</p>
    </footer>
  );
}

function HowToRead({ className }: { className: string }) {
  return (
    <Dialog>
      <DialogTrigger className={`${className} inline-flex items-center gap-1`}>
        <HelpCircle className="h-4 w-4 shrink-0" /> <span className="max-sm:sr-only">How to read this</span>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">How to read this</DialogTitle>
          <DialogDescription>Every link on the map comes from a source. Two things tell you how much to trust it.</DialogDescription>
        </DialogHeader>
        <section className="space-y-3 text-sm">
          <h3 className="text-base">Where the link came from</h3>
          <p className="flex gap-3"><EvBadge ev="observed" /><span><b>Observed</b> (solid line). Taken from a curated database such as ClinicalTrials.gov or a disease catalogue.</span></p>
          <p className="flex gap-3"><EvBadge ev="extracted" /><span><b>Extracted</b> (dotted line). Read from a published paper by AI. We always show the quoted sentence so you can check it.</span></p>
          <p className="flex gap-3"><EvBadge ev="inferred" /><span><b>Inferred</b> (dashed line). Our own scoring, for example two diseases that share symptoms. A lead to check, never a proven result.</span></p>
        </section>
        <section className="space-y-3 text-sm">
          <h3 className="text-base">How strong the support is</h3>
          <p className="flex items-start gap-3"><TierBadge tier="high" /><span>Several good sources agree, or it is a curated record.</span></p>
          <p className="flex items-start gap-3"><TierBadge tier="medium" /><span>Supported, but by one source or a less direct one.</span></p>
          <p className="flex items-start gap-3"><TierBadge tier="low" /><span>Thin or disputed. Hidden on the map unless you choose “Show weaker links”.</span></p>
        </section>
        <p className="text-sm">A red line means at least one source disagrees. Click any line to see the quotes for and against.</p>
        <p className="text-xs text-muted-foreground">Research navigation tool, not medical advice. Always check with the study team or a clinician.</p>
      </DialogContent>
    </Dialog>
  );
}
