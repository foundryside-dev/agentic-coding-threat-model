---
title: "CISO Assessment: AI-Generated Code Risk"
sidebar:
  order: 2
---

## Purpose

This assessment helps CISOs and security advisors evaluate their organisation's exposure to semantic defects in AI-generated code and identify control gaps in current frameworks. It is designed to be self-sufficient — you can complete the control-gap assessment using this page alone. Links to the [full discussion paper](../../pdf/threat-model-discussion-paper-community.pdf) are provided for optional depth.

## Threat overview

The risk is not that AI agents write obviously broken code. The risk is that they write code that is syntactically correct, passes all automated checks, follows established conventions — and does the wrong thing in your institutional context.

**What these defects look like.** Agent-generated code applies defensive programming patterns uniformly across code paths that require different failure semantics. A `.get()` with a sensible default, a `try/except` that logs and continues, a coalesced fallback on a missing field — each follows conventions reviewers are trained to approve. The failure is semantic: the code silently fabricates data where absence should be surfaced as a failure, swallows audit-critical errors, or treats unvalidated external data as trusted. The surface quality is uniformly high regardless of whether the code is semantically correct, removing the "this looks sloppy, I should look more carefully" signal that reviewers rely on.

**The same pattern, different consequences.** The code pattern is identical across domains — detect missing data, substitute a reasonable default. A weather app that defaults a missing location to the device's GPS is correct: the fallback genuinely recovers the information from an alternative source. A mail system that defaults a missing classification to `OFFICIAL` silently downgrades a PROTECTED document. A clinical system that defaults a missing allergy field to an empty list converts an unanswered clinical question into a confident negative finding — downstream decisions proceed as though no allergy were recorded. The core failure in both dangerous cases is a category error between program state and domain state: in program terms, a missing field is merely an absent value; in domain terms, it is an integrity failure or an unanswered question. Defaulting the field converts an unanswered question into a confident answer, and downstream systems treat that fabricated answer as authoritative data.

**Why existing controls do not catch them.** The ISM and Essential Eight were not designed for this failure class. ISM-0402's SAST/DAST/SCA requirement covers known vulnerability patterns but not context-dependent semantic correctness. ISM-2060/2061 mandate code review but do not address review effectiveness under agent-generated volume. No ISM control addresses semantic boundary enforcement, code provenance tracking, or correlated failure detection. The Essential Eight is an operational security framework that does not directly address SDLC practices, though its principles of graduated trust and least privilege are directionally relevant.

**Scale of exposure.** For most Australian Government software, contracted service providers are the dominant delivery channel. Your internal teams may have controls for AI tool usage, but your contracted suppliers — who deliver the majority of code — may be using the same agent tooling across multiple agencies without disclosure requirements. This creates cross-agency correlated risk: a systematic defect introduced by a contractor's agent may propagate to every agency that contractor serves. This is concentration risk through interconnected delivery chains — the topology alone is sufficient to identify the vulnerability, in the same way that interconnected counterparties create systemic risk in financial networks regardless of their individual creditworthiness.

## STRIDE threat mapping

The discussion paper applies STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) — the established threat modelling framework used in Australian government security assessments — to the agentic development workflow. The key structural observation is that the AI model is an **external system** producing output that crosses a trust boundary into the repository. This is the same structural position as any external data source, and it warrants the same boundary discipline.

Agent-generated code is treated as an **input** to the system — analogous to treating user input as untrusted. The agent is not an adversary, but its output has the same authority properties as any external input: it may be well-formed, it may be reasonable, but it has not been validated against the system's security requirements.

