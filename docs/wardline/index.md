---
tags:
  - architect
  - specification
---

# Wardline: A Semantic Enforcement Framework

[:material-file-pdf-box: Download PDF](../pdf/wardline-companion-community.pdf){ .md-button }

## What this is

The Wardline companion specification describes a proposed standard at draft stage, defining criteria that enforcement tools would need to satisfy — not a tool or product itself. Various vendors and open-source projects could implement tools that conform to its requirements, in the same way that SAST vendors build tools that implement CWE detection rules. It is one possible technical response — not the only one — and is at Design Draft status (v0.2.0). The framework makes institutional knowledge machine-readable, so that enforcement tools can detect code that is syntactically correct but semantically wrong in its declared context. This section provides an overview; the [full specification](specification.md) contains the normative content.

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

## The problem it solves

There is a structural gap between what automated tooling checks and what high-stakes code requires. The standard assurance stack — linters, type checkers, SAST, DAST, unit tests, conventional peer review — verifies *syntactic* and *conventional* correctness: Does the code parse? Does it conform to style rules? Are types consistent? Do tests pass? These checks are necessary but insufficient. They cannot determine whether a `.get()` default is institutionally appropriate, whether an exception handler preserves the audit trail, or whether data crossing a trust boundary has been validated.

Agent-generated code exploits this gap systematically. The parent paper's case study presents empirical evidence of approximately one to two such violations detected per day on a single project under specific conditions (one developer, ~80,000-line codebase, purpose-built enforcement tooling), all caught before entering the codebase but none detectable by the standard assurance stack. The rate is a detection measure, not a defect accumulation rate. Agents produce code that follows established good practice — defensive programming, graceful error handling, sensible defaults — applied without contextual judgement. The patterns are individually correct and collectively dangerous. A `.get("security_classification", "OFFICIAL")` is syntactically identical to `.get("city", "Sydney")`. The first silently downgrades a document's security classification; the second provides a location default that may be harmless in many contexts. No tool in the standard assurance stack distinguishes them, because the distinction is *semantic*: it depends on what the field means in the application's institutional context, not on how the code is structured. Without a wardline, both patterns look identical to tooling. With a wardline, the distinction becomes enforceable — the framework makes it possible to declare which contexts prohibit fallback defaults and which permit them.

The wardline makes the invisible visible. By declaring that a particular data path carries Tier 1 authority and that fallback defaults are prohibited in that context, the application converts tacit institutional knowledge into a machine-readable constraint. The enforcement tool no longer needs to infer context — the wardline supplies it.

**What is and is not novel here.** The individual pattern rules (WL-001 through WL-006) are expressible as custom rules in existing SAST frameworks — Semgrep, CodeQL, Error Prone, or equivalent. Any team with SAST experience could write these rules. The contribution is not the detection primitives but the governance topology that surrounds them: the severity matrix that varies enforcement by declared semantic context, the exceptionability model that distinguishes project invariants from governable overrides, the taint lattice that tracks data authority across boundaries, the fingerprint baseline that makes governance erosion visible, and the institutional integration that connects enforcement to organisational policy. Well-understood SAST capability, freshly composed into a governance-aware framework — that is the claim.

**Why now.** The emergence of a semantic boundary layer fits a longer progression in software abstraction: machine operations gave way to source code (compilers), source code gave way to frameworks and modules (reuse), frameworks gave way to infrastructure-as-code (deployment automation). Each step moved human effort into a layer where leverage is greater, enabled by the layer below becoming cheap enough to automate. The next layer is policy and boundary as code — machine-readable encodings of trust semantics, data classification, boundary contracts, failure posture, evidence requirements, and governance rules. This layer is emerging now because AI-assisted development is making implementation cheap enough that the bottleneck shifts from code production to semantic intent. Once implementation becomes a compilation target, the scarce thing is no longer code production. It is semantic intent, risk posture, and institutional constraint. A wardline is an attempt to encode that scarce layer.

