---
tags:
  - irap-assessor
  - assessment
  - recommendations
---

# IRAP Assessor Checklist

## Purpose

This checklist supports IRAP assessors evaluating systems that may include AI-generated code. It provides structured assessment criteria for the semantic defect class described in the [discussion paper](../understand/paper.md) — code that is syntactically correct, passes all automated checks, and does the wrong thing in the system's institutional context.

The checklist is designed to be self-sufficient. An assessor can use it during an assessment without opening the full paper.

## Scope

This checklist addresses the **semantic defect class specific to AI-generated code** — failure modes that arise from agents applying training-data patterns uniformly across contexts that require different failure semantics. It does not replace existing ISM controls for general software security, which remain necessary and are assumed to be assessed through standard procedures.

The checklist covers:

- Whether AI-generated code is present in the assessed system
- Whether controls address the distinct risk properties of agent-generated code — correlated failures, no persistent learning across sessions, uniform surface quality that defeats reviewer calibration signals, and task-frame reconstruction under context pressure
- Whether detection capability exists for semantic defects that pass all conventional automated checks
- Whether review processes remain effective under agent-generated volume
- Whether contracted development pipelines introduce correlated risk across agency boundaries

It does not cover:

- General software development security (addressed by existing ISM controls)
- AI model security — threats *to* AI systems (addressed by OWASP Top 10 for LLM Applications and similar frameworks)
- Agentic AI system behaviour — threats from AI agents acting autonomously in production (a distinct risk category)

## Pre-assessment questions

Ask the system owner or development lead the following before beginning the technical assessment. These establish whether the agentic code risk class is relevant to the system under assessment.

**AI usage in development**

1. Is AI being used in the development of this system — directly by the organisation's development team, or through contracted suppliers?
2. What AI coding tools are in use? (e.g., inline autocomplete, IDE-integrated agents, autonomous agents.) At what autonomy level? (See [Autonomy Self-Assessment](autonomy-assessment.md) for the spectrum.)
3. What proportion of the codebase is estimated to be agent-generated?
4. Can the organisation distinguish agent-generated code from human-authored code in the repository? (Provenance tracking.)
5. Are multiple AI models in use, or is there a single-model dependency? If multiple, do the models share training lineages? (Model monoculture creates correlated failure risk across the codebase and, where the same model is used by contracted suppliers, across agency boundaries.)

**Contracted development**

6. Are contracted suppliers or systems integrators using AI coding tools in deliverables for this system?
7. Do contracts require disclosure of AI tool usage, including which tools, which models, and what configuration?
8. Do contracts include acceptance criteria for semantic correctness properties (trust boundary maintenance, audit trail integrity, context-appropriate error handling)?
9. Does the agency have visibility into whether its contracted suppliers serve other government clients with the same agent tooling stack? (Correlated risk through interconnected delivery chains.)

**Controls in place**

10. What controls are in place specifically for AI-generated code, beyond standard SDLC controls?
11. Is there detection capability for semantic defects — code that passes all conventional checks but does the wrong thing in context?
12. Has the organisation assessed its exposure against the [ACF Taxonomy](../understand/taxonomy.md) failure modes?
13. Has the organisation defined which code paths in the system are high-stakes (fail-fast, audit-critical, classification-handling) versus standard defensive paths — and are those distinctions encoded in machine-readable form or left in documentation and reviewer memory?

If the answers to questions 1 and 6 are both "no" and the assessor has confidence in those answers, the remainder of this checklist may not be required for this assessment. If AI is in use — directly or through contractors — proceed with the full checklist.

## Assessment checklist

### Trust boundary controls

Agent-generated code should be treated as untrusted input requiring validation at the boundary before integration into the codebase. The agent is an external system; its output has not been validated against the system's security requirements regardless of the directing engineer's seniority. The directing engineer's authority is relevant to the *decision to accept* after review, not to the *trust level of the code before review*. Without this distinction, the authority of the human operator launders the provenance of the machine output — precisely the kind of implicit trust escalation that the authority tier model is designed to prevent. Assess whether the organisation has established this boundary.

