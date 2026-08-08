---
title: "Threat Model"
weight: 1
bookCollapseSection: true
---

The threat model examines how AI coding agents introduce novel failure modes into the software development lifecycle, with particular focus on systems subject to formal security controls such as the Australian Information Security Manual (ISM).

| Page | Description |
|------|-------------|
| [Introduction and Scope]({{< relref "introduction" >}}) | What this paper addresses, why now, methodology |
| [The Threat Landscape]({{< relref "threat-landscape" >}}) | The intuitive vs. insidious threat model |
| [Trust Boundaries]({{< relref "trust-boundaries" >}}) | Authority tier model, bidirectional collapse, agent code as untrusted input, and the layered validation boundary |
| [The Review Problem]({{< relref "review-problem" >}}) | Asymmetry, habituation, automation bias, advisory fatigue, and why human review is structurally insufficient for agent-generated code |
| [STRIDE Applied to Agentic Code]({{< relref "stride" >}}) | Failure modes classified by threat category |
| [The Guidance Gap]({{< relref "guidance-gap" >}}) | Gap analysis across ISM, NIST SSDF, Essential Eight, OWASP, and contracted development — detection coverage, structural gaps, and candidate ISM extensions |
| [The Response Landscape]({{< relref "response-landscape" >}}) | Process, technical, and policy controls; validation maturity stages; implementation approaches; incident response for systematic agent defects |
| [Open Questions]({{< relref "open-questions" >}}) | 17 unresolved governance, operational, and research questions — accreditation, review measurement, correlated failures, contracted development, testing strategy, and deferred scope |