| STRIDE Category | Agentic Variant | Key ACF Entries | Control Implication |
|----------------|----------------|-----------------|---------------------|
| **Spoofing** | Code appears to handle data correctly but operates on fabricated or default values, presenting a false picture of data integrity | ACF-S1, ACF-S2, ACF-S3 | Data integrity controls, classification handling, identity verification |
| **Tampering** | External (untrusted) data treated as internal (trusted) data without validation — the data's authority tier is silently elevated | ACF-T1, ACF-T2, ACF-T3 | Trust boundary enforcement, input validation, data integrity |
| **Repudiation** | Error handling destroys audit trails; multi-step operations complete partially; tests verify mocks instead of real behaviour; fixes introduce new violations | ACF-R1, ACF-R2, ACF-R3, ACF-R5 | Audit trail integrity, transaction integrity, verification assurance |
| **Information Disclosure** | Agent-generated error handlers expose internal system details in error responses | ACF-I1 | Information protection, error response hygiene |
| **Denial of Service** | Code volume overwhelms review capacity; finding volume causes reviewer habituation — the "service" denied is the review process itself | ACF-D1, ACF-D2 | Review process effectiveness, capacity planning |
| **Elevation of Privilege** | External assertions accepted without verification, granting privileges through data flow rather than explicit privilege calls | ACF-E1, ACF-E2 | Access control, privilege management, delegation verification |

:::caution[Two categories are analogical extensions]
Spoofing (fabricated data presenting as authoritative, not identity forgery) and Denial of Service (review process exhaustion, not runtime resource depletion) are analogical extensions of STRIDE's original technical-system categories to development-process analysis. The discussion paper proposes these as candidate extensions rather than presenting them as standard STRIDE applications. Tampering, Information Disclosure, and Elevation of Privilege map naturally.
:::

### The compounding effect

These six threat categories do not operate independently. In practice, they compound — and the compounding produces a structural failure condition.

:::danger[Illustrative compounding scenario]
1. An agent generates code with **authority tier conflation** (ACF-T1), creating the conditions for **implicit privilege grant** (ACF-E1) — external API data used directly without validation.
2. Errors in that data are caught by a broad `except` block, producing **audit trail destruction** (ACF-R1).
3. The handler substitutes a default value rather than surfacing uncertainty — **fabricated default** (ACF-S1). Downstream components treat that fabricated value as authoritative.
4. Review volume pressure means the pattern is not detected before merge — **review capacity exhaustion** (ACF-D2).

Each individual pattern follows conventions generally regarded as good practice. The broad `except` block is responsible error handling. The default value is defensive programming. The direct API usage is clean integration code. A conventional review could approve each pattern individually. The compound effect is a system that silently produces wrong results, cannot explain why, and passed every review gate.
:::

A subtler compounding mechanism operates across time: upstream representational choices can collapse the semantic distinctions that downstream code needs. When a typed contract is flattened into a permissive dictionary structure, downstream defensive access patterns cease to look anomalous and begin to look prudent — upstream looseness manufactures the local conditions under which defensive handling appears justified.

## Failure mode summary

The [ACF Taxonomy](../../acf/) catalogues fifteen core failure modes (plus five provisional candidates). The table below maps each core entry to control-relevant categories.