- [ ] **Agent output classification.** Is agent-generated code treated as untrusted input requiring validation, or does it inherit the trust level of the engineer who directed the agent? (The appropriate analogy is not "code written by a trusted senior engineer" but "code submitted to the repository by an external contributor whose competence is plausible but unverified.")
- [ ] **Fine-tuned model posture.** If the organisation uses a model fine-tuned on its own codebase, does it still apply full validation? (Fine-tuning changes the prior probability of correctness; it does not change the epistemic status of the output. Validated status requires passing through review and enforcement — an event, not a property of the generating tool.)
- [ ] **Validation boundary.** Is there a defined validation boundary between agent generation and code integration? Does the boundary include three layers — conventional checks (lint, type, test, SAST), semantic enforcement (authority tier flow, audit trail, defaults), and human review (meaning, exceptions, architecture)?
- [ ] **Semantic validation.** Does validation include semantic checks (authority tier flow, audit trail preservation, fabricated default detection, validation-boundary crossings), not just conventional checks (syntax, types, linting, known vulnerability patterns)? The core semantic failure modes pass all conventional checks.
- [ ] **Quarantine on failure.** Is code that fails validation rejected, or is it silently corrected? Are rejections recorded? Is the original agent output preserved for audit, even if modified during review? (No silent coercion — agent code is not silently "fixed up" by reviewers; changes are explicit and recorded.)
- [ ] **Attestation.** Does the review process include an attestation step — the reviewer attests that validation was meaningful, not rubber-stamped?

### Authority tier controls

The authority tier model distinguishes between data of different trust levels — from authoritative internal data (Tier 1) through semantically validated (Tier 2) and shape-validated (Tier 3) to unvalidated external data (Tier 4). Agent-generated code characteristically collapses this model from both directions: giving Tier 4 data more authority than it has earned (defaults and coercion allow unvalidated data to cross inward) while treating Tier 1 data as more negotiable than the tier model permits. Assess whether the system maintains these distinctions.

- [ ] **Data provenance classification.** Is data classified by provenance — is there a distinction between authoritative internal data and unvalidated external data in the system's architecture?
- [ ] **Tier separation in code.** Does agent-generated code maintain the separation between authority tiers, or does it treat data from different tiers interchangeably? (ACF-T1: authority tier conflation — Critical risk, no existing detection.)
- [ ] **Tier 2 vs Tier 3 distinction.** Does the system distinguish between semantically validated data (Tier 2 — values present, correctly typed, and satisfying business rules) and shape-validated data (Tier 3 — fields present and types correct, but values not yet domain-checked)? Treating shape-validated data as semantically validated is a specific and common source of defects in high-stakes code paths.
- [ ] **Serialisation boundary awareness.** Does the system re-establish trust when authoritative data crosses serialisation boundaries (database writes/reads, API calls, message queues)? A Tier 1 record written to a database and read back enters at unvalidated status until its integrity is re-established. The re-establishment process may use provenance evidence rather than full Tier 4 validation, but the data's authority must be explicitly restored.
- [ ] **Default value policy.** Is there a policy for when default values are acceptable versus when missing data must be surfaced as a failure? Are agents constrained by this policy through machine-enforceable rules? (The distinction between "I don't know" and "the default" has different consequences in classification, access control, and evidentiary contexts. The same `.get()` pattern is correct in a weather app defaulting to GPS location, catastrophic in a mail system defaulting a missing classification to OFFICIAL, and a patient safety risk in a clinical system defaulting a missing allergy field to an empty list — because the semantic meaning of absence differs across domains.)
- [ ] **Bidirectional collapse detection.** Is the organisation aware of the bidirectional authority collapse pattern — simultaneously too permissive at the perimeter (unvalidated external data accepted without boundary discipline) and too casual at the core (authoritative internal data defaulted or coerced rather than treated as integrity-critical)?
- [ ] **Internal state fabrication.** Does the organisation check for fabrication of its own operational data — telemetry, run identifiers, latency measurements, audit metadata? (When `self._run_id or ""` replaces a `None` run ID with an empty string, the system fabricates observability data. Operators cannot distinguish "instantaneous" from "unmeasured" or "initialised" from "broken".)

### Detection controls

Assess whether the organisation has detection capability for the failure modes most relevant to their system's risk profile. Of the fifteen core ACF failure modes, thirteen are undetected or only partially detected by existing tools — including both Critical-rated entries.