## Core concepts

### Four-tier authority model

The authority tier model classifies data by provenance — what guarantees the system is entitled to assume about each value. Four tiers define a coding posture gradient:

| Tier | Classification | Coding posture |
|------|---------------|----------------|
| **Tier 1** | Authoritative internal data (audit records, decision products, fact records) | Offensive — assume invariants, halt on breach |
| **Tier 2** | Semantically validated data (structure and values verified for every intended use within the declared bounded context) | Confident — trust field values for domain operations |
| **Tier 3** | Shape-validated data (fields present, types correct, values unchecked) | Guarded — direct field access safe, validate before domain use |
| **Tier 4** | Raw external data (unvalidated, potentially malformed or malicious) | Sceptical — treat as hostile, validate structure first |

The tier a value enters at determines what validation must promote it. Shape validation (T4 to T3) requires knowledge of the data's *structure*. Semantic validation (T3 to T2) requires knowledge of the data's *usage across the declared bounded context*. Trusted construction (T2 to T1) requires knowledge of the data's *institutional meaning*. Each step is a wider knowledge claim than the last.

The enforcement specification (§5) defines how tier classifications are tracked and validated: trust classification and validation status, transition semantics at boundary contracts (named, stable semantic identifiers declaring what data crosses a boundary and at what tier), trusted restoration boundaries for serialised artefacts, cross-language taint propagation, and third-party in-process dependency taint. A **boundary contract** survives refactoring — the contract is stable; the function-level binding updates. A **normalisation boundary** collapses mixed-taint inputs into a new Tier 2 artefact — semantically a new construction, not a passthrough.

### Pattern rules

Eight rules detect specific failure modes. Six are **pattern rules** (WL-001 through WL-006) that detect syntactic proxies for semantic violations — e.g., member access with fallback defaults, existence-checking as a structural gate, broad exception catching, silent exception handling, audit writes inside broad handlers, and runtime type-checking of internal data. Two are **structural verification rules** (WL-007 and WL-008) that enforce invariants on declared boundary functions — e.g., that every validation boundary has a rejection path and that semantic validation is preceded by shape validation.

Each rule's severity varies by context. A `.get()` with a default is an unconditional error on audit-trail data (fabricating evidence of a field that may be absent is an integrity failure) but a governable error on external data (where the default may be institutionally approved). The severity matrix encodes these context-dependent judgements across all eight taint states.

### Enforcement layers

Three orthogonal enforcement surfaces catch different classes of violation:

- **Static analysis** (CI/commit time) — detects pattern rule violations and traces taint flow between declared boundaries
- **Type system** (development/compile time) — makes tier mismatches visible in function signatures so that passing raw data where validated data is expected produces a type error
- **Runtime structural** (definition/access time) — makes fabricated defaults on authoritative fields structurally impossible and prevents bypass through inheritance

Each layer's blind spots are another layer's coverage area. A single tool implementing one layer still gains value; the combination closes residual risk surfaces that any single layer leaves open.

### Governance model

A wardline without governance is an honour system. The governance model defines how exceptions to wardline declarations are managed: who may authorise overrides, what evidence trail they leave, and how governance erosion is made visible. Key mechanisms include protected-file review for manifest changes, temporal separation between policy changes and code changes, an annotation fingerprint baseline that detects silent erosion, and a three-state control law model (normal, alternate, direct) for enforcement availability.

## Non-goals

The following are explicitly outside the scope of this framework:

1. **Wardline does not prove semantic correctness in full.** It detects syntactic proxies for semantic violations in declared contexts (structural signals that correlate with semantic errors, not the semantic errors themselves).
2. **Wardline does not replace human judgement.** It structures what judgement must address. The governance model defines the decision points; the framework makes them visible but does not resolve them.
3. **Wardline does not independently establish provenance truth across storage boundaries.** The framework can enforce structural checks at restoration points, but the ultimate provenance claim rests on institutional trust and governance assurance, not technical proof.
4. **Wardline does not eliminate the need for ordinary assurance controls.** It supplements them. The standard assurance stack (linters, type checkers, SAST, DAST, unit tests, peer review) remains necessary; the wardline adds the semantic-boundary layer that the standard stack cannot address.
5. **Wardline does not guarantee complete coverage of all risky code paths.** Coverage depends on annotation investment, and the coverage boundary is made visible through the annotation fingerprint baseline. Unannotated code is outside the enforcement perimeter by definition.
6. **Wardline does not replace software design.** It constrains and structures the design search space. A wardline manifest captures data-flow boundaries, validation requirements, restoration semantics, failure posture, exception models, and audit obligations. It does not capture performance trade-offs, library choices, concurrency models, deployment constraints, or operational assumptions. These remain engineering decisions that the manifest neither encodes nor eliminates.

## Document structure

The wardline companion specification comprises two parts:

- **[Part I: Framework Specification](specification.md)** — the normative, language-agnostic specification covering the authority tier model, enforcement specification, annotation vocabulary, pattern rules, enforcement layers, governance model, verification properties, conformance criteria, and manifest format.
- **[Part II-A: Python Binding](python-binding.md)** — Python-specific implementation reference covering the interface contract, annotation vocabulary, type system and runtime enforcement, regime composition, residual risks, and adoption strategy.
- **[Part II-B: Java Binding](java-binding.md)** — Java-specific implementation reference covering annotations, the Checker Framework integration, Error Prone rules, regime composition, and adoption strategy.

## Who should read what

| Audience | Recommended path |
|----------|-----------------|
| **Tool implementers** (building a scanner, linter plugin, or type checker plugin) | [Specification](specification.md) §1–3 (concepts), §4 (tier model), §5 (enforcement specification), §6–7 (annotations, pattern rules), §8 (enforcement layers), §14 (conformance). Then Part II interface contract ([Python](python-binding.md) §A.3 or [Java](java-binding.md) §B.3), then annotation vocabulary (§A.4/B.4). |
| **Security assessors** (IRAP or equivalent) | [Specification](specification.md) §1–3 (scope), §4 (tier model), §10 (verification properties and golden corpus), §14 (conformance criteria and profiles). Then Part II interface contract ([Python](python-binding.md) §A.3 or [Java](java-binding.md) §B.3), regime composition (§A.6/B.6), residual risks (§A.7/B.7). |
| **Adopters** (deploying wardline on a project) | [Specification](specification.md) §1–4 (what it is, why, tier model), §9 (governance model). Then Part II adoption strategy ([Python](python-binding.md) §A.9 or [Java](java-binding.md) §B.9), annotation vocabulary (§A.4/B.4). |
| **Governance leads** (managing wardline policy and exceptions) | [Specification](specification.md) §9 (governance model), §13 (manifest and exception register), §14.1 (conformance model). Then Part II residual risks ([Python](python-binding.md) §A.7 or [Java](java-binding.md) §B.7), error handling and control law (§A.10/B.10). |
| **Citizen programmers** (reviewing or writing code in a wardline-annotated codebase) | The [Practical Guide for Code Authors](../respond/practical-guide.md) — a separate companion that translates the annotation vocabulary and pattern rules into five review questions, worked code examples, and hot-path identification for non-specialists. This guide is not part of the formal specification. |
| **Upstream library maintainers** (maintaining a library consumed by wardline-governed applications) | [Specification](specification.md) §5.5 (how your library's output is treated — no changes to your code required), §6 Groups 9–15 (supplementary contract annotations suitable for voluntary upstream adoption), §12 residual risk 14 (upstream advisory mechanism — how to publish a `wardline-upstream.yaml`), §13.1.2 (the `dependency_taint` declaration format agencies will use for your library). |

---

**See also:** [Discussion Paper](../understand/index.md) | [ACF Taxonomy](../understand/taxonomy.md)
