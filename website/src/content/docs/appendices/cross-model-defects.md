---
title: Cross-Model Defect Chaining
sidebar:
  order: 2
---

This appendix outlines a plausible second-order systemic risk arising from the most obvious mitigation to model monoculture: the use of multiple models. The concern is not that diversity is ineffective, but that it may reduce common-mode failure while preserving systemic exposure in altered form.

**Scope and intent.** This appendix is a practitioner observation, not a research contribution. Correlated failure in populations with shared lineage is a well-understood phenomenon in other domains — agricultural monoculture, genetic inbreeding, financial contagion through shared counterparty exposure, common-mode failure in redundant engineering systems. This appendix says: the same structural conditions appear to exist in the coding-model ecosystem, and the same class of risk may apply. It does not attempt to formalise the interaction model, measure the effect, or characterise specific failure chains — that work requires empirical study by researchers with access to model internals, training lineage data, and controlled experimental environments that a practitioner threat model cannot provide. What follows identifies the mechanism, illustrates it with scenarios drawn from the paper's taxonomy, and states the implication for cross-agency response. The research question — whether cross-model defect composition is a real phenomenon, and if so how to detect and measure it — is open.

## Why diversity may not buy independence

Model diversity is the natural mitigation to monoculture risk, but it should not be assumed to buy independence. Three layers of systemic exposure are worth separating: pure monoculture, overlapping training-distribution bias across different models, and cross-model defect chaining. The first is straightforward. The second is strongly plausible: even different models trained on similar public corpora may reproduce the same bad patterns, because those patterns represent the statistical majority of their training data. The third — one model's characteristic defect creating the conditions under which another model's distinct defect becomes dangerous — is the least established and the most speculative.

Fine-tuning multiple variants on local code may be directionally helpful, but fine-tuning is an adaptation of a base model, not a removal of its deep training-distribution habits.

Variant diversity can only decorrelate errors that originate in the portion of training that differs between variants. The dominant failure mode this paper describes — context-inappropriate defensive code on high-stakes paths — lives in the shared trunk, not the branches. For the risks discussed here, the relevant question is lineage independence, not variant count — and agencies should not assume that fine-tuned variants of the same base model provide meaningful independence.

## The chaining mechanism

In a multi-model environment, distinct defect tendencies may not cancel out; they may interact. The scenarios below are illustrative mechanisms, not observed cross-model incidents.

Model A, used by one team, tends to omit or weaken validation boundaries on external data crossing authority tiers ([ACF-T1](../../acf/t1-authority-tier-conflation/)). Model B, used by a different team or contractor on the same codebase, tends to add reassuring defaults and graceful error handling when fields are missing ([ACF-S1](../../acf/s1-fabricated-default/)). Separately, each is a recognised failure mode. Together, A weakens the authority-tier boundary and B ensures the resulting anomaly is normalised instead of surfaced — the composed outcome (silently authoritative unvalidated data) is worse than either defect alone.

Or consider a modernisation chain — particularly plausible in contracted development where different vendors may use different models on the same codebase. Model A removes accidental fail-closed rigidity from legacy code. Model B later adds "resilience" handling on the newly live edge path. Model C writes passing tests around the softened behaviour (ACF-R3). The end state is not a single shared defect but a system in which several model-specific behaviours have jointly erased an old safety property — and each step passed review independently.

## Stale mandates as a second-order risk

[Appendix E.8 of the discussion paper](../../pdf/threat-model-discussion-paper-community.pdf) documents a related multi-session failure mechanism approximately five months after the earlier incidents. The examples in E.1–E.6 show semantic defects being *caught*. The postscript documents the other half of the lifecycle — the same project operating inside the mature response — and it closes a loop opened by a structural-typing guard incident: a runtime-checkable protocol passed impostor objects while rejecting the real vendor object, with approximately 33,000 unit tests green. That incident produced a corrective decision record, and the record's aftermath is where this example begins.

**The stale mandate.** A standing remediation ticket directed the elimination of "banned attribute masquerading" across a 601-site target list, prescribing two remedies: declare runtime-checkable protocols, and ban the attribute-probing tokens outright. The governing decision record — accepted *one day after the ticket was last edited* — named the ticket explicitly and reversed both instructions: the protocol pattern was the root cause of the original P0 (it admits impostors that merely declare the expected attribute names, and from Python 3.12 onward rejects genuine dynamic vendor objects), and the probing tokens it banned are now the *prescribed* pattern at external boundaries (sentinel probe → value assertions → owned type). Following the ticket literally would have reintroduced the P0. The executing agent session caught the contradiction — by checking the ticket against the decision records that cite it before acting — and converted the task from a migration into an investigation.