- [ ] **Critical failure mode coverage.** Are there detection rules for the two Critical-rated ACF patterns: ACF-T1 (authority tier conflation — no existing tool detects it) and ACF-E1 (implicit privilege grant — no existing tool detects it)? These require purpose-built tooling; no widely-deployed tool provides coverage.
- [ ] **High-risk failure mode coverage.** Are there detection rules for the High-rated ACF patterns: ACF-S1 (fabricated default), ACF-R1 (audit trail destruction — both form (a) catch-and-continue and form (b) untyped propagation), ACF-R2 (partial completion — no existing detection), ACF-R3 (verification displacement — R3a has partial detection, R3b compensating control dependency has no practical detection), ACF-R5 (remediation-induced violation — no existing detection), ACF-S2 (hallucinated field access), ACF-S3 (structural identity spoofing), ACF-T3 (unstructured signal parsing), and ACF-E2 (unvalidated delegation)?
- [ ] **Detection coverage breadth.** What proportion of the fifteen core ACF failure modes does the organisation have detection capability for? (Reference: four have no existing detection — ACF-T1, ACF-R2, ACF-R5, ACF-E1; ACF-R3b (compensating control dependency) also has no practical detection. Nine core entries have partial detection; two are process threats requiring process controls — ACF-D1, ACF-D2.)
- [ ] **Taint analysis capability.** Does the organisation have taint analysis capability — tracing data from external sources to internal sinks to verify that validation boundaries are crossed? This is the core detection mechanism for ACF-T1 (authority tier conflation) and ACF-E1 (implicit privilege grant), both Critical-rated.
- [ ] **Unstructured signal parsing detection.** Are there rules to flag control-flow or classification decisions made by substring matching on unstructured text (error messages, log output, human-readable descriptions) rather than on typed, structured fields? (ACF-T3: silent reclassification when error message wording changes.)
- [ ] **Audit trail destruction detection — both forms.** Does detection cover both form (a) — broad exception handlers that catch-and-continue around audit-critical operations — and form (b) — audit-critical operations that propagate failures as untyped exceptions, bypassing the structured handling path? (Form (b) is structurally harder to detect: the absence of a typed wrapper, not the presence of a catch block.)
- [ ] **R1 form composition awareness.** Is the organisation aware that forms (a) and (b) of audit trail destruction can compose across separately-authored code — an untyped exception from one agent lands in a catch-all handler written by another agent or in a different session, producing a silent audit trail gap that neither detection rule in isolation would flag?
- [ ] **Verification displacement detection.** Are there checks for agent-generated tests that verify mock or stub behaviour rather than real system behaviour (ACF-R3a)? Detection indicators include: tests whose central objects bypass the project's standard test factories, tests where mock setup mirrors code under test (tautological assertions), and tests that assert on mock return values rather than system behaviour.
- [ ] **Remediation-induced violation awareness.** Does the review process treat remediation commits with the same or higher scrutiny as new code? (ACF-R5: an agent fixing one violation may introduce a different violation in the fix itself. The implicit assurance signal of a "fix" commit reduces reviewer scrutiny.)
- [ ] **False positive management.** Are false positive rates measured per detection rule? Are rates sustainable — i.e., not causing reviewer habituation and finding dismissal? (The recommended precision floor is 80% — below this, a rule should not earn blocking status in CI.)
- [ ] **Correlated failure scanning.** When an agent-generated defect is discovered, does the organisation scan for the same pattern across the codebase, or is remediation instance-by-instance? (Agent errors are correlated, not independent — a single systematic bias produces the same failure mode repeatedly.)
- [ ] **Cross-model defect composition.** If multiple AI models are in use, has the organisation considered whether distinct defects from different models could compose? (Model A omits a validation boundary; Model B, encountering the unvalidated data, adds a `.get()` default to handle its absence "gracefully" — the composed outcome is worse than either defect alone.)
- [ ] **Tool-on-tool conflict management.** If semantic enforcement tooling is deployed alongside standard linters, is there a defined precedence hierarchy? (Agents resolve conflicting tool directives by the path of least resistance — often the configuration that silences the semantic finding.) Is there a requirement for human review of agent-authored allowlist or suppression entries?

### Review controls

Assess whether the code review process provides meaningful assurance for agent-generated code, not just compliance with ISM-2060/2061. The review model's core assumptions — manageable volume, author-explainable intent, variable surface quality as a calibration signal, feedback that improves the author — are all violated by agent-generated code.

