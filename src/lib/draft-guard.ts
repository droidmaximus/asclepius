// Clinical words a draft may use only when the facts given to the model already contain them.
// "age" and "treatment" are left out: review questions say "age range", and the prompt forbids promising a treatment.
const CLINICAL_TERMS = [
  "onset", "infant", "infants", "infantile", "juvenile", "adult", "adults", "child", "children", "aged",
  "severe", "severity", "mild", "progression", "progressive", "prognosis", "lifespan", "life expectancy",
  "fatal", "cure", "cures", "therapy",
];

const words = (text: string) => ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;

/** Clinical terms in `draft` that do not appear in `facts`, in the order they occur in the draft. */
export function unsupportedClinicalTerms(draft: string, facts: string): string[] {
  const d = words(draft);
  const f = words(facts);
  return CLINICAL_TERMS
    .filter((t) => d.includes(` ${t} `) && !f.includes(` ${t} `))
    .sort((a, b) => d.indexOf(` ${a} `) - d.indexOf(` ${b} `));
}

export type DraftStep = { title?: string; differences?: string[]; review_questions?: string[] };

/** A first message built only from stored step data, used when the model's draft cannot be trusted. */
export function templateDraft(step: DraftStep): string {
  const title = step.title ?? "";
  const reuse = title.match(/^Ask (.+?) about reusing (.+)$/);
  const contact = title.match(/^Contact (.+)$/);
  const owner = reuse?.[1] ?? contact?.[1] ?? "study team";
  const hope = reuse
    ? `We lead a patient group and are interested in reusing ${reuse[2]} for our community.`
    : "We lead a patient group and would like to explore working together.";
  const differences = step.differences?.length
    ? `Before going further, we understand that: ${step.differences.join(" ")}`
    : "We still need to check with you how our diseases differ before going further.";
  const questions = step.review_questions?.length
    ? ["Could you help us with these questions?", ...step.review_questions.map((q) => `- ${q}`)].join("\n")
    : "";
  return [`Dear ${owner},`, hope, differences, questions, "Thank you for your time.\n\nKind regards,\n[Your name]"]
    .filter(Boolean)
    .join("\n\n");
}

/** Real line breaks instead of escaped "\n", and no internal connection codes such as "(see edges E1, E2)". */
export function tidyDraft(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\s*\((?:see\s+)?(?:edges?\s+)?E\d+(?:\s*(?:,|and)\s*E\d+)*\)/gi, "")
    .replace(/[ \t]*\bE\d+\b[ \t]*/g, " ")
    .replace(/ +([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