| ACF ID | Failure Mode | STRIDE | Type | Risk | Control Category | Existing Detection |
|--------|-------------|--------|------|------|-----------------|-------------------|
| ACF-S1 | Fabricated Default — defaults fabricate data where absence should be surfaced | Spoofing | Code Pattern | High | Data integrity, classification handling | Partial — no standard tool detects context-inappropriate defaults |
| ACF-S2 | Spurious Field Access — agent accesses non-existent fields masked by fallback defaults | Spoofing | Code Pattern | High | Data integrity | Partial — type checkers catch it only on fully annotated objects |
| ACF-S3 | Structural Identity Spoofing — structural presence used as identity/privilege gate | Spoofing | Code Pattern | High | Access control, identity verification | Partial |
| ACF-T1 | Authority Tier Conflation — external data treated as trusted without validation | Tampering | Code Pattern | **Critical** | Trust boundary, input validation | **None** |
| ACF-T2 | Silent Coercion — data silently coerced across type/format boundaries | Tampering | Code Pattern | Medium | Data integrity | Partial |
| ACF-T3 | Unstructured Signal Parsing — control flow built on substring matching of prose text | Tampering | Code Pattern | High | Data integrity, classification handling | Partial |
| ACF-R1 | Audit Trail Destruction — error handling swallows audit-critical events (two forms: catch-and-continue, and untyped propagation bypassing structured handlers) | Repudiation | Code Pattern | High | Audit trail, compliance, evidentiary integrity | Partial |
| ACF-R2 | Partial Completion — multi-step operations complete partially without rollback | Repudiation | Code Pattern | High | Transaction integrity, audit completeness | **None** |
| ACF-R3 | Verification Displacement — tests displaced onto mocks or already-degraded behaviour (two sub-modes: R3a verification substitution, R3b compensating control dependency) | Repudiation | Code Pattern | High | Test assurance, verification integrity | Partial (R3a) / None (R3b) |
| ACF-R5 | Remediation-Induced Violation — fixes introduce different violations under assurance cover | Repudiation | Code Pattern | High | Remediation assurance, audit integrity | **None** |
| ACF-I1 | Verbose Error Response — internal details exposed in error responses | Info Disclosure | Code Pattern | Medium | Information protection | Partial |
| ACF-D1 | Finding Flood — automated analysis produces excessive findings, causing habituation | Denial of Service | Process Threat | High | Review process effectiveness | N/A — process threat |
| ACF-D2 | Review Capacity Exhaustion — code volume overwhelms review capacity | Denial of Service | Process Threat | High | Review process effectiveness | N/A — process threat |
| ACF-E1 | Implicit Privilege Grant — external assertions accepted without verification | Elev. of Privilege | Code Pattern | **Critical** | Access control, privilege management | **None** |
| ACF-E2 | Unvalidated Delegation — authority delegated without verification chain | Elev. of Privilege | Code Pattern | High | Access control, delegation | Partial |

:::danger[Detection is worst where risk is highest]
Four of the fifteen core failure modes have **zero detection** in standard tooling. Both Critical-rated entries — ACF-T1 (authority tier conflation) and ACF-E1 (implicit privilege grant) — are in this zero-detection group, along with ACF-R2 (partial completion, High) and ACF-R5 (remediation-induced violation, High). ACF-R3b (compensating control dependency) also has no practical detection — the fragility is invisible until the compensating control is removed. Thirteen of fifteen core failure modes are either undetected or only partially detected by existing tools. The highest-risk failures are precisely the ones current tooling misses entirely.
:::

### Failure type distinction

The taxonomy intentionally mixes code-level semantic failures and process-level assurance failures, because the paper's central claim is that they interact: code-level failures pass review *because* of process-level failures. The "Type" column above distinguishes code patterns (addressable with technical controls) from process threats (addressable with management controls). Two entries — ACF-D1 and ACF-D2 — are process threats that degrade the review process itself, not code patterns that tools can detect.

### Relation to known vulnerability classes

Not all fifteen failure modes are novel. Three entries — ACF-R1 (audit trail destruction), ACF-R2 (partial completion), and ACF-I1 (verbose error response) — describe well-known vulnerability classes that agents produce at systematically higher rates. The remaining entries describe failure modes specific to agent-generated code. The inclusion criterion is not novelty — it is whether a failure mode requires *systematic* rather than *ad hoc* management in an agentic development context. A "known" vulnerability class produced identically across every codebase using the same agent is not the same risk as the same class produced sporadically by individual developers with diverse training and experience — the correlation changes the risk calculus even when the individual pattern is well understood.

### Provisional candidates

Five additional failure modes are documented as provisional candidates, not counted in the core fifteen: ACF-S4 (Type Annotation Erosion), ACF-S5 (Type Structure Avoidance), ACF-T4 (Safety Guard Erosion), ACF-R4 (Context Handover Assumption), and ACF-R6 (Scope-Limited Triage). Of particular note for CISOs:

