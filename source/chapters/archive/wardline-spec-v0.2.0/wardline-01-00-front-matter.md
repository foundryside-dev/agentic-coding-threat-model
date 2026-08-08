## Wardline Framework Specification
### Semantic Boundary Classification and Enforcement

**Date:** 18 March 2026
**Status:** Design — DRAFT v0.2.0
**Prepared by:** John Morrissey
**Document type:** Conformity assessment scheme comprising a data classification model, enforcement rules, governance requirements, and conformance criteria
**Parent paper:** Semantic Defects in AI-Generated Code: Assurance Frameworks for AI-Assisted Development in High-Stakes Code Paths (SDAG)
**Language bindings:** Python (Part II-A), Java (Part II-B)

---

### How to read this document

This document comprises two parts: Part I (the framework specification) and Part II (language binding references for Python and Java). Not all readers need all sections. The paths below route to the most relevant content for each audience.

**Tool implementers** (building a Wardline-Core scanner, linter plugin, or type checker plugin):
→ Part I: §1–3 (concepts), §4 (tier model), §5 (enforcement specification), §6–7 (annotations, pattern rules), §8 (enforcement layers), §14 (conformance)
→ Part II: A.3/B.3 (interface contract — read first), then A.4/B.4 (annotation vocabulary)

**Security assessors** (IRAP or equivalent, evaluating a wardline deployment):
→ Part I: §1–3 (scope), §4 (tier model), §10 (verification properties and golden corpus), §14 (conformance criteria and profiles)
→ Part II: A.3/B.3 (interface contract), A.6/B.6 (regime composition), A.7/B.7 (residual risks)

**Adopters** (deploying wardline on a project):
→ Part I: §1–4 (what it is, why, tier model), §9 (governance model) → Part II: A.9/B.9 (adoption strategy), A.4/B.4 (annotation vocabulary)

**Governance leads** (managing wardline policy and exceptions):
→ Part I: §9 (governance model), §13 (manifest and exception register), §14.1 (conformance model)
→ Part II: A.7/B.7 (residual risks), A.10/B.10 (error handling and control law)

**Citizen programmers** (reviewing or writing code in a wardline-annotated codebase, without developer tooling):
→ Wardline Lite practical guide (separate companion document): five review questions, worked code examples, hot-path identification. This guide is not part of the formal specification — it translates the annotation vocabulary (§6) and pattern rules (§7) into questions a non-specialist can apply during code review.

**Upstream library maintainers** (maintaining a library consumed by wardline-governed applications):
→ Part I: §5.5 (how your library's output is treated — no changes to your code required), §6 Groups 9–15 (supplementary contract annotations suitable for voluntary upstream adoption), §12 residual risk 14 (upstream advisory mechanism — how to publish a `wardline-upstream.yaml`), §13.1.2 (the `dependency_taint` declaration format agencies will use for your library)

---

### Contents

**Part I — Wardline Framework Specification** (this document)

1. [What a Wardline is](#1-what-a-wardline-is)
2. [The problem a Wardline solves](#2-the-problem-a-wardline-solves)
3. [Non-goals](#3-non-goals)
4. [Authority tier model](#4-authority-tier-model)
    - 4.1 Four tiers
5. [Authority tier model: enforcement specification](#5-authority-tier-model-enforcement-specification)
    - 5.1 Trust classification and validation status — 5.2 Transition semantics — 5.3 Trusted restoration boundaries — 5.4 Cross-language taint propagation — 5.5 Third-party in-process dependency taint
6. [Annotation vocabulary](#6-annotation-vocabulary)
7. [Pattern rules](#7-pattern-rules)
    - 7.1 The rules — 7.2 Structural verification — 7.3 Severity matrix — 7.4 Worked examples — 7.5 Derivation principles — 7.6 Taint analysis scope
8. [Enforcement layers](#8-enforcement-layers)
    - 8.1 Static analysis — 8.2 Type system — 8.3 Runtime structural — 8.4 Orthogonality principle — 8.5 Pre-generation context projection
9. [Governance model](#9-governance-model)
    - 9.1 Exceptionability classes — 9.2 Governance mechanisms — 9.3 Scope of governance — 9.3.1 Artefact classification: policy and enforcement — 9.3.2 Manifest threat model — 9.4 Governance capacity — 9.5 Enforcement availability (control law)
10. [Verification properties](#10-verification-properties)
    - 10.1 Findings interchange format — 10.2 Finding presentation guidance
11. [Language evaluation criteria](#11-language-evaluation-criteria)
12. [Residual risks](#12-residual-risks)
13. [Portability and manifest format](#13-portability-and-manifest-format)
    - 13.1 Wardline manifest format
14. [Conformance](#14-conformance)
    - 14.1 Conformance model — 14.2 Conformance criteria — 14.3 Conformance profiles (14.3.1 Enforcement profiles, 14.3.2 Governance profiles, 14.3.3 Graduation) — 14.4 Enforcement regimes — 14.5 Supplementary group enforcement scope — 14.6 Assessment procedure (14.6.1 Worked example: Phase 3 deployment, 14.6.2 Worked example: Lite governance deployment) — 14.7 Partial conformance
15. [Document scope](#15-document-scope)

**Part II — Language Binding Reference**

A. [Python Language Binding Reference](#part-ii-a-python-language-binding-reference)
    - A.1 Design history — A.2 Python language evaluation — A.3 Interface contract (normative) — A.4 Annotation vocabulary — A.5 Type system and runtime enforcement — A.6 Regime composition matrix — A.7 Residual risks — A.8 Worked example — A.9 Adoption strategy — A.10 Error handling and control law
B. [Java Language Binding Reference](#part-ii-b-java-language-binding-reference)
    - B.1 Design history — B.2 Java language evaluation — B.3 Interface contract (normative) — B.4 Annotation vocabulary — B.5 Type system and runtime enforcement — B.6 Regime composition matrix — B.7 Residual risks — B.8 Worked example — B.9 Adoption strategy — B.10 Error handling and control law

---
