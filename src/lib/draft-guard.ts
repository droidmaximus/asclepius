// Clinical words a draft may use only when the facts given to the model already contain them.
// "age" and "treatment" are left out: review questions say "age range", and the prompt forbids promising a treatment.
const CLINICAL_TERMS = [
  "onset", "infant", "infants", "infantile", "infancy", "neonatal", "newborn", "newborns", "toddler", "toddlers",
  "juvenile", "adult", "adults", "adulthood", "child", "children", "childhood", "aged", "years old",
  "severe", "severity", "mild", "milder", "progression", "progressive", "progresses", "worsens", "deteriorates",
  "regression", "symptoms", "prognosis", "lifespan", "life expectancy",
  "fatal", "lethal", "death", "die", "dies", "died", "survive", "survives", "survival",
  "cure", "cures", "cured", "curative", "therapy", "therapies", "treatments",
];

const AGE_PHRASE = /\b(?:aged? \d+|\d+ years)\b/g;

const words = (text: string) => ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;

/** Clinical terms and age phrases in `draft` that do not appear in `facts`, in the order they occur in the draft. */
export function unsupportedClinicalTerms(draft: string, facts: string): string[] {
  const d = words(draft);
  const f = words(facts);
  const ages = [...new Set(d.match(AGE_PHRASE) ?? [])];
  const found = [...CLINICAL_TERMS, ...ages].filter((t) => d.includes(` ${t} `) && !f.includes(` ${t} `));
  return found
    .filter((t) => !found.some((u) => u.startsWith(`${t} `) && d.indexOf(` ${u} `) === d.indexOf(` ${t} `)))
    .sort((a, b) => d.indexOf(` ${a} `) - d.indexOf(` ${b} `));
}

const DIFFERENCE_CLAIM = /\b(?:known|one|key|main|important|notable) difference\b|\bdiffers? (?:in|by|from)\b/i;
const NEEDS_CHECKING = /\b(?:still )?needs? to (?:be )?check|\bstill (?:needs?|has|have) to be (?:checked|confirmed)|\bnot yet (?:known|checked)/i;

/** True when, with no stored difference, a sentence of `draft` states a difference instead of saying it still needs checking. */
export function claimsUnstoredDifference(draft: string, hasStoredDifferences: boolean): boolean {
  if (hasStoredDifferences) return false;
  return draft.split(/(?<=[.!?])\s+|\n+/).some((s) => DIFFERENCE_CLAIM.test(s) && !NEEDS_CHECKING.test(s));
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

const onlyEdgeCodes = (inner: string) =>
  /\bE\d+\b/i.test(inner) && inner.replace(/\b(?:see|edges?|and|E\d+)\b|[\s,:\-–]/gi, "") === "";

/** Real line breaks instead of escaped "\n", and no internal connection codes such as "(see edges E1, E2)". */
export function tidyDraft(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/[ \t]*(?:\(([^()]*)\)|\[([^[\]]*)\])/g, (group, round?: string, square?: string) =>
      onlyEdgeCodes(round ?? square ?? "") ? "" : group)
    .replace(/[ \t]*\bE\d+\b[ \t]*/g, " ")
    .replace(/[ \t]+([.,;:)\]])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}