!!! warning "The core asymmetry"
    Agent-generated code has uniformly high surface quality regardless of semantic correctness. Dangerous patterns follow the same conventions that reviewers are trained to approve: a well-structured `.get()` with a sensible default, a clean `try/except` with logging. The reviewer's natural calibration signal — "this code looks sloppy, I should look more carefully" — is absent, and the surface quality actively works against scrutiny.

- [ ] **Semantic review capability.** Does the review process include semantic review — evaluation of whether the code does the right thing in the system's institutional context, not just whether it is syntactically correct and follows conventions? (Agent code follows conventions precisely; the dangerous patterns follow established good practice applied without contextual judgment.)
- [ ] **Review effectiveness under volume.** Is there evidence that the review process remains effective at the volume of agent-generated code being produced? (Evidence may include: measured defect escape rates, review depth audits, automated semantic pre-screening coverage. ISM-2060 mandates code review; it does not address what happens when generation velocity exceeds review capacity.)
- [ ] **Review-to-generation ratio.** Is the ratio of review time to generation time sustainable? Has the organisation identified whether review quality has degraded as agent-generated volume has increased? (The habituation effect — automation bias — means reviewers shift from "verify this code is correct" to "check this code isn't obviously wrong.")
- [ ] **Automation bias evidence.** Is the organisation aware of the automation bias research? (Perry et al. found developers with AI coding access produced less secure code while rating it more secure. The METR RCT found a 43-percentage-point gap between predicted speed improvement and measured outcome.)
- [ ] **Reviewer training.** Are reviewers trained to recognise ACF failure modes — particularly the distinction between defensive programming (good practice in most contexts) and defensive anti-patterns (catastrophic in high-stakes contexts where silent data corruption is worse than a crash)?
- [ ] **Intent-based vs. outcome-based review.** Has the review process adapted to the fact that intent-based review ("why was this written this way?") is meaningless for agent code? The review must be outcome-based: "is the behaviour correct for this context?" The agent has no design intent to interrogate.
- [ ] **Parallelisation awareness.** When agents assist in producing multiple interdependent artefacts simultaneously (specification, implementation, tests, policy documents), does the review process cover cross-artefact semantic consistency? (Semantic inconsistencies *between* artefacts are invisible when no single review pass covers all of them.)
- [ ] **Advisory fatigue mitigation.** Has the organisation recognised that the traditional "warn first, enforce later" adoption strategy for security tooling is ineffective for agent-generated code? (Agents require enforcement at the boundary before code enters the repository, not feedback over time which depends on learning that agents do not retain across sessions.)

### Threat landscape awareness

Assess whether the organisation understands the structural properties of the agentic code threat — not just individual failure modes, but the qualitative differences from human-authored code that change the risk calculus.

