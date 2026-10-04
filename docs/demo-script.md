# Demo script

## 1-minute walkthrough

Record at 1440×900 on https://asclepius.avinash.social. About 150 spoken words.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:08 | Home page | "Maria leads a patient group for GM2 activator deficiency. Fewer than 30 patients have ever been reported." |
| 0:08–0:16 | Type "GM2 activator deficiency", pick the result | "One search box. Her name for the disease resolves to the ontology's: Tay-Sachs disease AB variant." |
| 0:16–0:26 | Connections map; point at Sandhoff and Tay-Sachs in the left rail | "The map shows its genes, symptoms, studies and groups. Neighbours are ranked by shared, specific symptoms." |
| 0:26–0:36 | Click the line to Registry Gangliosidoses; evidence panel opens | "Every line says where it came from, when, and how strong it is. Text-mined links carry the exact quote." |
| 0:36–0:46 | Your next step; click Draft a message | "Her next step: a registry that already names her disease. The draft states only facts in the atlas." |
| 0:46–0:56 | 10× case page | "Joining it instead of building one is three to thirty times faster, about nine at the middle. Every number is sourced or labelled." |
| 0:56–1:00 | Counterexamples tab | "And it shows look-alikes that aren't. Built with OpenAI models." |

## Team video outline (2–3 minutes)

1. **Who we are** (20 s): names, roles, one line each.
2. **The problem** (30 s): 350 million people, under 5% with an approved treatment, and knowledge scattered across papers, registries and groups. Maria rebuilds what already exists.
3. **What we built** (60 s): the pipeline (Monarch, ClinicalTrials.gov, PubMed, NIH RePORTER, patient-group sites via Bright Data), OpenAI extraction checked against verbatim quotes, the graph in Supabase, and the Asclepius interface.
4. **Why trust it** (30 s): no source, no line; contradictions shown; animal-only findings dropped; drafts restricted to stored facts.
5. **The 10× case** (20 s): one milestone, two timelines, the assumptions to validate.
6. **What's next** (20 s): more clusters from the same config, patient groups correcting their own entries, measuring the assumptions with the first family.
