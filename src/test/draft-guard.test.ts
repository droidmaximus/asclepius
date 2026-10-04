import { describe, expect, it } from "vitest";
import { claimsUnstoredDifference, templateDraft, tidyDraft, unsupportedClinicalTerms } from "@/lib/draft-guard";

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
  it("flags survival, death and cure wording in their inflected forms", () => {
    const draft = "Tay-Sachs is usually lethal in early childhood; patients rarely survive past age 4 and no therapies have cured it.";
    const terms = unsupportedClinicalTerms(draft, "Registry Gangliosidoses --reusable_for--> Tay-Sachs disease AB variant");
    expect(terms).toEqual(expect.arrayContaining(["lethal", "childhood", "cured", "age 4"]));
  });
  it("allows an age phrase that the facts contain", () => {
    expect(unsupportedClinicalTerms("Do you enrol from age 4?", "Inclusion: age 4 and over")).toEqual([]);
  });
  it("flags age phrases the facts do not contain", () => {
    expect(unsupportedClinicalTerms("Most are aged 2 and live 10 years.", "age 4")).toEqual(["aged 2", "10 years"]);
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
  it.each(["(see edges E1, E2, and E3)", "(Edges: E1, E2)", "[E1, E2]", "(E1-E3)", "(see edge E4)"])(
    "drops the bracketed connection codes %s completely",
    (codes) => {
      expect(tidyDraft(`It fits ${codes}.`)).toBe("It fits.");
    },
  );
  it("leaves no stray spaces at line edges after dropping codes", () => {
    expect(tidyDraft("Hi,\\nE1 covers it. \\nThanks")).toBe("Hi,\ncovers it.\nThanks");
  });
  it("keeps brackets that hold more than connection codes", () => {
    expect(tidyDraft("It fits (mostly E1).")).toBe("It fits (mostly).");
  });
  it("flags a difference claim when no difference is stored", () => {
    const draft = "One known difference is that the study focuses on GM2 gangliosidosis.";
    expect(claimsUnstoredDifference(draft, false)).toBe(true);
    expect(claimsUnstoredDifference("Our disease differs from Tay-Sachs in its genes.", false)).toBe(true);
  });
  it("allows a difference claim when differences are stored", () => {
    expect(claimsUnstoredDifference("One known difference is that the study focuses on GM2 gangliosidosis.", true)).toBe(false);
  });
  it("allows saying the difference still needs checking", () => {
    expect(claimsUnstoredDifference("How the diseases differ still needs to be checked with the study team.", false)).toBe(false);
    expect(claimsUnstoredDifference("The main difference from our disease still needs to be checked.", false)).toBe(false);
    expect(claimsUnstoredDifference("We are interested in reusing the registry.", false)).toBe(false);
  });
});
