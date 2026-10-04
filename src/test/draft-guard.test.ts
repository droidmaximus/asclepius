import { describe, expect, it } from "vitest";
import { templateDraft, tidyDraft, unsupportedClinicalTerms } from "@/lib/draft-guard";

const step = {
  title: "Ask SphinCS Lyso Gemeinnutzige UG (Haftungsbeschrankt) about reusing Registry Gangliosidoses",
  differences: ["Registered status is UNKNOWN: confirm with the sponsor that it is still active."],
  review_questions: ["Can our genotype and age range be enrolled?", "Who owns the data and under what consent?"],
};

describe("Draft guard", () => {
  it("flags clinical words the facts do not contain", () => {
    const draft = "Tay-Sachs primarily affects infants, whereas GM2 gangliosidosis has adult onset.";
    expect(unsupportedClinicalTerms(draft, "Registry Gangliosidoses --reusable_for--> Tay-Sachs disease AB variant")).toEqual(["infants", "adult", "onset"]);
  });
  it("passes clinical words that appear in the facts, ignoring case", () => {
    expect(unsupportedClinicalTerms("Is the infantile form included?", "Phenotype: Infantile onset")).toEqual([]);
  });
  it("matches whole words only", () => {
    expect(unsupportedClinicalTerms("We hope to reuse the registry's data and its curation.", "")).toEqual([]);
  });
  it("builds a fallback message only from stored step data", () => {
    const text = templateDraft(step);
    expect(text).toContain("Dear SphinCS Lyso Gemeinnutzige UG (Haftungsbeschrankt),");
    expect(text).toContain("reusing Registry Gangliosidoses");
    expect(text).toContain(step.differences[0]);
    for (const q of step.review_questions) expect(text).toContain(q);
    expect(unsupportedClinicalTerms(text, JSON.stringify(step))).toEqual([]);
  });
  it("says the difference still needs checking when none is stored", () => {
    const text = templateDraft({ ...step, differences: [] });
    expect(text).toContain("still need to check with you how our diseases differ");
  });
  it("turns escaped line breaks into real ones and drops internal connection codes", () => {
    const raw = "Dear team,\\n\\nThe registry is listed for both diseases (see edges E1, E2). It covers E3 too.\\nThanks";
    expect(tidyDraft(raw)).toBe("Dear team,\n\nThe registry is listed for both diseases. It covers too.\nThanks");
  });
});
