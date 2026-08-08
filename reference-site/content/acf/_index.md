---
title: "ACF Taxonomy"
weight: 2
---

The Agentic Code Failure (ACF) taxonomy catalogues failure modes observed in AI-generated code. Each entry documents the generative mechanism (why agents produce this pattern), detection approaches, and cross-references. The taxonomy currently contains 15 core entries and 5 provisional candidates, organised by STRIDE category.

### Spoofing

| ID | Name | Risk | Status |
|----|------|------|--------|
| [ACF-S1]({{< relref "s1-competence-spoofing" >}}) | Fabricated Default | High | Core |
| [ACF-S2]({{< relref "s2-hallucinated-field-access" >}}) | Spurious Field Access | High | Core |
| [ACF-S3]({{< relref "s3-structural-identity-spoofing" >}}) | Structural Identity Spoofing | High | Core |
| [ACF-S4]({{< relref "s4-type-annotation-erosion" >}}) | Type Annotation Erosion | High | Provisional |
| [ACF-S5]({{< relref "s5-type-structure-avoidance" >}}) | Type Structure Avoidance | High | Provisional |

### Tampering

| ID | Name | Risk | Status |
|----|------|------|--------|
| [ACF-T1]({{< relref "t1-authority-tier-conflation" >}}) | Authority Tier Conflation | Critical | Core |
| [ACF-T2]({{< relref "t2-silent-coercion" >}}) | Silent Coercion | Medium | Core |
| [ACF-T3]({{< relref "t3-unstructured-signal-parsing" >}}) | Unstructured Signal Parsing | High | Core |
| [ACF-T4]({{< relref "t4-safety-guard-erosion" >}}) | Safety Guard Erosion | Medium | Provisional |

### Repudiation

| ID | Name | Risk | Status |
|----|------|------|--------|
| [ACF-R1]({{< relref "r1-audit-trail-destruction" >}}) | Audit Trail Destruction | High | Core |
| [ACF-R2]({{< relref "r2-partial-completion" >}}) | Partial Completion | High | Core |
| [ACF-R3]({{< relref "r3-verification-displacement" >}}) | Verification Displacement | High | Core |
| [ACF-R4]({{< relref "r4-context-handover-assumption" >}}) | Context Handover Assumption | Medium | Provisional |
| [ACF-R5]({{< relref "r5-remediation-induced-violation" >}}) | Remediation-Induced Violation | High | Core |
| [ACF-R6]({{< relref "r6-scope-limited-triage" >}}) | Scope-Limited Triage | Medium | Provisional |

### Information Disclosure

| ID | Name | Risk | Status |
|----|------|------|--------|
| [ACF-I1]({{< relref "i1-verbose-error-response" >}}) | Verbose Error Response | Medium | Core |

### Denial of Service

| ID | Name | Risk | Status |
|----|------|------|--------|
| [ACF-D1]({{< relref "d1-finding-flood" >}}) | Finding Flood | High | Core |
| [ACF-D2]({{< relref "d2-review-capacity-exhaustion" >}}) | Review Capacity Exhaustion | High | Core |

### Elevation of Privilege

| ID | Name | Risk | Status |
|----|------|------|--------|
| [ACF-E1]({{< relref "e1-implicit-privilege-grant" >}}) | Implicit Privilege Grant | Critical | Core |
| [ACF-E2]({{< relref "e2-unvalidated-delegation" >}}) | Unvalidated Delegation | High | Core |

---

## See also

- [Autonomy Self-Assessment]({{< relref "appendices/autonomy-assessment" >}}) — assess your organisation's exposure to agentic code risks
