---
title: "Wardline Framework"
weight: 3
bookCollapseSection: true
---

**Status:** Design — DRAFT v0.2.0

**Normative language.** This specification uses MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, RECOMMENDED, and OPTIONAL as defined in RFC 2119 and clarified in RFC 8174. When these words appear in uppercase, they carry normative force. Lowercase equivalents describe expected behaviour of user code under scanner enforcement, not implementation requirements.

## What a wardline is

A wardline is the set of declarations an application makes about how it classifies and protects the semantic boundaries of its data and code paths. It declares:

- Which data belongs to which authority tier
- Which code paths must fail in which ways
- Which patterns are prohibited in which contexts
- What governance surrounds exceptions to those rules
- Where serialised artefacts may be restored to a tier, and on what evidence (restoration boundaries)

An application that has declared a wardline has made its institutional knowledge machine-readable. An application without one has that knowledge in prose, in people's heads, or nowhere.

The wardline is the *classification*, not the enforcement tool. A wardline declares that deserialised audit records carry Tier 1 authority and that accessing their fields with fallback defaults is prohibited. An enforcement tool reads that declaration and produces findings when the codebase violates it. The relationship is analogous to a security classification guide and the systems that enforce it: the guide defines the policy; the systems implement it. Replacing the enforcement tool does not change the classification. Changing the classification changes what every enforcement tool must check.

This distinction matters because institutional knowledge outlives any particular toolchain. A wardline expressed as a machine-readable manifest can be consumed by static analysers, type checkers, runtime enforcement layers, prompted review systems, or assessment tooling — serially or in parallel, in any language. The manifest is the stable artefact. The tools are disposable.

A wardline is therefore a normative document: it describes what the application *commits to*, not what it currently achieves. The gap between declaration and enforcement is measurable, auditable, and — critically — visible to assessors who have no access to the development team's tacit knowledge.

### Terms and definitions

The following terms carry specific meaning in this specification. Where a term is used in its everyday sense, it appears in lowercase without emphasis; where it carries its defined meaning, the surrounding tier, boundary, or annotation context makes this clear.

| Term | Definition |
|---|---|
| **Authority tier** | One of four hierarchical classifications (Tier 1 through Tier 4) that describe the level of trust a system is entitled to assume about a data value. See [Authority tier model]({{< relref "authority-tier-model" >}}). |
| **Boundary contract** | A named, stable semantic identifier declaring what data crosses a boundary and at what tier, replacing the previous function-name consumer list. Each contract specifies a contract name (e.g., `"landscape_recording"`, `"partner_reporting"`), the data tier expected, and the direction of flow. Contracts survive refactoring — the contract is stable; the function-level binding updates. |
| **Bounded context** | The declared set of boundary contracts for which a semantic validation boundary establishes domain-constraint satisfaction. A validation is comprehensive within its bounded context. |
| **Coding posture** | The programming style appropriate to a given tier: offensive (T1), confident (T2), guarded (T3), or sceptical (T4). The shorthand T1–T4 is used interchangeably with Tier 1–Tier 4 throughout. See [Authority tier model]({{< relref "authority-tier-model" >}}). |
| **Effective state** | One of eight enforcement contexts produced by combining trust classification and validation status. The severity matrix maps pattern rules to effective states. |
| **Enforcement perimeter** | The set of source files, modules, or packages that a wardline declaration covers. Code outside the enforcement perimeter is not analysed; data crossing the perimeter boundary is treated as UNKNOWN. |
| **Exception** (governance) | A documented, time-limited override of a scanner finding, managed through the exception register. Distinct from a programming-language exception. |
| **Fingerprint baseline** | A cryptographic record of the annotation surface at a governance checkpoint. Baseline diffs surface all wardline-relevant changes for review. |
| **Non-normative** | Content that advises or recommends but does not impose requirements on implementations. Non-normative sections use "recommended", "preferred", "avoid" — never uppercase RFC 2119 keywords. |
| **Normalisation boundary** | A declared boundary that collapses MIXED-taint inputs into a new Tier 2 artefact. Normalisation is semantically a new construction, not a passthrough. |
| **Overlay** | A YAML file (`wardline.overlay.yaml`) that narrows or extends the root manifest for a specific module, boundary, or data source. |
| **Rejection path** | A control-flow path within a validation boundary function that terminates without producing the function's normal return value (e.g., `throw`, guarded early return). |
| **Restoration boundary** | A declared function that reconstitutes a previously serialised artefact, reinstating a tier classification supported by evidence categories. See [Enforcement specification]({{< relref "enforcement" >}}). |
| **Semantic boundary** | A point in the codebase where data crosses between authority tiers or where institutional meaning is assigned. Wardline annotations make semantic boundaries explicit and machine-readable. |
| **Structural contract** | The set of structural guarantees that a data representation provides after shape validation — field presence, type correctness, schema conformance. |
| **Taint state** | The effective state assigned to a data value by the taint analysis engine. Determined by the value's trust classification and validation status. See [Enforcement specification]({{< relref "enforcement" >}}). |
| **Trust topology** | The complete set of tier assignments, boundary declarations, and data-flow constraints declared in a project's wardline manifest and overlays. |
| **Validation boundary** | A declared function that transitions data from one tier to another through structural (shape) or domain-constraint (semantic) verification. |
| **Wardline manifest** | The root YAML file (`wardline.yaml`) that declares a project's trust topology, enforcement configuration, and governance policy. |

