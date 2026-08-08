---
title: "Denial of Service"
weight: 5
stride_slug: "denial-of-service"
---

In traditional STRIDE analysis, denial of service involves an attacker exhausting a system's resources — network bandwidth, CPU, memory, connection pools — rendering it unable to serve legitimate requests. The attack targets *availability* of a runtime service.

The agentic variant extends STRIDE to the development lifecycle: the "service" being denied is the **review process** — a security control per ISM-2060/2061 — not a user-facing system.

*Note: This is an **analogical extension** of STRIDE — the loosest fit of the six categories. Resource depletion of a security control, not an attack on a runtime system. The reader should weigh the failure modes on their merits, not on the strength of the STRIDE mapping.*

## Mechanism

This is not a code pattern — it is a *process* threat that operates at two scales.

At **individual scale**, when agents generate code at multiples of human velocity, the review queue grows proportionally. Reviewers under volume pressure shift from careful semantic review to surface-level scanning. The review process — which is a security control — degrades to a rubber stamp.

At **organisational scale**, the same dynamic overwhelms the review processes themselves:

- The security team's capacity to evaluate changes
- The IRAP assessment pipeline's ability to keep pace with the rate of system change
- The audit function's ability to maintain meaningful coverage

The degradation compounds: individual reviewers fatigue, which degrades team-level review quality, which degrades the organisational assurance that depends on those reviews.

A **secondary mechanism**: when automated analysis tools produce too many findings on agent-generated code, reviewers habituate to dismissing findings, and genuine security issues are lost in the noise.

## Why existing controls miss it

Existing controls assume review capacity scales with code generation rate. In practice, it does not. The control's effectiveness is inversely proportional to the volume it processes — the opposite of how every other component in the pipeline scales.

## Risk in government context

Security review as a compliance checkbox rather than an effective control, accreditation based on a process that no longer provides the assurance it claims to provide.

## ACF entries in this category

The ACF taxonomy separates the Denial of Service category into two core failure modes. They have different upstream drivers and different mitigation strategies, even though both degrade the same security control:

- [ACF-D1: Finding Flood]({{< relref "/acf/d1-finding-flood" >}}) — automated analysis findings that overwhelm reviewers
- [ACF-D2: Review Capacity Exhaustion]({{< relref "/acf/d2-review-capacity-exhaustion" >}}) — review process degraded by volume pressure

## See also

- [ACF Taxonomy Index]({{< relref "/acf" >}}) — complete taxonomy of AI code failure modes
- [Spoofing]({{< relref "spoofing" >}}) — code-level failures that pass review because of review pressure
- [Repudiation]({{< relref "repudiation" >}}) — audit-destroying patterns approved under volume pressure
