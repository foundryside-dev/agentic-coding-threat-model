## Appendix F: Cross-Model Defect Chaining as an Emerging Second-Order Risk

This appendix outlines a plausible second-order systemic risk arising from the most obvious mitigation to model monoculture: the use of multiple models. The concern is not that diversity is ineffective, but that it may reduce common-mode failure while preserving systemic exposure in altered form.

**Scope and intent.** This appendix is a practitioner observation, not a research contribution. Correlated failure in populations with shared lineage is a well-understood phenomenon in other domains — agricultural monoculture, genetic inbreeding, financial contagion through shared counterparty exposure, common-mode failure in redundant engineering systems. This appendix says: the same structural conditions appear to exist in the coding-model ecosystem, and the same class of risk may apply. It does not attempt to formalise the interaction model, measure the effect, or characterise specific failure chains — that work requires empirical study by researchers with access to model internals, training lineage data, and controlled experimental environments that a practitioner threat model cannot provide. What follows identifies the mechanism, illustrates it with scenarios drawn from the paper's taxonomy, and states the implication for cross-agency response. The research question — whether cross-model defect composition is a real phenomenon, and if so how to detect and measure it — is open.

### F.1 Why Diversity May Not Buy Independence

Model diversity is the natural mitigation to monoculture risk (§2.4), but it should not be assumed to buy independence. Three layers of systemic exposure are worth separating: pure monoculture, overlapping training-distribution bias across different models, and cross-model defect chaining. The first is straightforward. The second is strongly plausible: even different models trained on similar public corpora may reproduce the same bad patterns, because those patterns represent the statistical majority of their training data. The third — one model's characteristic defect creating the conditions under which another model's distinct defect becomes dangerous — is the least established and the most speculative.

Fine-tuning multiple variants on local code may be directionally helpful, but fine-tuning is an adaptation of a base model, not a removal of its deep training-distribution habits.

Variant diversity can only decorrelate errors that originate in the portion of training that differs between variants. The dominant failure mode this paper describes — context-inappropriate defensive code on high-stakes paths — lives in the shared trunk, not the branches. For the risks discussed here, the relevant question is lineage independence, not variant count — and agencies should not assume that fine-tuned variants of the same base model provide meaningful independence.

### F.2 The Chaining Mechanism

In a multi-model environment, distinct defect tendencies may not cancel out; they may interact. The scenarios below are illustrative mechanisms, not observed cross-model incidents.

Model A, used by one team, tends to omit or weaken validation boundaries on external data crossing authority tiers (ACF-T1). Model B, used by a different team or contractor on the same codebase, tends to add reassuring defaults and graceful error handling when fields are missing (ACF-S1). Separately, each is a recognised failure mode. Together, A weakens the authority-tier boundary and B ensures the resulting anomaly is normalised instead of surfaced — the composed outcome (silently authoritative unvalidated data) is worse than either defect alone. §2.4(g) develops this example in full.

Or consider a modernisation chain — particularly plausible in contracted development where different vendors may use different models on the same codebase (§6.7). Model A removes accidental fail-closed rigidity from legacy code (§1.2.6). Model B later adds "resilience" handling on the newly live edge path. Model C writes passing tests around the softened behaviour (ACF-R3). The end state is not a single shared defect but a system in which several model-specific behaviours have jointly erased an old safety property — and each step passed review independently.

### F.3 Lineage Concentration

The agricultural monoculture analogy remains useful, but the agentic case is more complex than single-strain uniformity. Because frontier-scale coding models remain expensive to create, the effective lineage pool is likely to remain small even as the product pool expands. Fine-tuning, distillation, and derivative deployments may widen behavioural diversity, but they do not guarantee independence because descendants inherit training-distribution priors from their base model. The resulting ecosystem is better modelled as a small number of influential training lineages with many descendants than as a large population of genuinely independent systems. In practice, this means that a market with many products may still represent only a small number of genuinely independent coding-model lineages.

### F.4 Implication for Cross-Agency Response

The implication is narrow but important. Agencies conducting cross-agency scanning and remediation should not look only for repeated identical defects from a single model. They should also watch for co-occurring defect chains — patterns from different models that are individually unremarkable but jointly collapse a trust boundary. "Different agencies use different models, so we are safe" is not a defensible position if the models' distinct failure tendencies are composable.

This paper does not attempt to formalise the interaction model or characterise specific cross-model chains. The claim is not that cross-model defect chaining is established, but that model diversity should not be treated as a sufficient independence argument without evidence.

### F.5 What This Appendix Does Not Provide — and Who Should

This appendix identifies a candidate risk by analogy to well-understood correlated-failure phenomena in other domains. It does not provide:

- **Empirical measurement** of whether cross-model defect composition occurs in practice, or at what rate
- **A lineage independence framework** — a methodology for assessing whether two coding models have meaningfully independent training lineages, or how much independence is "enough"
- **Detection criteria** for cross-model defect chains as distinct from same-model correlated defects
- **A formal interaction model** specifying the conditions under which defects from different models compose

These are research questions. They require access to model training data, controlled experiments with known model lineages, and statistical methodology for characterising failure correlation across model families — none of which a practitioner threat model can supply. The observation that coding-model ecosystems exhibit the structural preconditions for correlated failure (small effective lineage pool, shared training distributions, derivative models inheriting base-model priors) comes from the same place as any practitioner's pattern recognition: sustained exposure to a domain's failure modes, combined with familiarity with how similar structural conditions have played out elsewhere.

The positions advanced in this paper that reference cross-model risk do not depend on Appendix F being confirmed. The case for international coordination rests on the shared-problem argument — every country using these tools faces the same failure modes, and the training corpus feedback loop (§2.5) means no national framework can address the upstream bias alone. The case for treating correlated failure as an assessment concern, and for scanning for patterns rather than instances, is justified by the single-model evidence in the case studies. Appendix F adds a further reason to take those positions seriously, but they stand without it.

---