- **ACF-S4 and ACF-S5 are meta-failures** that degrade the detection capability for other taxonomy entries — S4 by eroding existing type safety infrastructure, S5 by ensuring it is never constructed. These two entries are complementary: S4 removes safety nets that are already in place, S5 ensures they are never built.
- **ACF-T4 and ACF-R6 extend the risk surface beyond greenfield development.** They describe failures during maintenance-phase work (refactoring, remediation, triage) rather than initial code generation. ACF-T4 (Safety Guard Erosion) covers precondition guards removed during refactoring; ACF-R6 (Scope-Limited Triage) describes a workflow-level pattern where agent triage behaviour during sessions limits the scope of investigation.

### Taxonomy extension mechanism

The taxonomy is designed for extension, not presented as a closed set. The provisional candidates illustrate the expected path from observation to inclusion. A candidate ACF entry should meet four conditions: (1) a reproducible pattern with a worked example; (2) a STRIDE mapping; (3) a risk rating; and (4) an assessment of existing detection capability. The taxonomy includes a formal submission pathway and versioning scheme — new entries use the next available number within the appropriate STRIDE category, and entries may be deprecated if model improvements or tool coverage render them obsolete. Until a formal maintenance process exists, candidate entries can be submitted through the consultation process. CISOs should monitor the taxonomy for new entries relevant to their systems.

## Control gap analysis