## The problem a wardline solves

There is a structural gap between what automated tooling checks and what high-stakes code requires. The standard assurance stack — linters, type checkers, SAST, DAST, unit tests, conventional peer review — verifies *syntactic* and *conventional* correctness: Does the code parse? Does it conform to style rules? Are types consistent? Do tests pass? These checks are necessary but insufficient. They cannot determine whether a `.get()` default is institutionally appropriate, whether an exception handler preserves the audit trail, or whether data crossing a trust boundary has been validated.

Agent-generated code exploits this gap systematically — the parent paper's case study presents empirical evidence of approximately one to two such violations detected per day on a single project under specific conditions (one developer, ~80,000-line codebase, purpose-built enforcement tooling), all caught before entering the codebase but none detectable by the standard assurance stack. The rate is a detection measure, not a defect accumulation rate. Agents produce code that follows established good practice — defensive programming, graceful error handling, sensible defaults — applied without contextual judgement. The patterns are individually correct and collectively dangerous. A `.get("security_classification", "OFFICIAL")` is syntactically identical to `.get("city", "Sydney")`. The first silently downgrades a document's security classification; the second provides a location default that may be harmless in many contexts. No tool in the standard assurance stack distinguishes them, because the distinction is *semantic*: it depends on what the field means in the application's institutional context, not on how the code is structured. Without a wardline, both patterns look identical to tooling. With a wardline, the distinction becomes enforceable — the framework makes it possible to declare which contexts prohibit fallback defaults and which permit them.

The wardline makes the invisible visible. By declaring that a particular data path carries Tier 1 authority and that fallback defaults are prohibited in that context, the application converts tacit institutional knowledge into a machine-readable constraint. The enforcement tool no longer needs to infer context — the wardline supplies it.

**What is and is not novel here.** The individual pattern rules (WL-001 through WL-006) are expressible as custom rules in existing SAST frameworks — Semgrep, CodeQL, Error Prone, or equivalent. Any team with SAST experience could write these rules. The contribution is not the detection primitives but the governance topology that surrounds them: the severity matrix that varies enforcement by declared semantic context, the exceptionability model that distinguishes project invariants from governable overrides, the taint lattice that tracks data authority across boundaries, the fingerprint baseline that makes governance erosion visible, and the institutional integration that connects enforcement to organisational policy. Well-understood SAST capability, freshly composed into a governance-aware framework — that is the claim.

**Why now.** The emergence of a semantic boundary layer fits a longer progression in software abstraction: machine operations gave way to source code (compilers), source code gave way to frameworks and modules (reuse), frameworks gave way to infrastructure-as-code (deployment automation). Each step moved human effort into a layer where leverage is greater, enabled by the layer below becoming cheap enough to automate. The next layer is policy and boundary as code — machine-readable encodings of trust semantics, data classification, boundary contracts, failure posture, evidence requirements, and governance rules. This layer is emerging now because AI-assisted development is making implementation cheap enough that the bottleneck shifts from code production to semantic intent. Once implementation becomes a compilation target, the scarce thing is no longer code production. It is semantic intent, risk posture, and institutional constraint. A wardline is an attempt to encode that scarce layer.

### ACF taxonomy coverage

Wardline addresses the semantic-boundary gap; it does not address all 13 ACF failure modes. The following table maps wardline coverage to the ACF taxonomy.

