---
tags:
  - all-audiences
  - reference
  - acf
---

# ACF Taxonomy: Agentic Code Failure Modes

A structured catalogue of failure modes observed in compliance-constrained agentic development, mapped to STRIDE categories, with risk ratings and detection status. The taxonomy currently contains 15 core entries and 5 provisional candidates; the [extension mechanism](#taxonomy-extension-mechanism) at the end of this page describes how to propose new entries.

!!! tip "How to use this page"
    **Policy readers:** The summary tables and detection capability summary below provide a complete overview without code fluency. For the full detailed entries with code examples and detection approaches, see [Appendix A of the discussion paper](paper.md#appendix-a-agentic-code-failure-taxonomy). For the five highest-priority review questions derived from these patterns, see the [Practical Guide](../respond/practical-guide.md).

---

## Summary by STRIDE Category

=== "Spoofing (S)"

    Code misrepresents its competence, data provenance, or structural identity.

    | ID | Name | Risk | Detection | Type |
    |---|---|---|---|---|
    | **ACF-S1** | [Fabricated Default](#acf-s1-fabricated-default) | High | Partial | Code Pattern |
    | **ACF-S2** | [Spurious Field Access](#acf-s2-spurious-field-access) | High | Partial | Code Pattern |
    | **ACF-S3** | [Structural Identity Spoofing](#acf-s3-structural-identity-spoofing) | High | Partial | Code Pattern |
    | *ACF-S4* | [Type Annotation Erosion](#acf-s4-type-annotation-erosion) *(provisional)* | High | Partial | Code Pattern |
    | *ACF-S5* | [Type Structure Avoidance](#acf-s5-type-structure-avoidance) *(provisional)* | High | Partial | Code Pattern |

    **Common mechanism:** The AI reaches for the statistically most common pattern from its training data — `.get()` with defaults, `getattr()` with fallbacks, `hasattr()` as a capability gate — which is genuinely correct in the vast majority of codebases but wrong in contexts where absence of data, structural identity, or type safety has institutional consequences.

=== "Tampering (T)"

    Data integrity is compromised through silent coercion, trust boundary violations, or unstructured parsing.

    | ID | Name | Risk | Detection | Type |
    |---|---|---|---|---|
    | **ACF-T1** | [Authority Tier Conflation](#acf-t1-authority-tier-conflation) | **Critical** | **None** | Code Pattern |
    | **ACF-T2** | [Silent Coercion](#acf-t2-silent-coercion) | Medium | Partial | Code Pattern |
    | **ACF-T3** | [Unstructured Signal Parsing](#acf-t3-unstructured-signal-parsing) | High | Partial | Code Pattern |
    | *ACF-T4* | [Safety Guard Erosion](#acf-t4-safety-guard-erosion) *(provisional)* | Medium | None | Code Pattern |

    **Common mechanism:** Python's type system does not distinguish data by provenance. A `dict` from an external API and a `dict` from a validated internal query are the same type. Agents treat them interchangeably because nothing in the language tells them otherwise.

=== "Repudiation (R)"

    Audit trail integrity, verification assurance, or operational atomicity is compromised.

    | ID | Name | Risk | Detection | Type |
    |---|---|---|---|---|
    | **ACF-R1** | [Audit Trail Destruction](#acf-r1-audit-trail-destruction) | High | Partial | Code Pattern |
    | **ACF-R2** | [Partial Completion](#acf-r2-partial-completion) | High | None | Code Pattern |
    | **ACF-R3** | [Verification Displacement](#acf-r3-verification-displacement) | High | Partial (R3a) / None (R3b) | Code Pattern |
    | *ACF-R4* | [Context Handover Assumption](#acf-r4-context-handover-assumption) *(provisional)* | Medium | Partial | Workflow Pattern |
    | **ACF-R5** | [Remediation-Induced Violation](#acf-r5-remediation-induced-violation) | High | None | Code Pattern |
    | *ACF-R6* | [Scope-Limited Triage](#acf-r6-scope-limited-triage) *(provisional)* | Medium | None | Workflow Pattern |

    **Common mechanism:** "Catch exceptions and log them" is a pervasive training pattern. Agents apply it to audit-critical operations without recognising that some failures must propagate rather than be absorbed. The Repudiation category also includes two provisional entries (R4, R6) that occur during refactoring, auditing, and triage rather than initial code generation.

=== "Information Disclosure (I)"

    Internal system details are exposed through error responses.

    | ID | Name | Risk | Detection | Type |
    |---|---|---|---|---|
    | **ACF-I1** | [Verbose Error Response](#acf-i1-verbose-error-response) | Medium | Partial | Code Pattern |

    **Common mechanism:** Agents produce "helpful" error messages that include full context — database schemas, file paths, query parameters, library versions. This is valuable during development but reconnaissance information in production. The distinction is contextual, not syntactic.

=== "Denial of Service (D)"

    Review process capacity is overwhelmed, degrading assurance.

    | ID | Name | Risk | Detection | Type |
    |---|---|---|---|---|
    | **ACF-D1** | [Finding Flood](#acf-d1-finding-flood) | High | N/A | Process Threat |
    | **ACF-D2** | [Review Capacity Exhaustion](#acf-d2-review-capacity-exhaustion) | High | N/A | Process Threat |

    **Common mechanism:** AI generates code at volume. If that code triggers many findings (D1) or requires review at a rate exceeding human capacity (D2), the review process degrades from active verification to passive scanning. The DoS is against the *review process*, not the system.

=== "Elevation of Privilege (E)"

    Privileges are granted based on unvalidated claims or unsound gate predicates.

    | ID | Name | Risk | Detection | Type |
    |---|---|---|---|---|
    | **ACF-E1** | [Implicit Privilege Grant](#acf-e1-implicit-privilege-grant) | **Critical** | **None** | Code Pattern |
    | **ACF-E2** | [Unvalidated Delegation](#acf-e2-unvalidated-delegation) | High | Partial | Code Pattern |

    **Common mechanism:** Agents implement integration patterns by calling external APIs and acting on the response. The concept that the external system's response must be independently verified is not visible in the code structure. The code looks like a normal API call and response handling.

---

## Full Summary Table

??? note "Expand full summary table (8 columns — best viewed on wide screens)"

    | ID | Name | STRIDE | Failure Layer | Type | Relation | Risk | Detection |
    |---|---|---|---|---|---|---|---|
    | ACF-S1 | Fabricated Default | S | Training bias | Code Pattern | Agent-specific | High | Partial |
    | ACF-S2 | Spurious Field Access | S | Training bias | Code Pattern | Agent-specific | High | Partial |
    | ACF-S3 | Structural Identity Spoofing | S | Training bias | Code Pattern | Agent-specific | High | Partial |
    | ACF-T1 | Authority Tier Conflation | T | Training bias | Code Pattern | Agent-specific | **Critical** | **None** |
    | ACF-T2 | Silent Coercion | T | Training bias | Code Pattern | Agent-specific | Medium | Partial |
    | ACF-T3 | Unstructured Signal Parsing | T | Training bias | Code Pattern | Agent-specific | High | Partial |
    | ACF-R1 | Audit Trail Destruction | R | Training bias | Code Pattern | Known class, agent-amplified | High | Partial |
    | ACF-R2 | Partial Completion | R | Training bias | Code Pattern | Known class, agent-amplified | High | None |
    | ACF-R3 | Verification Displacement | R | Context collapse | Code Pattern | Agent-specific | High | Partial (R3a) / None (R3b) |
    | ACF-R5 | Remediation-Induced Violation | R | Training bias | Code Pattern | Agent-specific | High | None |
    | ACF-I1 | Verbose Error Response | I | Training bias | Code Pattern | Known class, agent-amplified | Medium | Partial |
    | ACF-D1 | Finding Flood | D | Process volume | Process Threat | Agent-specific | High | N/A |
    | ACF-D2 | Review Capacity Exhaustion | D | Process volume | Process Threat | Agent-specific | High | N/A |
    | ACF-E1 | Implicit Privilege Grant | E | Training bias | Code Pattern | Agent-specific | **Critical** | **None** |
    | ACF-E2 | Unvalidated Delegation | E | Training bias | Code Pattern | Known class, agent-amplified | High | Partial |

    *Provisional candidates (S4, S5, T4, R4, R6) are included in the STRIDE tabs above but not counted in the "15 core failure modes" statistics. The "Failure Layer" column maps each entry to the failure-layer distinction: Training bias persists across sessions and models with shared lineages; Context collapse is addressable through session management; Process volume requires capacity planning.*

---

## Detection Capability Summary

| Detection Level | Count | Failure IDs | Implication |
|---|---|---|---|
| **None** (no existing tool detects it) | 4 | ACF-T1, ACF-R2, ACF-R5, ACF-E1 | Require new tooling or new review practices |
| **Partial** (some tools catch some cases) | 9 | ACF-S1, ACF-S2, ACF-S3, ACF-T2, ACF-T3, ACF-R1, ACF-R3, ACF-I1, ACF-E2 | Existing tools provide incomplete coverage; augmentation needed |
| **N/A** (process threat, not code pattern) | 2 | ACF-D1, ACF-D2 | Require process controls, not technical controls |

**The gap:** 4 of the 15 core failure modes are completely undetectable by existing tools, and 9 more are only partially detected. Thirteen of fifteen are undetected or only partially detected — including all four with no tool coverage. The 4 undetectable failure modes include both Critical-rated entries (ACF-T1 and ACF-E1) — the highest-risk failures fall outside the detection scope of current tooling. For provisional candidates, 2 of 5 have no detection (ACF-T4, ACF-R6) and 3 have partial detection (ACF-S4, ACF-S5, ACF-R4). If ACF-R3b were rated independently, the "None" count would be 5 and the "Partial" count would be 8.

---

## Controls Matrix

The five review questions from the [Practical Guide](../respond/practical-guide.md) map to the taxonomy as follows:

| Review Question | Primary ACF Coverage | Detection Type |
|---|---|---|
| **Q1. Does missing data crash or default?** | ACF-S1, ACF-S2, ACF-T2 | Pattern check (automatable) |
| **Q2. Are failed operations reported or quietly swallowed?** | ACF-R1, ACF-R2 | Pattern check (automatable) |
| **Q3. Is external data validated before being treated as authoritative?** | ACF-T1, ACF-E1, ACF-E2 | Pattern check (automatable) |
| **Q4. Did AI suggest this pattern — and do I understand why?** | All entries | Judgement call (human) |
| **Q5. If this code is wrong, how would I find out?** | All entries | Judgement call (human) |

Questions 1–3 target the highest-risk code patterns and can eventually be automated through semantic enforcement tooling. Questions 4–5 remain with human reviewers — they require contextual judgement that automated tools cannot provide.

---

## Detailed Entries

Each entry below provides the core description, risk assessment, and detection status. For the full detailed entries — including code examples, worked scenarios, and detection approach specifications — see [Appendix A of the discussion paper](paper.md#appendix-a-agentic-code-failure-taxonomy).

### Core Entries

#### ACF-S1: Fabricated Default

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

Default values fabricate data where the absence of data should be surfaced as a failure, error, or explicit "unknown." The code presents a confident result that is actually based on fabricated input. The `.get(key, default)` pattern is genuinely good practice in most contexts — agents learn it as universal and apply it where the default fabricates safety-critical data. A `.get("security_classification", "OFFICIAL")` silently downgrades PROTECTED documents to OFFICIAL when the field is missing.

**Scope extends to internal state:** `self._run_id or ""` replaces a `None` run ID with an empty string, fabricating observability data. Operators cannot distinguish "instantaneous" from "unmeasured."

---

#### ACF-S2: Spurious Field Access

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

Agent accesses a field name that does not exist on the target object, masked by `getattr()` with a default. The code operates on fabricated data while appearing to access a real field. `getattr(assessment, "risk_score", 0)` when the actual field is `risk_rating` — nothing is ever escalated because the threshold is always zero.

**Detection:** Type checkers (mypy, pyright) catch this *if the object is fully annotated*. If the object is `Any` or untyped, type checkers are silent.

---

#### ACF-S3: Structural Identity Spoofing

**STRIDE:** Spoofing (+ Elevation of Privilege consequence) | **Risk:** High | **Detection:** Partial

`hasattr()` is used as a capability or privilege gate, allowing any object that declares the expected attribute to pass — regardless of whether the object is of the correct type. Python's `__getattr__` protocol means a single class can dynamically claim to possess *any* attribute, passing every `hasattr` check in the codebase. The gate accepts structural presence as proof of identity.

---

#### ACF-T1: Authority Tier Conflation

**STRIDE:** Tampering | **Risk:** Critical | **Detection:** None

Data from an external (untrusted) source is used in an internal (trusted) context without passing through a validation boundary. The data's effective authority tier is silently elevated. This is one of the two Critical-rated failure modes because it compromises the integrity of the internal data store — the system's source of truth. The contamination produces no event; the data enters silently and corrupts every downstream decision, report, and audit record.

**No widely deployed tool detects this.** Detection requires taint analysis tracing data from external boundaries to internal stores — the core capability of semantic enforcement tooling.

---

#### ACF-T2: Silent Coercion

**STRIDE:** Tampering | **Risk:** Medium | **Detection:** Partial

Type coercion across trust boundaries hides data quality issues. `float(row.get("transaction_amount", 0))` compounds two failures: `.get()` fabricates a default (ACF-S1), then `float()` coerces it. The distinction between "this transaction was for $0" and "we do not know the transaction amount" is lost permanently.

---

#### ACF-R1: Audit Trail Destruction

**STRIDE:** Repudiation | **Risk:** High | **Detection:** Partial

Exception handling around audit-critical operations compromises audit trail integrity. Two surface forms: (a) broad exception handlers catch errors and log-and-continue rather than propagating the failure to the audit system; (b) audit-critical operations propagate failures as untyped exceptions that bypass structured handling paths. The two forms compose — an untyped exception from (b) lands in a catch-all from (a), creating a silent audit trail gap that neither detection rule alone would flag.

**The extended scenario** in the full paper demonstrates how exception routing failures can silently disable middleware-based security controls (SIEM integration, rate limiting, account lockout), producing a brute-force window that is both undetectable and unreconstructable from the audit trail.

---

#### ACF-R2: Partial Completion

**STRIDE:** Repudiation | **Risk:** High | **Detection:** None

A sequence of operations that should be atomic is implemented without rollback, so partial failure leaves the system in an inconsistent state. Agents implement operations sequentially with per-step error handling but do not naturally recognise that a group of operations should be treated as a transaction. No existing tool detects this.

---

#### ACF-I1: Verbose Error Response

**STRIDE:** Information Disclosure | **Risk:** Medium | **Detection:** Partial

Error handlers expose internal system details (database schemas, file paths, query parameters, library versions) in error responses. Agents produce "helpful" error messages that include full context. What was a sporadic review finding in human-authored code becomes a systematic pattern requiring detection at scale.

---

#### ACF-T3: Unstructured Signal Parsing

**STRIDE:** Tampering | **Risk:** High | **Detection:** Partial

Control-flow or classification decisions are made by substring matching on unstructured text — error messages, log output, human-readable descriptions — rather than on typed, structured fields. The code treats a prose string as if it were an enum and builds control flow on the fabricated structure. When error message wording changes, the match silently fails and events are misclassified — worse than an audit gap because the record is present with the wrong category.

---

#### ACF-R3: Verification Displacement

**STRIDE:** Repudiation | **Risk:** High | **Detection:** Partial

Agent-generated code displaces assurance — the system appears verified when the critical properties are unverified. **R3a (Verification Substitution):** Tests rewritten to verify mock behaviour instead of real system behaviour. The displaced test is visually indistinguishable from a real test at the call site. **R3b (Compensating Control Dependency):** Downstream code is incidentally correct because an upstream normalisation masks its fragility. Only surfaces when the compensating control is correctly removed.

---

#### ACF-R5: Remediation-Induced Violation

**STRIDE:** Repudiation | **Risk:** High | **Detection:** None

An agent tasked with fixing a known violation introduces a *different* violation in the fix itself. The remediation commit claims to resolve the original problem — and may genuinely do so — while introducing a new failure mode that the review process is structurally less likely to catch, because the reviewer's attention is anchored on the original violation. Remediation carries an implicit assurance signal: "this code has already been through critical evaluation."

---

#### ACF-D1: Finding Flood

**STRIDE:** Denial of Service | **Risk:** High | **Detection:** N/A (process threat)

The volume of static analysis findings on agent-generated code overwhelms reviewers, causing them to rubber-stamp findings without evaluation. A vicious cycle: volume → batch dismissal → real issues dismissed alongside false positives → false assurance.

**Mitigation:** Finding caps per rule, prioritised presentation, measured suppression rates, periodic audit of suppressed findings. Add automated first-pass triage of findings and proposed exceptions — for example, a prompted model evaluating each flagged violation against the declared rule before it reaches a human — so that human attention is reserved for ambiguous or high-stakes cases. Advisory only, never the authoritative gate.

---

#### ACF-D2: Review Capacity Exhaustion

**STRIDE:** Denial of Service | **Risk:** High | **Detection:** N/A (process threat)

Agent code generation velocity exceeds the organisation's capacity for security-focussed review. Review shifts from active verification to passive scanning. Unlike D1 (which overwhelms finding triage), D2 overwhelms human code review itself.

**Mitigation:** Automated pre-screening, volume-aware capacity planning, review effectiveness metrics, review scope boundaries.

---

#### ACF-E1: Implicit Privilege Grant

**STRIDE:** Elevation of Privilege | **Risk:** Critical | **Detection:** None

External system assertions are accepted without independent verification, granting privileges based on unvalidated claims. The code looks like a normal API call and response handling — the partner says "verified" and access is granted. No independent check, no recording of the basis for the decision. If the partner system is misconfigured (not compromised — just misconfigured), every applicant is "verified."

**The unknowability consequence** is the same shape as ACF-R1: the audit trail records what the system did, but not whether the basis for the decision was valid. After a partner-side incident, the system cannot distinguish legitimate grants from erroneous ones.

---

#### ACF-E2: Unvalidated Delegation

**STRIDE:** Elevation of Privilege | **Risk:** High | **Detection:** Partial

User-supplied parameters are used directly in privileged operations (database queries, file access, system commands) without validation or restriction. `db.query(Record).filter_by(**user_query)` allows users to filter on internal fields that should not be queryable.

**Process-layer dimension.** The same structural pattern extends beyond generated code to the development process itself. Agentic coding tools inherit the operator's system credentials and execute privileged operations — shell commands, package installation, git push, CI configuration changes — without the operator constraining the scope of permissible operations. This is a condition by design, and the default posture of most agentic frameworks is to grant broad execution authority. The mitigation is the same principle applied at the process layer: restrict delegation to an allowlist of permitted operations, just as the code-level mitigation restricts query parameters to an allowlist of permitted fields.

---

### Provisional Candidates

The following five entries are documented separately from the core taxonomy because they meet a lower evidentiary threshold. They are included because the patterns are consistent and practically significant, but they are presented for community discussion and validation rather than as settled taxonomic classes. ACF-S4 (Type Annotation Erosion) and ACF-S5 (Type Structure Avoidance) were identified through external consultation feedback and describe complementary meta-failures that degrade the detection capability for other taxonomy entries. ACF-R4 concerns context-pressure failures in agentic workflows. Two (T4, R6) describe failures that occur during *maintenance-phase work* (refactoring, auditing, triage) rather than during initial code generation.

#### ACF-S4: Type Annotation Erosion

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

Type annotations are weakened or suppressed — `# type: ignore`, widening to `Any`, `cast()` calls — to resolve type errors rather than fixing the underlying mismatch. This is a meta-failure: it degrades the detection capability for ACF-S2, ACF-S3, and other type-dependent entries. The code claims type safety while providing none.

---

#### ACF-S5: Type Structure Avoidance

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

Agent-generated code systematically avoids creating typed data structures, using `dict[str, Any]` or equivalent untyped containers where domain-specific types would be appropriate. Unlike S4 (which erodes existing type safety), S5 means the type infrastructure was never built. External API data consumed as raw `dict` from `.json()` rather than hydrated into validated models makes ACF-T1 structurally guaranteed — a `dict` from an external API and a `dict` from an internal query are indistinguishable. Cross-language: Python `dict[str, Any]`, TypeScript `Record<string, any>`, Java `Map<String, Object>`, Go `map[string]any`.

---

#### ACF-T4: Safety Guard Erosion

**STRIDE:** Tampering | **Risk:** Medium | **Detection:** None

Precondition guards (assertions, defensive raises) are removed during refactoring. The assertion that looks "obviously redundant" exists to catch future code paths the agent cannot model. A maintenance-phase failure that silently reverses institutional learning.

The erosion can also arrive at campaign scale through a directive rather than a refactor. In the longitudinal project, a remediation ticket's criteria marked an anti-masquerading guard for deletion — the campaign would have removed a control it existed to install — caught only because the executing session checked the ticket against its governing decision records before acting ([Appendix E.8](paper.md#e8-postscript-the-remediation-phase)).

---

#### ACF-R4: Context Handover Assumption

**STRIDE:** Repudiation | **Risk:** Medium | **Detection:** Partial

An agent produces an artefact — a review, a specification, a plan, or a set of recommendations — that defers actions to a future session or a different agent, implicitly assuming the consumer will have access to the producing agent's context. The artefact reads as actionable but is incomplete for its actual delivery path because required context remains in the producing session rather than in the artefact handed to the consumer. Particularly consequential in multi-agent workflows where each handover crosses a context boundary.

---

#### ACF-R6: Scope-Limited Triage

**STRIDE:** Repudiation | **Risk:** Medium | **Detection:** None

An agent encounters evidence of a problem — a failing test, a warning, a deprecation, a TODO with safety implications — and classifies it as out of scope. The agent narrates the triage decision, moves on, and the problem becomes *less* visible than it was before the agent encountered it. The core failure is not that the agent ignores the problem — it is that the agent makes a triage decision that should be the human's to make, presented as a factual observation rather than a judgement call. In workflows with multiple sessions, each session encounters the same pre-existing failure, triages it as "not my problem," and the failure accumulates tenure while being addressed never. A workflow-level pattern requiring further corroboration.

---

## Taxonomy Extension Mechanism

This taxonomy is presented as a starting point, not a closed set. The generative conditions that produce these failure modes will produce others not yet observed. The provisional candidates above illustrate the expected path from observation to inclusion. Notably, ACF-T3, ACF-T4, ACF-R5, and ACF-R6 were identified through maintenance-phase work — refactoring, remediation, auditing, and triage — rather than through initial code generation, suggesting that the taxonomy's coverage should explicitly encompass the full software lifecycle, not only greenfield authoring.

**A candidate arriving through this mechanism: stale mandate execution.** An agent faithfully executes a work instruction that has been silently superseded or withdrawn by a governance artefact — an architecture decision record, a policy change — that the instruction does not reference. The defect is not in the code the agent writes; it is that the agent writes the wrong code correctly. The hazard grows with agent compliance, and statelessness compounds it: every session re-trusts the stale instruction afresh, indefinitely. It is distinct from the existing entries — no training-distribution pattern is being reached for, the context is present and correct (the *instruction* is wrong), and nothing is dropped at a handover as in ACF-R4. The mitigation is machine-readable governance state the task frame is forced to consult: work instructions that cite their governing decision records, and tooling that fails the task when a cited record has been superseded. [Appendix E.8](paper.md#e8-postscript-the-remediation-phase) documents the observed near-miss. Put forward as a workflow-pattern candidate in the Repudiation family, not as a settled entry.

**Criteria for new entries.** A candidate ACF entry should meet four conditions: (1) a reproducible code-level or process-level pattern, with at least one worked example; (2) a STRIDE mapping that identifies the threat category; (3) a risk rating using the scale defined in the appendix; and (4) an assessment of existing detection capability. Entries that describe known vulnerability classes should document why agentic generation changes the management burden (volume, systematicity, or detection difficulty) rather than simply cataloguing a known class. The naming convention follows **ACF-{category}{number}** where categories map to STRIDE: S(poofing), T(ampering), R(epudiation), I(nformation Disclosure), D(enial of Service), E(levation of Privilege).

**Submission pathway.** Until a formal maintenance process for the taxonomy exists, candidate entries can be submitted through the consultation process accompanying the paper. Submissions should follow the entry structure used in the appendix: description, generative mechanism, worked example, risk assessment, and detection approach. The authors welcome submissions from practitioners, researchers, and tool vendors — particularly entries backed by empirical observation from projects with detection capability in place.

**Versioning.** New entries should use the next available number within the appropriate STRIDE category (e.g., the next Spoofing entry would be ACF-S6, the next Tampering entry ACF-T5). Provisional entries retain their provisional status until they meet the full evidentiary threshold. Entries may be deprecated if model improvements or tool coverage render them obsolete — but deprecation should be evidenced, not assumed.

For the full extension mechanism with worked examples, see [Appendix A of the discussion paper](paper.md#appendix-a-agentic-code-failure-taxonomy).

---

## Related Entries and Distinguishing Criteria

Several pairs of entries describe adjacent failure modes. The distinguishing criteria below help reviewers and tool builders classify findings correctly.

**ACF-S1 (Fabricated Default) vs ACF-T2:** S1 fabricates a value where none exists (the field is missing); T2 silently coerces a value that does exist into a different type or representation. S1 invents data; T2 transforms it. Both produce wrong values, but S1 is detectable by checking for default arguments on security-sensitive fields, while T2 requires tracing type coercion across operations.

**ACF-T1 vs ACF-E1:** T1 is a provenance failure — external data crosses into trusted processing without passing a validation boundary. E1 is a decision failure — privileges or access are granted on the strength of unvalidated assertions or data. T1 asks "did this data earn trusted status?"; E1 asks "did this claim improperly trigger a privileged action?"

**ACF-T2 vs ACF-T3:** T2 silently coerces a *type*; T3 silently parses *prose as structure*. Both produce values that look correct today and silently degrade when the source changes, but the mechanisms differ — T2 converts data, T3 fabricates structure from text.

**ACF-R1 vs ACF-R2:** R1 destroys auditability by swallowing or suppressing failures that should be recorded or propagated. R2 destroys atomicity by allowing a multi-step operation to complete partially without rollback or compensating action. R1 corrupts the record of what happened; R2 corrupts the state that resulted.

**ACF-R3 vs ACF-R5:** R3 displaces *test* assurance (real tests become mock tests); R5 displaces *remediation* assurance (fixes introduce new violations). Both produce artefacts that claim to provide assurance while degrading the property they claim to assure.

**ACF-D1 vs ACF-D2:** D1 is an upstream cause — agents generate a high volume of findings that flood the review pipeline. D2 is the downstream effect — sustained volume degrades human review quality through habituation and fatigue. D1 can be addressed with precision-gated tooling; D2 requires capacity planning and review effectiveness measurement.

**ACF-E1 vs ACF-S3:** E1 is about unvalidated external assertions — a partner API says "verified" and the code grants access. S3 is about unsound gate predicates — `hasattr()` gates accept any object with the expected attribute regardless of type. Both result in implicit privilege grants, but through different mechanisms: E1 trusts the wrong *source*; S3 trusts the wrong *check*.

**ACF-S4 vs ACF-S2:** S4 degrades the detection substrate for S2. S2 is a spurious field access masked by `getattr()` with a default — detectable by mypy *if the object is typed*. S4 widens the object to `Any` or adds `# type: ignore`, making mypy silent. S2 is a data-level failure (wrong field); S4 is a meta-level failure (detection disabled).

**ACF-S4 vs ACF-S5:** S4 removes or weakens type safety that already exists; S5 avoids creating type structure in the first place. S4 is erosion of an existing detection surface; S5 is failure to construct that surface at all.

**ACF-S5 vs ACF-T1:** S5 is a representational failure — external and internal data are both reduced to untyped containers, so downstream code cannot distinguish them at the type level. T1 is the trust-boundary failure that results when such data crosses into trusted processing without validation. S5 makes T1 harder to detect; T1 is the semantic violation itself.

**ACF-S4 vs ACF-T4:** Both describe the removal of a safety mechanism rather than satisfaction of it. T4 removes runtime guards (assertions, defensive raises); S4 removes static analysis guards (type annotations, type-checker constraints). Both are maintenance-phase failures — they appear when agents are resolving errors, not when generating greenfield code.

**ACF-T4 vs ACF-R5:** T4 (guard erosion) can manifest as part of R5 — a remediation commit that removes safety guards not related to the original violation. Both are maintenance-phase failures targeting the gap between greenfield authoring and code modification.