The following gaps are derived from the [discussion paper's gap analysis](../../pdf/threat-model-discussion-paper-community.pdf) of ISM, NIST SSDF, Essential Eight, and OWASP frameworks. ISM control references are based on the December 2025 revision.

### Gap 1: Agent output trust boundary

**What the gap is.** No ISM control explicitly addresses the artefact classification of AI-generated output. Agent-generated code is neither human-authored in-house code nor a third-party component — it fits neither established category. ISM-2074 (Rev 0, Dec-25) requires an AI usage policy, but this is a governance control, not a technical trust boundary control. The artefact integrity controls (ISM-2026/2027/2028) have no category for first-party code generated by a third-party system.

**ISM controls affected.** ISM-0401 (Secure by Design), ISM-2026/2027/2028 (artefact integrity), ISM-2074 (AI usage policy).

**Residual risk.** Agent-generated code enters codebases at the trust level of the engineer who directed the agent, rather than being treated as untrusted input requiring validation. The directing engineer's seniority launders the provenance of the machine output. The risk properties also differ from third-party components: third-party components have independent defect distributions, while agent-generated code has correlated defects from shared training data.

**ACF entries affected:** ACF-T1 (authority tier conflation), ACF-E1 (implicit privilege grant).

**Remediation priority:** Critical

### Gap 2: Review capacity scaling

**What the gap is.** ISM-2060 (Rev 0, Jun-25) and ISM-2061 (Rev 0, Jun-25) mandate code review and security-focussed peer review, but neither addresses what happens when code generation velocity exceeds review capacity. No control requires organisations to demonstrate that review remains effective under volume pressure. Even with an attentive operator, surfacing a semantic defect concealed by conventional-looking code has been observed to require four rounds of directed challenge over approximately eight minutes — suggesting that effective review of agent output demands domain-specific questioning strategies, not merely increased review time.

**ISM controls affected.** ISM-2060 (code review — ensures software meets Secure by Design principles), ISM-2061 (security-focussed peer review on critical and security-focussed components).

**Residual risk.** Review processes degrade from careful semantic review to surface-level scanning under volume pressure. ISM-2061's scope limitation compounds this: it applies to "critical and security-focussed software components," which requires the organisation to correctly identify which agent-generated code touches security-critical paths *before* the review control can be applied. The review process — which is a security control — becomes a compliance checkbox rather than an effective control.

**ACF entries affected:** ACF-D1 (finding flood), ACF-D2 (review capacity exhaustion).

**Remediation priority:** Critical

### Gap 3: Semantic boundary enforcement

**What the gap is.** No control addresses the gap between syntactic correctness and semantic correctness in the context of trust boundaries. ISM-0402 (Rev 9, Jun-25) mandates comprehensive testing using SAST, DAST, and SCA. These tools catch known vulnerability patterns and dependency risks but not context-dependent semantic correctness. Current SAST answers "does the code match known vulnerability patterns?" It does not answer whether data flows preserve authority tiers or whether trust boundaries are maintained. This is a category gap — the missing layer between "does the code match known vulnerability patterns?" and "does the code preserve the system's trust boundaries?"

**ISM controls affected.** ISM-0402 (comprehensive testing with SAST/DAST/SCA).

**Residual risk.** Thirteen of fifteen core failure modes are either undetected or only partially detected by existing tools. Both Critical-rated failure modes have zero detection in standard tooling. Existing controls assume that if code passes review and testing, it is adequate.

**ACF entries affected:** ACF-S1 (fabricated default), ACF-S3 (structural identity spoofing), ACF-T1 (authority tier conflation), ACF-T2 (silent coercion).

**Remediation priority:** Critical

### Gap 4: Correlated failure detection

**What the gap is.** No control addresses the distinct risk profile of correlated defects. Testing and review strategies are designed for independent failure distributions. When an agent generates ten functions, its errors are correlated — the same training data biases produce the same failure modes repeatedly. A "known" vulnerability class produced identically across every government codebase using the same agent is not the same risk as the same class produced sporadically by individual developers with diverse training and experience — the correlation changes the risk calculus even when the individual pattern is well understood.

**ISM controls affected.** ISM-0402 (testing), ISM-2060/2061 (review).

**Residual risk.** Finding one instance of a defect pattern does not trigger systematic scanning for the same pattern across the codebase. A single bias in the agent's training data produces correlated defects across the entire codebase — and potentially across every agency using the same model. Standard vulnerability response treats each finding independently; agent defects may require pattern-wide remediation.

**ACF entries affected:** All ACF categories.

**Remediation priority:** High

### Gap 5: Code provenance tracking

**What the gap is.** No control requires organisations to track which code was generated by AI agents versus authored by humans. ISM-2074 requires an AI usage policy but not per-artefact provenance. Without provenance, risk assessment cannot distinguish between code populations with different failure characteristics.

**ISM controls affected.** ISM-2074 (AI usage policy).

**Residual risk.** Without provenance, risk assessment cannot distinguish between code populations with different failure characteristics. Incident response cannot target agent-generated code for pattern-wide remediation. Correlated defects cannot be traced to their source. An agent-generated commit and a human-authored commit are indistinguishable in the version control system.

**ACF entries affected:** ACF-D2 (review capacity exhaustion).

**Remediation priority:** High

### Gap 6: Contracted development controls

**What the gap is.** Current acceptance criteria for contracted software focus on functional requirements, test coverage, and coding standards. They do not address semantic correctness properties — trust boundary maintenance, audit trail integrity, context-appropriate error handling. How ISM-2074's AI usage policy requirement flows down to contracted development is unclear. Existing assessment frameworks (IRAP, SOC 2, Essential Eight compliance) evaluate the contractor's security posture and process maturity, but none evaluate whether the contractor's development workflow detects agentic failure modes or whether acceptance testing covers semantic boundary properties.

**ISM controls affected.** ISM-2074 (AI usage policy), procurement and acceptance testing frameworks.

**Residual risk.** A contractor could deliver code that meets every contractual requirement while containing systematic semantic defects. When multiple agencies contract the same provider using the same agent tooling, correlated failures propagate across agency boundaries. The visibility problem compounds this: contracting agencies may have limited visibility into whether a contractor is using agentic tools, what proportion of deliverables are agent-generated, and whether the contractor's review processes address the failure modes catalogued in the taxonomy. When a contractor delivers agent-generated code, the review responsibility is ambiguous — the contractor's internal review, the agency's acceptance review, or both? If the agency relies on the contractor's review, the agency inherits the contractor's review capacity constraints and habituation dynamics.

**ACF entries affected:** All ACF categories (through supply chain propagation).

**Remediation priority:** Critical

### Gap 7: ISM-0401 enforcement mechanism

**What the gap is.** ISM-0401 (Rev 8, Jun-25) establishes that organisations should follow Secure by Design principles across the entire SDLC. Agentic failure modes could in principle be addressed as part of an organisation's Secure by Design practices. However, the control assumes a human development team that can *internalise* security principles and apply them with judgement. Agents do not internalise principles — they reproduce training data patterns. A Secure by Design practice that says "do not fabricate defaults for missing safety-critical data" is unenforceable against an agent unless encoded as a machine-checkable rule.

**ISM controls affected.** ISM-0401 (Secure by Design principles and practices throughout the SDLC).

**Residual risk.** The control's scope is correct, but its enforcement mechanism (human judgement) does not transfer to agent-generated code. Secure by Design principles that exist only as human-readable documentation are insufficient controls against AI-generated code.

**Remediation priority:** High

### Cross-framework gap assessment

The ISM gaps above are the most directly actionable for Australian Government CISOs. The discussion paper also analyses NIST SSDF, Essential Eight, and OWASP frameworks, finding consistent gaps across all of them:

:::tip[NIST SSDF (SP 800-218)]
The most relevant practice group — Produce Well-Secured Software (PW) — partially applies but assumes trainable human developers, learning from feedback, and largely independent error distributions. None of these hold for agents. NIST published SP 800-218A (July 2024) to address generative AI, but it focusses on secure practices for AI *model* development — not on the assurance of source code *generated by* AI systems.
:::

:::tip[OWASP]
OWASP Top 10 for LLM Applications (2025) primarily addresses threats *to* LLM systems. The closest entry — LLM05 (Improper Output Handling) — advises "zero-trust" validation of LLM output but does not provide comprehensive treatment of correlated defects, review capacity exhaustion, or context-inappropriate patterns. OWASP Secure Coding Practices lists defensive coding practices, but several "secure" practices in the checklist are the same anti-patterns this threat model identifies as dangerous in high-stakes contexts.
:::

:::tip[Essential Eight]
The Essential Eight is an operational security framework, not an SDLC framework. Two strategies offer indirect relevance: Application Control (graduated trust based on source) and Restrict Administrative Privileges (agents should not modify security-critical configuration without human approval). These are directional, not prescriptive.
:::

### Structural gaps at the framework level

Beyond the ISM-specific gaps above, the discussion paper identifies nine structural gaps — categories of control and analytical vocabulary that no current framework provides. The first three are foundational; the remaining gaps are difficult to address without them:

1. **A taxonomy of agentic code failure modes** grounded in established threat modelling (STRIDE or equivalent)
2. **A verification layer for semantic correctness** — the missing layer between "does the code match known vulnerability patterns?" and "does the code preserve trust boundaries, audit integrity, and failure-mode requirements?"
3. **Controls for review effectiveness at scale** — not just "is code reviewed?" but "does the review process remain effective at agent-generated volume?"
4. **Authority classification for agent output** — how should agent-generated code be treated in the system's authority model?
5. **Accreditation criteria for agentic development workflows** — what evidence must organisations provide to demonstrate that agentic coding maintains the required security posture?
6. **Vocabulary for context-dependent code weaknesses** — patterns that are correct in general but dangerous in specific security contexts, encoded in machine-readable form
7. **Correlated failure risk models** — testing and remediation strategies that account for the non-independent failure distribution of agent-generated code
8. **Governance perimeter expansion** — controls for executable logic produced by non-developers using agentic tools outside traditional SDLC channels
9. **Cross-model defect chaining** (emerging) — defects from different models may compose, where one model's failure creates preconditions for another's

:::caution[Governance perimeter]
Current frameworks scope software development controls to recognised development teams and established code repositories. Agent-generated automations, integrations, and plugins produced by analysts and operators outside these channels are not addressed by any current guidance. CISOs should assess whether non-developer AI-generated logic (SQL queries, workflow automations, scripts) falls within their governance perimeter.
:::

## Candidate ISM extensions

The following illustrative extensions are included to show that the gaps are addressable within the ISM's existing structure. The wording follows the ISM's conditional-control style and is illustrative rather than normative.

:::note[Extension to ISM-0401 (Secure by Design)]
When AI agents are used to generate code for assessed systems, the organisation's Secure by Design practices should include machine-enforceable rules for trust boundary maintenance, defensive pattern restrictions appropriate to the system's data sensitivity, and audit trail preservation requirements. Secure by Design principles that exist only as human-readable documentation are insufficient controls against AI-generated code, which does not read documentation.
:::

:::note[Extension to ISM-2060/2061 (Code Review and Security-Focussed Peer Review)]
When AI agents generate a significant proportion of code changes, the organisation should demonstrate that its code review process (ISM-2060) and security-focussed peer review process (ISM-2061) remain effective at detecting semantic defects — not merely syntactic or conventional defects — under the volume of changes produced. Evidence must include at minimum one of: measured defect escape rates, review depth audits, or demonstrated use of automated semantic pre-screening that reduces the burden on human reviewers.
:::

:::note[New control (Agent Output Trust Boundary)]
Code generated by AI agents should be treated as untrusted input requiring validation at the boundary before integration into assessed systems. The organisation should define and document the validation boundary, including what properties are verified (trust boundary maintenance, audit trail integrity, error handling appropriateness) and what evidence demonstrates the validation is effective.
:::

:::note[New control (Code Provenance)]
When AI agents are used in the development of assessed systems, the organisation should maintain records of which code was generated by AI agents, which was human-authored, and which was agent-generated then human-modified. This provenance metadata supports risk assessment, incident response, and targeted remediation when systematic agent-introduced defects are discovered.
:::

The [full discussion paper](../../pdf/threat-model-discussion-paper-community.pdf) sets out the gap analysis behind these assessment criteria.

## Recommended actions

### Immediate (weeks)

1. **Inventory AI coding tool usage** across internal teams and contracted suppliers. Determine which tools, which models, and what proportion of code is agent-generated.
2. **Deploy custom detection rules** for the four highest-risk patterns: ACF-T1 (authority tier conflation), ACF-E1 (implicit privilege grant), ACF-S1 (fabricated default), and ACF-R1 (audit trail destruction). Semgrep and CodeQL can express project-specific rules for these patterns with per-project tuning.
3. **Develop a security-focussed review checklist** aligned to the ACF failure modes. Ensure reviewers know to check: Are defaults fabricating safety-critical data? Are error handlers preserving or destroying audit trails? Is external data crossing trust boundaries without validation? Are multi-step operations atomic or partially completable?
4. **Review procurement contracts** for AI tool disclosure requirements and semantic correctness acceptance criteria.

### Short-term (months)

5. **Adopt ISM extension posture.** Implement the candidate ISM extensions described above as organisational practice, pending formal ASD/ACSC guidance: machine-enforceable Secure by Design rules (ISM-0401 extension), review effectiveness evidence (ISM-2060/2061 extension), agent output trust boundary (new control), and code provenance (new control).
6. **Update procurement clauses** to require agent tool disclosure, provenance tracking for agent-generated deliverables, and acceptance criteria that include semantic correctness properties. Address the six principles identified in the discussion paper: agent tool disclosure, provenance tracking, semantic correctness acceptance criteria, right to inspect validation controls, pattern-wide remediation obligations, and cross-agency correlation awareness.
7. **Assess correlated risk** across your supplier base — identify whether contracted suppliers serve other government clients with the same tooling stack.

### Medium-term (quarters)

8. **Evaluate semantic enforcement tooling** — purpose-built checks for authority tier flow, audit trail preservation, and fabricated defaults. Several implementation paths are described in the [discussion paper](../../pdf/threat-model-discussion-paper-community.pdf).
9. **Implement provenance tracking** for agent-generated code in your repositories.
10. **Measure and monitor review effectiveness** under agentic volume. Collect defect escape rates, review depth metrics, and automated pre-screening coverage.

## Assessment checklist

Use this checklist to work through the assessment systematically.

**Inventory**

- [ ] AI coding tools in use by internal development teams are identified and documented
- [ ] AI coding tools in use by contracted suppliers are identified (or disclosure has been requested)
- [ ] Non-developer AI-generated logic (SQL, scripts, automations) has been inventoried
- [ ] The proportion of agent-generated code in critical systems is estimated

**Detection capability**

- [ ] Custom detection rules are deployed for ACF-T1 (authority tier conflation) and ACF-E1 (implicit privilege grant) — both Critical-rated, zero existing detection
- [ ] Custom detection rules are deployed for ACF-S1 (fabricated default) and ACF-R1 (audit trail destruction — both catch-and-continue and untyped propagation forms)
- [ ] Custom detection rules address ACF-R2 (partial completion) and ACF-R5 (remediation-induced violation) — both zero existing detection
- [ ] Detection coverage has been assessed against the full [ACF Taxonomy](../../acf/), including provisional candidates and the R3a/R3b sub-mode distinction
- [ ] False positive rates for custom rules are measured and tracked

**Review process**

- [ ] Code review processes include semantic review criteria (not just syntax, style, and known vulnerability patterns)
- [ ] Review effectiveness is measured under current code generation volume
- [ ] Reviewers are trained to recognise ACF failure modes — particularly the distinction between defensive programming and defensive anti-patterns
- [ ] Security-focussed peer review (ISM-2061) scope includes identification of which agent-generated code touches security-critical paths
- [ ] Review processes account for the compounding effect — individual patterns that follow conventions but produce compound failures when combined

**Procurement and supply chain**

- [ ] Procurement contracts require disclosure of AI code generation tool usage (which tools, which models, what configuration)
- [ ] Acceptance criteria include semantic correctness properties (trust boundary maintenance, audit trail integrity, context-appropriate error handling)
- [ ] Cross-agency correlated risk through shared suppliers has been assessed
- [ ] Right to inspect validation controls for agent-generated code is established in contracts
- [ ] Pattern-wide remediation obligations are addressed in contractor agreements
- [ ] Notification framework for cross-client systematic defects has been considered

**Control gap mapping**

- [ ] Current ISM baseline has been reviewed against the seven gaps identified above
- [ ] Gap remediation priorities have been assigned and resourced
- [ ] ISM extension posture has been adopted for agent-generated code pending formal guidance
- [ ] Controls are proportionate to the organisation's position on the [autonomy spectrum](../autonomy-assessment/)
- [ ] ISM-0401 Secure by Design practices include machine-enforceable rules, not just human-readable documentation

**Ongoing governance**

- [ ] Code provenance tracking is in place or planned
- [ ] Pattern-wide scanning is triggered when an agent-generated defect is discovered (not just instance-level remediation)
- [ ] Review effectiveness metrics are collected and reported periodically
- [ ] Correlated failure risk is reassessed when supplier relationships or agent tooling change
- [ ] Maintenance-phase agent work (refactoring, remediation, triage) is included in the risk assessment, not just greenfield code generation
- [ ] Non-developer AI-generated logic is within the governance perimeter

## Related resources

- [ACF Taxonomy](../../acf/) — fifteen core failure modes plus five provisional candidates, with STRIDE mapping, risk ratings, and detection status
- [Full Discussion Paper](../../pdf/threat-model-discussion-paper-community.pdf) — the complete threat model and evidence base
- [IRAP Assessor Checklist](../irap-checklist/) — assessment-ready checklist for system evaluation
- [Autonomy Assessment](../autonomy-assessment/) — self-assessment tool for positioning on the autonomy spectrum