| ACF Entry | Wardline Coverage |
|-----------|------------------|
| ACF-S1 (Fabricated Default) | WL-001 (member access with fallback default) |
| ACF-S2 (Spurious Field Access) | WL-002 (existence-checking as structural gate); type system enforcement |
| ACF-S3 (Structural Identity Spoofing) | WL-002 (existence-checking structural gates), WL-006 (runtime type-checking on internal data) |
| ACF-T1 (Authority Tier Conflation) | Taint analysis (tier-flow enforcement between declared boundaries) |
| ACF-T2 (Silent Coercion) | WL-001 (defaults as implicit coercion) |
| ACF-R1 (Audit Trail Destruction) | WL-003, WL-004, WL-005 (exception handling rules) |
| ACF-R2 (Partial Completion) | WL-005, Group 2 (audit primacy enforcement), Group 9 (atomicity and compensatable operation annotations) |
| ACF-R3 (Verification Displacement) | Not directly addressable by pattern rules — wardline coverage is indirect through test structure analysis (mock provenance, factory bypass detection) |
| ACF-I1 (Verbose Error Response) | Groups 8 and 11 (secret handling, data sensitivity); WL-003/WL-004 secondary coverage |
| ACF-D1 (Finding Flood) / ACF-D2 (Review Capacity Exhaustion) | Not addressable — process threats |
| ACF-E1 (Implicit Privilege Grant) | Taint analysis (tier-flow enforcement) |
| ACF-E2 (Unvalidated Delegation) | Group 14 access/attribution enforcement, taint analysis (tier-flow enforcement) |
| ACF-S4 (Type Annotation Erosion) [provisional] | Indirectly relevant — S4 degrades the type system that wardline's type-system enforcement layer depends on. Detection is outside pattern-rule scope; type coverage metrics and annotation fingerprint drift provide indirect signals. |
| ACF-S5 (Type Structure Avoidance) [provisional] | Indirectly relevant — S5 prevents the type structure that wardline's type-system enforcement layer requires. Same indirect detection as S4. |
| ACF-T3 (Unstructured Signal Parsing) | Partially addressable. The substring-match-on-exception-text pattern could be targeted by a custom rule detecting string operations on exception objects inside audit-critical handlers. Not currently covered by WL-001–WL-008. |
| ACF-T4 (Safety Guard Erosion) [provisional] | Not addressable by wardline's current design. T4 is a diff-level pattern (removed assertions in agent-generated diffs) — wardline operates on annotated function bodies, not cross-commit diffs. |
| ACF-R4 (Context Handover Assumption) [provisional] | Not addressable. R4 is a workflow-level pattern about agent session handover assumptions, not a code-level pattern. |
| ACF-R5 (Remediation-Induced Violation) | Indirectly addressable. Wardline would independently catch the new violation if it falls under an existing pattern rule, but does not specifically target the remediation-as-source pattern. |
| ACF-R6 (Scope-Limited Triage) [provisional] | Not addressable. R6 is a workflow-level triage behaviour requiring transcript-level analysis, not code-level enforcement. |

## Non-goals

The following are explicitly outside the scope of this framework:

1. **Wardline does not prove semantic correctness in full.** It detects syntactic proxies for semantic violations in declared contexts (structural signals that correlate with semantic errors, not the semantic errors themselves).
2. **Wardline does not replace human judgement.** It structures what judgement must address. The governance model defines the decision points; the framework makes them visible but does not resolve them.
3. **Wardline does not independently establish provenance truth across storage boundaries.** The framework can enforce structural checks at restoration points, but the ultimate provenance claim rests on institutional trust and governance assurance, not technical proof.
4. **Wardline does not eliminate the need for ordinary assurance controls.** It supplements them. The standard assurance stack (linters, type checkers, SAST, DAST, unit tests, peer review) remains necessary; the wardline adds the semantic-boundary layer that the standard stack cannot address.
5. **Wardline does not guarantee complete coverage of all risky code paths.** Coverage depends on annotation investment, and the coverage boundary is made visible through the annotation fingerprint baseline. Unannotated code is outside the enforcement perimeter by definition.
6. **Wardline does not replace software design.** It constrains and structures the design search space. A wardline manifest captures data-flow boundaries, validation requirements, restoration semantics, failure posture, exception models, and audit obligations. It does not capture performance trade-offs, library choices, concurrency models, deployment constraints, or operational assumptions. These remain engineering decisions that the manifest neither encodes nor eliminates.

## Reading paths

| Audience | Start here |
|----------|------------|
| **Tool implementers** | [Authority tier model]({{< relref "authority-tier-model" >}}), [Enforcement specification]({{< relref "enforcement" >}}), [Annotation vocabulary]({{< relref "annotation-vocabulary" >}}), [Pattern rules]({{< relref "rules" >}}), then [Python]({{< relref "python-binding" >}}) or [Java]({{< relref "java-binding" >}}) binding |
| **Security assessors** | [Authority tier model]({{< relref "authority-tier-model" >}}), [Verification and conformance]({{< relref "verification" >}}) |
| **Adopters** | This page, [Authority tier model]({{< relref "authority-tier-model" >}}), [Governance model]({{< relref "governance" >}}) |
| **Governance leads** | [Governance model]({{< relref "governance" >}}), [Portability and manifest format]({{< relref "portability" >}}), [Verification and conformance]({{< relref "verification" >}}), [Introduction and scope]({{< relref "threat-model/introduction" >}}) |
| **Citizen programmers** | The Wardline Lite practical guide (separate companion document): five review questions, worked code examples, hot-path identification. This guide translates the [annotation vocabulary]({{< relref "annotation-vocabulary" >}}) and [pattern rules]({{< relref "rules" >}}) into questions a non-specialist can apply during code review. |
| **Upstream library maintainers** | [Enforcement specification]({{< relref "enforcement" >}}) (third-party dependency taint), [Annotation vocabulary]({{< relref "annotation-vocabulary" >}}) (Groups 9-15 for voluntary upstream adoption), [Residual risks]({{< relref "residual-risks" >}}) (risk 14 and upstream advisory mechanism), [Portability and manifest format]({{< relref "portability" >}}) (the `dependency_taint` declaration format) |
| **Reference** | [Document scope and language bindings]({{< relref "wardline/document-scope" >}}), [Language evaluation criteria]({{< relref "wardline/language-evaluation" >}}), [Residual risks]({{< relref "wardline/residual-risks" >}}) |