- [ ] **Threat model distinction.** Does the organisation distinguish between the supply-chain threat ("the AI might write malicious code") and the semantic threat ("the AI writes code that follows good practice in the wrong context")? The semantic threat is the more dangerous one — it is not adversarial, it largely falls outside existing detection, and it scales with the benefit.
- [ ] **Non-adversarial nature.** Does the organisation understand that the threat is not adversarial? The agent produces its best output based on training data overwhelmingly composed of non-high-stakes code. The problem is not agent quality — it is the mismatch between what "good practice" means in most software and what it means in high-stakes code paths.
- [ ] **Limited persistent learning.** Does the organisation account for the fact that agents have no persistent memory across sessions? Every correction must be encoded as a machine-readable rule; the agent does not learn the principle behind the correction. The governance model must shift from "train and trust" to "detect and enforce."
- [ ] **Correlated failure awareness.** Does the organisation understand that agent errors are correlated, not independent? A single systematic bias produces the same failure mode across the entire codebase. Testing and review strategies designed for independent failure distributions are structurally inadequate.
- [ ] **Model monoculture risk.** Has the organisation assessed whether using the same model (or models with overlapping training lineages) across multiple projects or through multiple contractors creates correlated failure risk that extends beyond individual codebases? Discovering a systematic defect in one codebase should trigger cross-codebase scanning.
- [ ] **Training-data reinforcement loop.** Is the organisation aware that agent-generated code is entering training corpora for future models? The defensive-pattern bias may deepen over model generations as agent output becomes a larger share of training data. Alignment training (RLHF) reinforces the same bias through a separate mechanism.
- [ ] **Two failure layers.** Does the organisation distinguish between context collapse during generation (model loses context in a long session — addressable through session management) and training-distribution bias (model's priors encode defensive patterns as universally correct — persists across sessions and requires different controls)? A control that works against one layer may provide false reassurance against the other.
- [ ] **Task-frame reconstruction.** Is the organisation aware that agents under context pressure can produce output consistent with a different understanding of the task than the one originally specified? (Observable in tests "fixed" by replacing real dependencies with mocks — the agent resolves the problem by redefining what problem it is solving.)
- [ ] **Absence of incidents.** Does the organisation understand that the absence of reported incidents does not imply absence of impact? The failure modes described — silent data corruption, trust boundary violations masked by defensive patterns, audit trails recording fabricated defaults as real values — are specifically the kind that do not produce observable incidents. The question is not "has this caused a breach?" but "would we know if it had?"

### STRIDE mapping assessment

Assess whether the organisation has mapped the agentic code threat to STRIDE categories and understands how the individual failure modes compound.

- [ ] **Spoofing (S).** Has the organisation assessed exposure to competence spoofing — code that *appears* to handle data correctly but operates on fabricated or default values? (ACF-S1: fabricated default; ACF-S2: spurious field access masked by `getattr()` with default; ACF-S3: structural identity spoofing via `hasattr()` as a privilege gate.)
- [ ] **Tampering (T).** Has the organisation assessed exposure to authority tier conflation — external data used in internal contexts without validation? (ACF-T1: authority tier conflation — Critical; ACF-T2: silent coercion hiding data quality issues; ACF-T3: control-flow decisions based on substring matching of unstructured error text.)
- [ ] **Repudiation (R).** Has the organisation assessed exposure to audit trail destruction — error handling that prevents failures from reaching the audit system? (ACF-R1: audit trail destruction in two forms; ACF-R2: partial completion without rollback; ACF-R3: verification displacement producing false assurance; ACF-R5: remediation commits that introduce new violations.)
- [ ] **Information Disclosure (I).** Has the organisation assessed exposure to verbose error responses — error handlers exposing database schemas, file paths, query parameters, and library versions? (ACF-I1: verbose error response — agents produce maximum-context error messages by default across every service.)
- [ ] **Denial of Service (D).** Has the organisation assessed whether the volume of agent-generated code overwhelms review processes? (ACF-D1: finding flood causing rubber-stamping; ACF-D2: review capacity exhaustion degrading review from active verification to passive scanning.) These are process threats, not code patterns — they require process controls.
- [ ] **Elevation of Privilege (E).** Has the organisation assessed exposure to implicit privilege grants — external system assertions accepted without independent verification? (ACF-E1: implicit privilege grant — Critical; ACF-E2: unvalidated delegation — user-supplied parameters used directly in privileged operations.)
- [ ] **Compounding effect.** Has the organisation considered how these categories compound? (Authority tier conflation creates the conditions for implicit privilege grant; errors are caught by broad handlers, destroying the audit trail; defaults are substituted, spoofing data integrity; review volume pressure means the pattern is not detected. Each individual pattern follows conventions generally regarded as good practice.)

### Gap analysis assessment

Assess whether the organisation has identified and documented the structural gaps between current guidance and the agentic code threat.

- [ ] **ISM gap awareness.** Has the organisation assessed which ISM controls provide partial coverage and where assumptions break down for agent-generated code? (ISM-0401 assumes human developers who internalise principles; ISM-2060 does not address review effectiveness degradation; ISM-0402 SAST addresses known vulnerability patterns, not context-dependent semantic correctness.)
- [ ] **Agent output trust boundary.** Has the organisation recognised that no current ISM control explicitly addresses the artefact classification of AI-generated output? (ISM-2074 requires an AI usage policy — a governance control, not a technical trust boundary control.)
- [ ] **Review capacity scaling.** Has the organisation assessed whether its review process remains effective at current agent-generated volume? (No ISM control requires demonstration that review remains effective under volume pressure.)
- [ ] **Semantic boundary enforcement gap.** Has the organisation recognised the gap between syntactic correctness and semantic correctness in the context of trust boundaries? (No ISM control addresses context-dependent semantic correctness. Existing controls assume that if code passes review and testing, it is adequate.)
- [ ] **Code provenance tracking.** Does the organisation track which code was generated by AI agents vs. authored by humans vs. agent-generated then human-modified? (No ISM control requires per-artefact provenance. Without provenance, risk assessment cannot distinguish between code populations with different failure characteristics.)
- [ ] **Correlated failure risk models.** Has the organisation adopted testing and remediation strategies that account for the non-independent failure distribution of agent-generated code?
- [ ] **Governance perimeter.** Has the organisation considered executable logic produced by non-developers using agentic tools outside traditional SDLC channels? (Analysts and operators producing automations, integrations, and plugins are not addressed by current software development guidance.)
- [ ] **NIST SSDF gap.** Is the organisation aware that NIST SP 800-218A (the AI supplement to the SSDF) addresses secure practices for AI *model* development, not the assurance of source code *generated by* AI systems — the specific gap this threat model addresses?
- [ ] **Detection coverage inversion.** Is the organisation aware that detection coverage is worst where risk is highest? Of fifteen core ACF entries, four have no detection capability (including both Critical-rated entries), nine have only partial detection, and two are process threats requiring process controls.

### Procurement controls

For systems with contracted development components, assess whether procurement controls address the agentic code risk. Contracted service providers are the dominant delivery channel for most Australian Government software — any threat model that addresses only in-house development addresses the minority case.

!!! danger "Structural risk through interconnected delivery chains"
    When multiple agencies contract the same provider, and that provider uses the same agent tooling and prompts across engagements, the correlated failure problem extends across agency boundaries through the contractor — even if the agencies have no direct relationship. A systematic defect introduced by a contractor's agent may propagate to every agency that contractor serves.

- [ ] **AI tool disclosure.** Do contracts require disclosure of AI code generation tool usage — which tools, which models, and what configuration?
- [ ] **Provenance tracking.** Do contractors maintain and provide provenance records for agent-generated code in deliverables?
- [ ] **Semantic acceptance criteria.** Do acceptance criteria include semantic correctness properties — trust boundary maintenance, classification handling, audit trail integrity — not just functional requirements and test coverage? (A contractor could deliver code that meets every contractual requirement while containing systematic ACF-pattern violations.)
- [ ] **Right to inspect validation controls.** Can the agency request evidence that agent-generated code was subject to validation controls addressing the failure modes in the ACF taxonomy?
- [ ] **Cross-agency risk awareness.** Has the agency assessed whether contracted suppliers serve other government clients with the same tooling stack, and considered the correlated risk this creates? (Concentration risk through interconnected delivery chains — the topology alone is sufficient to identify the vulnerability.)
- [ ] **Pattern-wide remediation.** Do contracts include obligations for pattern-wide remediation when a systematic agent-induced defect is discovered — not just instance-by-instance fixes? Does the contract address notification to other affected clients (which may require a structured disclosure framework analogous to coordinated vulnerability disclosure)?
- [ ] **Acceptance testing coverage.** Do acceptance testing procedures verify trust boundary maintenance, classification handling, and audit trail integrity — properties that existing acceptance criteria (functional requirements, test coverage, coding standards) do not address?
- [ ] **Review responsibility clarity.** Is the review responsibility clearly allocated — the contractor's internal review, the agency's acceptance review, or both? If the agency relies on the contractor's review, it inherits the contractor's review capacity constraints and habituation dynamics.
- [ ] **AI usage policy flow-down.** Does ISM-2074's AI usage policy requirement flow down to contracted development? (The control applies to the agency's own use; how it flows down to contractors is unclear in current guidance.)

