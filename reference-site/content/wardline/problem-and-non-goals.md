---
title: "The Problem and Non-Goals"
weight: 2
---

## The problem a wardline solves

There is a structural gap between what automated tooling checks and what high-stakes code requires. The standard assurance stack — linters, type checkers, SAST, DAST, unit tests, conventional peer review — verifies *syntactic* and *conventional* correctness. It cannot determine whether a fallback default is institutionally appropriate, whether an exception handler preserves the audit trail, or whether data crossing a trust boundary has actually been validated on the way through.

Agent-generated code exploits this gap systematically. A `.get("security_classification", "OFFICIAL")` is syntactically identical to `.get("city", "Sydney")`. The first silently downgrades a document's classification; the second supplies a harmless location default. No tool in the standard assurance stack distinguishes them, because the distinction is *semantic*.

A wardline closes part of that gap by supplying the context the tool cannot infer. Once a function declares that it produces trusted data, the analyser has something to check against. The declaration is the missing premise: without it every function looks alike; with it a specific, checkable claim exists to be falsified.

## Where the implementation lands relative to that ambition

> [!WARNING]
> **Wardline does not decide whether a particular field may carry a fallback default.** The rule designed to do that — `WL-001`, the parent paper's flagship `.get()` example — **was never built**. This is the single largest gap between the paper's argument and the tool.

What the implementation does decide:

- Whether **trust flows are consistent with declarations** — whether untrusted data reaches a trusted producer, whether a boundary that claims to validate is capable of rejecting anything, whether an exception handler in a trusted function silently destroys the failure it caught.
- Whether, through the same taint engine, **untrusted data reaches a dangerous sink**.

## What is and is not novel

| | Claim |
|---|---|
| **Not novel** | Roughly half the rule set is classic sink analysis — command execution, deserialisation, dynamic code and dynamic import, path traversal, SSRF, SQL injection, XXE, SSTI, native-library loading, log-format injection, SMTP send. Any competent SAST product covers this ground. Those rules exist because the trust-taint engine already had to track untrusted data, and pointing it at sinks was nearly free. |
| **Novel** | The annotation-driven trust model underneath. Severity is modulated by the *declared* trust tier of the function a finding fires in, so the same pattern is an error in a trusted producer, a downgraded warning in a partially-validated function, and **silent in undecorated code**. That is what lets a scanner run over a large existing codebase and say nothing at all until someone opts a function in. |