The counterfactual is the hazard worth naming. Agents are unusually literal and compliant executors of work instructions — and the more faithful the execution, the more dangerous a silently superseded instruction becomes. A human assigned the ticket might have remembered the week-old decision or asked; an agent handed the ticket as its task frame has no reason to doubt it, and statelessness compounds the exposure: the agent re-trusts the stale ticket afresh in every session, indefinitely. This failure mode is distinct from the taxonomy's existing entries — it is not training-distribution bias (no pattern was being reached for), not context collapse (the context was present and correct; the *instruction* was wrong), and not ACF-R4's handover loss (nothing was dropped between sessions). The candidate name is **stale mandate execution**: an agent faithfully executes a work instruction that has been superseded or withdrawn by a governance artefact the instruction does not reference. The defect is not in the code the agent writes — it is that the agent writes the wrong code correctly. The mitigation is the family this paper already proposes: machine-readable governance state that the task frame is forced to consult — work instructions that cite their governing decision records, and tooling that fails the task when a cited record has been superseded. This observation is put forward as a candidate through the taxonomy extension mechanism (a workflow pattern in the Repudiation family), not as a settled entry.

This is not evidence that a particular model family causes stale mandates. It is relevant to cross-model chaining because a stale mandate can persist across model and session boundaries, while each model contributes a different locally plausible implementation step. Model diversity does not correct an authoritative but obsolete task frame.

## Lineage concentration

The agricultural monoculture analogy remains useful, but the agentic case is more complex than single-strain uniformity. Because frontier-scale coding models remain expensive to create, the effective lineage pool is likely to remain small even as the product pool expands. Fine-tuning, distillation, and derivative deployments may widen behavioural diversity, but they do not guarantee independence because descendants inherit training-distribution priors from their base model. The resulting ecosystem is better modelled as a small number of influential training lineages with many descendants than as a large population of genuinely independent systems. In practice, this means that a market with many products may still represent only a small number of genuinely independent coding-model lineages.

## Implication for cross-agency response

The implication is narrow but important. Agencies conducting cross-agency scanning and remediation should not look only for repeated identical defects from a single model. They should also watch for co-occurring defect chains — patterns from different models that are individually unremarkable but jointly collapse a trust boundary. "Different agencies use different models, so we are safe" is not a defensible position if the models' distinct failure tendencies are composable.

This paper does not attempt to formalise the interaction model or characterise specific cross-model chains. The claim is not that cross-model defect chaining is established, but that model diversity should not be treated as a sufficient independence argument without evidence.

## What this appendix does not provide — and who should

This appendix identifies a candidate risk by analogy to well-understood correlated-failure phenomena in other domains. It does not provide:

- **Empirical measurement** of whether cross-model defect composition occurs in practice, or at what rate
- **A lineage independence framework** — a methodology for assessing whether two coding models have meaningfully independent training lineages, or how much independence is "enough"
- **Detection criteria** for cross-model defect chains as distinct from same-model correlated defects
- **A formal interaction model** specifying the conditions under which defects from different models compose

These are research questions. They require access to model training data, controlled experiments with known model lineages, and statistical methodology for characterising failure correlation across model families — none of which a practitioner threat model can supply. The observation that coding-model ecosystems exhibit the structural preconditions for correlated failure (small effective lineage pool, shared training distributions, derivative models inheriting base-model priors) comes from the same place as any practitioner's pattern recognition: sustained exposure to a domain's failure modes, combined with familiarity with how similar structural conditions have played out elsewhere.

The policy responses that address cross-model risk do not depend on this appendix being confirmed. The case for international coordination rests on the shared-problem argument — every country using these tools faces the same failure modes, and the training corpus feedback loop means no national framework can address the upstream bias alone. Treating correlated failure as an assessment concern, and scanning a codebase for known defect patterns, are justified by the single-model evidence in the case studies. This appendix adds a further reason to take those responses seriously, but they stand without it.

## See also

- [ACF-S1: Fabricated Default](../../acf/s1-fabricated-default/) — reassuring defaults that normalise anomalies
- [ACF-T1: Authority Tier Conflation](../../acf/t1-authority-tier-conflation/) — weakened validation boundaries on external data
- [ACF Taxonomy Index](../../acf/) — complete taxonomy of AI code failure modes