## Verification properties for semantic enforcement

If the system claims to have semantic enforcement capability — automated tooling that checks for the failure modes described in this checklist — the following six properties determine whether that tooling is assessable. These are adapted from the verification properties of a prototype semantic enforcement framework.

### 1. Golden corpus

The enforcement tool maintains a curated set of known-good and known-bad code specimens that it must correctly classify. The corpus is version-controlled and CODEOWNERS-protected. An assessor can run the corpus independently and compare results against expected outcomes. Without a golden corpus, the tool's claimed detection capability is unverifiable.

**What to verify:** Request the corpus. Run it against the tool. Compare results to expected verdicts. Minimum: three true positives and two true negatives per rule.

### 2. Self-hosting

Each enforcement tool's own source passes the rules that tool implements. A tool that cannot enforce its own rules on itself lacks credibility.

**What to verify:** Confirm the tool is used in its own CI pipeline. Check that its own source passes its own rules.

### 3. Measured precision

The false positive rate is measured, tracked, and published per rule and per context. A tool with unmeasured precision cannot demonstrate that its findings are trustworthy. The recommended floor is 80% precision — below this, a rule should not earn blocking status in CI.

**What to verify:** Request precision measurements per rule. Verify they are current and tracked over time. Check that rules below the precision floor are not blocking CI.

