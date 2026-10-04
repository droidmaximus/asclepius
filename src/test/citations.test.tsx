import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { citationDate, recordSources, safeSourceUrl, sourceRecordId } from "@/lib/citations";
import { SourceEvidence, SourceQuote } from "@/components/atlas/SourceEvidence";
import type { AtlasEdge, Evidence } from "@/lib/atlas";

const edge: AtlasEdge = { id: "a|reusable_for|b", source_id: "a", target_id: "b", type: "reusable_for", source: "monarch", retrieved_at: null, confidence: 0.8, tier: "high", evidence_type: "inferred", contradicts: [], evidence_ids: [], props: null };
const evidence: Evidence = { id: "ev:1", edge_id: edge.id, source: "pubmed", url: "https://pubmed.ncbi.nlm.nih.gov/28417072/", quote: "Exact source wording.\nA second sentence is not shortened.", polarity: "supports", retrieved_at: "2026-10-03T15:00:00Z" };

describe("Evidence citations", () => {
  it("identifies concrete paper and study records", () => {
    expect(sourceRecordId(evidence.url)).toBe("PMID:28417072");
    expect(sourceRecordId("https://clinicaltrials.gov/study/NCT04624789")).toBe("NCT04624789");
    expect(sourceRecordId("https://example.org/28417072")).toBeNull();
  });
  it("rejects unsafe links and handles missing dates", () => {
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(citationDate(null)).toBe("Not recorded");
    expect(citationDate("2026-10-03T15:00:00Z")).toBe("3 Oct 2026");
  });
  it("renders full stored wording with identifiable linked attribution", () => {
    const html = renderToStaticMarkup(<SourceQuote evidence={evidence} nodes={new Map()} />);
    expect(html).toContain(evidence.quote);
    expect(html).toContain("PMID:28417072");
    expect(html).toContain(evidence.url);
    expect(html).toContain("as stored in the atlas");
  });
  it("does not invent a quotation or imply an exhaustive contradiction search", () => {
    const html = renderToStaticMarkup(<SourceEvidence edge={edge} evidence={[]} nodes={new Map()} />);
    expect(html).toContain("Confidence score: 80%");
    expect(html).toContain("not a quoted finding or a chance of treatment success");
    expect(html).not.toContain("No supporting quotation is supplied");
    expect(html).toContain("This does not mean none exist");
    expect(html).not.toContain("<blockquote");
    expect(recordSources(edge, new Map())).toEqual([]);
  });
  it("shows confidence for an entry without quoted wording while preserving its citation", () => {
    const html = renderToStaticMarkup(<SourceEvidence edge={edge} evidence={[{ ...evidence, quote: " " }]} nodes={new Map()} />);
    expect(html).toContain("Confidence score: 80%");
    expect(html).toContain(evidence.url);
    expect(html).not.toContain("<blockquote");
    expect(html).not.toContain("No quoted passage supplied");
  });
  it("keeps actual quotations and does not invent missing scores", () => {
    const quoted = renderToStaticMarkup(<SourceEvidence edge={edge} evidence={[evidence]} nodes={new Map()} />);
    expect(quoted).toContain(evidence.quote);
    expect(quoted).not.toContain("Confidence score:");
    const missing = renderToStaticMarkup(<SourceEvidence edge={{ ...edge, confidence: null }} evidence={[]} nodes={new Map()} />);
    expect(missing).toContain("Confidence score: Not recorded");
  });
});