The designed specification claimed a different novelty — "the governance topology that surrounds them". Half of that claim survives. The tier-modulated severity model and the fingerprint baseline exist and work. **The governance topology does not:** the suppression files carry no ownership, no reviewer identity, and no signatures, and their source modules say "No governance" in as many words. That is a deliberate design position, argued in [Gates, suppression, and the judge]({{< relref "gates-suppression-and-judge" >}}#the-no-governance-position).

## Coverage against the ACF taxonomy

Written against what the implementation ships, not against the designed rule set. **"Not covered" means exactly that:** no rule fires, and no inference in the engine addresses the mode.

| ACF entry | Wardline coverage as built |
|---|---|
| [ACF-S1]({{< relref "/acf/s1-competence-spoofing" >}}) Fabricated Default | **Not covered.** The designed `WL-001` was never built. The largest single gap between the parent paper's argument and the tool. |
| [ACF-S2]({{< relref "/acf/s2-hallucinated-field-access" >}}) Spurious Field Access | **Not covered.** `WL-002` and the type-system enforcement layer were both designed and not built. |
| [ACF-S3]({{< relref "/acf/s3-structural-identity-spoofing" >}}) Structural Identity Spoofing | **Not covered directly.** `PY-WL-123` (reflective `setattr`/`getattr`, CWE-915) fires on tainted-data-driven attribute access — adjacent, but a sink rule, not a structural-identity rule. |
| [ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) Authority Tier Conflation | **Covered.** The core case: `PY-WL-101` and `PY-WL-105`, over the project-level taint fixed point. |
| [ACF-T2]({{< relref "/acf/t2-silent-coercion" >}}) Silent Coercion | **Not covered.** Default-based coercion was `WL-001`'s territory; broader coercion was out of scope in the design and remains so. |
| [ACF-T3]({{< relref "/acf/t3-unstructured-signal-parsing" >}}) Unstructured Signal Parsing | **Not covered.** Substring matching on exception text inside audit-critical handlers has no rule. |
| [ACF-T4]({{< relref "/acf/t4-safety-guard-erosion" >}}) Safety Guard Erosion *(provisional)* | **Not covered.** T4 is a diff-level pattern across commits; wardline analyses a tree, not a history. |
| [ACF-R1]({{< relref "/acf/r1-audit-trail-destruction" >}}) Audit Trail Destruction | **Partially covered.** `PY-WL-103` and `PY-WL-104` cover the form where an audit-critical failure is caught and execution continues. The form where audit-critical operations propagate failures as untyped exceptions is not covered. |
| [ACF-R2]({{< relref "/acf/r2-partial-completion" >}}) Partial Completion | **Partially covered**, by the same two exception rules. The designed audit-primacy and atomicity annotations were not built. |
| [ACF-R3]({{< relref "/acf/r3-verification-displacement" >}}) Verification Displacement | **Not covered.** Test-structure analysis — mock provenance, factory bypass — is outside the implementation's scope. |
| [ACF-R4]({{< relref "/acf/r4-context-handover-assumption" >}}) Context Handover Assumption *(provisional)* | **Not covered** — a workflow pattern, not a code pattern. |
| [ACF-R5]({{< relref "/acf/r5-remediation-induced-violation" >}}) Remediation-Induced Violation | **Indirect only.** Wardline catches a new violation introduced by a fix if it falls under an existing rule, but does not target remediation as a source. |
| [ACF-R6]({{< relref "/acf/r6-scope-limited-triage" >}}) Scope-Limited Triage *(provisional)* | **Not covered** — requires transcript-level analysis. |
| [ACF-I1]({{< relref "/acf/i1-verbose-error-response" >}}) Verbose Error Response | **Not covered.** The designed secret-handling and data-sensitivity annotation groups were not built. `PY-WL-125` touches the logging path but targets injection, not disclosure. |
| [ACF-D1]({{< relref "/acf/d1-finding-flood" >}}) / [ACF-D2]({{< relref "/acf/d2-review-capacity-exhaustion" >}}) | **Not addressable by rules** — process threats. The implementation attacks them from the other side: a corpus-enforced false-positive rate gate of ≤ 5%, clean-shape sentinels that must stay silent, and the opt-in posture that keeps undecorated code silent. Reducing the flood is a design constraint, not a rule. |
| [ACF-E1]({{< relref "/acf/e1-implicit-privilege-grant" >}}) Implicit Privilege Grant | **Covered**, by the same trust-flow enforcement as ACF-T1. |
| [ACF-E2]({{< relref "/acf/e2-unvalidated-delegation" >}}) Unvalidated Delegation | **Partially covered.** The sink family — `PY-WL-106`/`107`/`108`/`112`/`115`/`124` — catches untrusted data reaching deserialisation, dynamic execution, command execution, dynamic import, and native-library loading. Authorisation-check-before-action is not modelled. |
| [ACF-S4]({{< relref "/acf/s4-type-annotation-erosion" >}}) Type Annotation Erosion *(provisional)* | **Not covered.** S4 degrades a type system the implementation does not use for enforcement — the analysis is annotation-driven, not type-driven. |
| [ACF-S5]({{< relref "/acf/s5-type-structure-avoidance" >}}) Type Structure Avoidance *(provisional)* | **Not covered**, for the same reason as S4. |

**The honest arithmetic:** five entries are covered or partially covered — ACF-T1, ACF-R1, ACF-R2, ACF-E1, ACF-E2 — and they cluster tightly around trust flow and exception handling, which is precisely where the implemented engine has purchase.

## Non-goals

Stated flatly, because most of the ways a wardline deployment produces false assurance begin with someone assuming one of them is in scope.

1. **Wardline does not prove semantic correctness.** It detects structural proxies for semantic violations in declared contexts. It can decide whether a validating boundary is *capable of rejecting anything*; it cannot decide whether it rejects the *right* thing. A validator with a rejection path that checks the wrong predicate passes every rule.
2. **Wardline does not replace human judgement.** It structures what judgement must address — where the boundaries are, which are load-bearing, which findings are worth a waiver. It does not resolve those questions and does not record who resolved them.
3. **Wardline does not establish provenance across storage boundaries.** Trusted restoration boundaries with four categories of provenance evidence were designed and never built. What exists is `PY-WL-120`, which flags stored or persisted taint reaching a trusted state — a conservative rule, not a provenance model.
4. **Wardline does not eliminate ordinary assurance controls.** It supplements them. Roughly half its rule set overlaps with a mature SAST product; the half that does not is the trust-declaration layer, and that layer assumes the rest of the stack is doing its job.
5. **Wardline is static only.** There is no type-system enforcement layer and no runtime structural layer; both were designed and neither was built. The decorators are runtime no-ops by design — they mark, they do not check.
6. **Wardline does not guarantee coverage of risky code paths, and by design does not try to.** Coverage is a function of declaration investment, and undeclared code is outside the enforcement perimeter as a matter of definition, not oversight.
7. **Wardline does not replace software design.** It says nothing about performance trade-offs, library choices, concurrency models, deployment constraints, or operational assumptions.

## The opt-in corollary

Non-goal 6 deserves its own statement — it is the design position that most distinguishes the implementation from the designed specification, and the one most easily mistaken for a weakness.

**Wardline is silent until you opt in.** Mechanically: undecorated code resolves to `UNKNOWN_RAW`, and the tier-modulated severity model treats that state as the freedom zone and suppresses to `NONE`. This applies to the sink rules as well as the boundary rules. A scan over a large untouched codebase produces no policy findings at all.

This is the opposite of the usual static-analysis posture. It buys two things:

- adoption without a suppression bankruptcy on day one, and
- findings that are about a claim someone actually made, rather than a pattern someone might not have intended.

A separate, independently enforced control — a labelled-corpus false-positive rate gate of ≤ 5% — constrains precision on the code that *has* opted in.

### The cost, and the compensating control

> [!CAUTION]
> **A project that declares nothing gets a green gate that is enforcing nothing.** `wardline scan . --fail-on ERROR` over an unannotated codebase exits 0. That is not a bug — there are no declarations to violate — but it is indistinguishable, from the outside, from a codebase that passes because it is clean.

The answer is the **inertness trip**: a scan that recognises no trust boundaries over a non-trivial amount of code is *inert*, and `--fail-on-inert` turns that verdict into a gate failure **that no suppression can clear**. See [Gates, suppression, and the judge]({{< relref "gates-suppression-and-judge" >}}#inertness) for the mechanics.

The flag is **off by default**, alongside its sibling `--fail-on-unanalyzed`. The compensating control is a switch a deploying team throws, not a posture the tool ships with. A deployment that adopts the opt-in posture without the inertness trip has bought a green light and nothing else.

## See also

- [Rules]({{< relref "rules" >}}) — what actually fires
- [Verification Properties]({{< relref "verification" >}}) — the false-positive gate and the corpus behind it
- [Roadmap: The Unbuilt]({{< relref "roadmap-the-unbuilt" >}}) — the designed rules that would have closed the ACF gaps