### 4. Measured recall

The false negative rate is measured against the golden corpus and published. A tool that misses more than 30% of known-bad specimens cannot justify its governance burden. The recommended floor is 70% recall.

**What to verify:** Request recall measurements per rule. Verify against the golden corpus results.

### 5. Deterministic output

Identical input produces byte-identical output. No randomness, no model inference, no non-deterministic ordering. An assessor who runs the tool twice on the same codebase and gets different results cannot certify the tool.

**What to verify:** Run the tool twice on the same codebase. Compare output byte-for-byte.

### 6. Taint propagation correctness

The tool correctly tracks data provenance across function boundaries and merge points. Data flowing from an untrusted source to a trusted sink without passing through required validation boundaries produces a finding. This is the core value claim of semantic enforcement — and it requires independent verification.

**What to verify:** Request taint-flow test specimens. Verify that data from Tier 4 (unvalidated external) sources reaching Tier 1 (authoritative internal) sinks without validation produces a finding. Verify that validated data paths do not produce false positives.

## Evidence requirements

For each checklist area, request the following evidence from the system owner.

| Assessment Area | Evidence to Request |
|----------------|-------------------|
| **Trust boundary controls** | Documentation of the validation boundary; CI/CD pipeline configuration showing enforcement gates; sample SARIF or equivalent output from semantic checks; evidence that original agent output is preserved for audit; attestation records |
| **Authority tier controls** | Architecture documentation showing data classification by provenance; code review records demonstrating tier-aware review; evidence of serialisation boundary re-validation; default value policy documentation; Tier 2 vs Tier 3 distinction in data flow diagrams |
| **Detection controls** | Custom rule configurations; precision and recall measurements per rule; SAST/semantic tool output covering ACF failure modes; tool precedence hierarchy documentation; correlated-failure scanning procedures; taint analysis capability evidence |
| **Review controls** | Defect escape rate measurements; review depth audit results; automated pre-screening coverage metrics; reviewer training records covering ACF failure modes and defensive anti-pattern recognition; evidence of outcome-based (not intent-based) review practices |
| **Threat landscape awareness** | Risk assessment documentation distinguishing semantic threats from supply-chain threats; evidence of correlated failure awareness; documentation of which failure layers (context collapse vs training-distribution bias) each control addresses |
| **STRIDE mapping** | Threat model documentation mapping agentic code risks to STRIDE categories; compounding scenario analysis; evidence that both code-level and process-level threats are addressed |
| **Gap analysis** | Gap assessment against ISM, NIST SSDF, and OWASP; documented remediation plan for identified gaps; detection coverage assessment against ACF taxonomy |
| **Procurement controls** | Contract clauses for AI tool disclosure; acceptance testing procedures covering semantic correctness; supplier AI tool inventory; right-to-inspect provisions; pattern-wide remediation obligations; review responsibility allocation |
| **Semantic enforcement** | Golden corpus and independent run results; precision/recall measurements per rule; deterministic output verification; taint-flow test results; self-hosting evidence |

Where evidence is unavailable, document the gap. The absence of evidence for a specific control is itself an assessment finding — it indicates the control either does not exist or is not operating with sufficient rigour to produce assessable evidence.

## ISM control mapping

The following ISM controls are most relevant to the agentic code risk class. The gap column identifies where the control's assumptions break down for agent-generated code.

| ISM Control | Description | Agentic Code Gap |
|-------------|-------------|-----------------|
| **ISM-0401** (Rev 8, Jun-25) | Secure by Design principles throughout the SDLC | Assumes human developers who internalise principles. Agents reproduce training-data patterns — Secure by Design practices are unenforceable unless encoded as machine-checkable rules |
| **ISM-2060** (Rev 0, Jun-25) | Code reviews ensure Secure by Design principles | Does not address review effectiveness degradation under agent-generated volume. No requirement to demonstrate review remains effective at scale. Even under favourable conditions, surfacing a semantic defect concealed by conventional-looking code may require sustained multi-step probing |
| **ISM-2061** (Rev 0, Jun-25) | Security-focussed peer reviews on critical components | Requires correct identification of which agent-generated code touches security-critical paths. Assumes peer reviewer has institutional knowledge for trust boundary evaluation — knowledge that may not be documented in machine-readable form |
| **ISM-0402** (Rev 9, Jun-25) | Comprehensive software testing (SAST, DAST, SCA) | Current SAST addresses known vulnerability patterns, not context-dependent semantic correctness. Semantic boundary testing is a distinct control category. No standard tool category is designed to detect semantic defects |
| **ISM-2026/2027/2028** (Jun-25) | Software artefact integrity | Agent-generated code fits neither human-authored nor third-party categories. No artefact classification for first-party code generated by a third-party system. Third-party components have independent defect distributions; agent-generated code has correlated defects |
| **ISM-2074** (Rev 0, Dec-25) | AI usage policy | Governance control, not a technical trust boundary control. Does not address per-artefact provenance or flow-down to contracted development |

No current ISM control addresses: agent output as a trust boundary, review capacity scaling under agent-generated volume, semantic boundary enforcement, correlated failure detection, or code provenance tracking. These represent structural gaps in coverage for the agentic code risk class.

## ACF taxonomy detection summary

The following table summarises the detection status of each core ACF failure mode. This supports the detection controls section of the checklist.

| ID | Name | STRIDE | Risk | Detection | Key Assessment Point |
|----|------|--------|------|-----------|---------------------|
| ACF-S1 | Fabricated Default | S | High | Partial | `.get()` and `getattr()` with defaults on authority-tiered data; `or` fallbacks on telemetry/audit metadata |
| ACF-S2 | Spurious Field Access | S | High | Partial | `getattr()` masking access to nonexistent fields; depends on type annotation coverage |
| ACF-S3 | Structural Identity Spoofing | S | High | Partial | `hasattr()` used as capability/privilege gate instead of `isinstance()` |
| ACF-T1 | Authority Tier Conflation | T | **Critical** | **None** | External data entering internal stores without validation boundary — requires taint analysis |
| ACF-T2 | Silent Coercion | T | Medium | Partial | Type coercion across trust boundaries hiding data quality issues |
| ACF-T3 | Unstructured Signal Parsing | T | High | Partial | Substring matching on error messages for control-flow/classification decisions |
| ACF-R1 | Audit Trail Destruction | R | High | Partial | Two forms: (a) catch-and-continue; (b) untyped propagation bypassing structured handlers |
| ACF-R2 | Partial Completion | R | High | **None** | Non-atomic multi-step operations without rollback |
| ACF-R3 | Verification Displacement | R | High | Partial/None | R3a: mock substitution in tests; R3b: compensating control dependency (no practical detection) |
| ACF-R5 | Remediation-Induced Violation | R | High | **None** | Fix commits introducing different violations from the one resolved |
| ACF-I1 | Verbose Error Response | I | Medium | Partial | Internal system details in error responses — known class, agent-amplified |
| ACF-D1 | Finding Flood | D | High | N/A | Process threat: static analysis volume overwhelming reviewers |
| ACF-D2 | Review Capacity Exhaustion | D | High | N/A | Process threat: generation velocity exceeding review capacity |
| ACF-E1 | Implicit Privilege Grant | E | **Critical** | **None** | External assertions accepted without independent verification — requires taint analysis |
| ACF-E2 | Unvalidated Delegation | E | High | Partial | User-supplied parameters used directly in privileged operations |

!!! warning "Provisional candidates (not core taxonomy)"
    Five additional failure modes are catalogued as provisional candidates: ACF-S4 (Type Annotation Erosion), ACF-S5 (Type Structure Avoidance), ACF-T4 (Safety Guard Erosion), ACF-R4 (Context Handover Assumption), and ACF-R6 (Scope-Limited Triage). These are observed but not yet validated for core classification and should not be treated as compliance requirements.

## Related resources

- [Full Discussion Paper](../understand/paper.md) — the complete threat model, gap analysis, and evidence base
- [ACF Taxonomy](../understand/taxonomy.md) — the fifteen core failure modes (plus five provisional candidates) with STRIDE mapping, code examples, detection characteristics, and taxonomy extension mechanism for community-submitted entries
- [CISO Assessment](ciso-assessment.md) — the control-gap assessment for CISOs and security advisors, with ISM mapping and remediation priorities
- [Autonomy Self-Assessment](autonomy-assessment.md) — the autonomy spectrum for AI coding tools, referenced in pre-assessment question 2
