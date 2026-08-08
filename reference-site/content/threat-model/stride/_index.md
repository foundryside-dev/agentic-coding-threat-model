---
title: "STRIDE Applied to Agentic Code"
weight: 5
bookCollapseSection: true
---

STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) is the established threat modelling framework used in Australian government security assessments. Applying it to agentic code output uses a structured vocabulary already familiar to policy audiences, rather than introducing unnecessary new terminology.

The application below extends STRIDE to treat **agent-generated code as an input** to the system — analogous to treating user input as untrusted. The agent is not an adversary, but its output has the same authority properties as any external input: it may be well-formed, it may be reasonable, but it has not been validated against the system's security requirements.

Two of the six categories — "fabricated default" (S) and the process-level DoS entries (D) — are **analogical extensions** of STRIDE's original technical-system categories to development-process analysis, proposed for ASD evaluation rather than presented as standard applications. STRIDE-LM (adding Lateral Movement) and the emerging ASTRIDE variant (adding AI Agent-Specific Attacks) provide precedent for such extensions, but the reader should understand these as novel mappings rather than established STRIDE doctrine.

## Data flow diagram

The standard artefact from a threat model is a data flow diagram (DFD). The most important observation from the DFD is that the AI model is an **external system** producing output that crosses a trust boundary into the repository — the same structural position as any external data source, warranting the same boundary discipline.

```text
Training Corpus ──► AI Model ──► [generated code (untrusted)]
      (external)    (external)           │
                                         ▼
                              ┌─ VALIDATION BOUNDARY ──────────────┐
                              │  Conventional checks               │
                              │  (lint, type, test, SAST)          │
                              │          │                         │
                              │  Semantic enforcement              │
                              │  (authority tier flow, audit,      │
                              │   defaults)                        │
                              │          │                         │
                              │  Human review                      │
                              │  (meaning, exceptions,             │
                              │   architecture)                    │
                              └────────────────────────────────────┘
                                    │                │
                                    ▼                ▼
                              Rejected         Repository
                              (quarantined)    (trusted store)
                                                    │
                                                    ▼
                                              CI/CD Pipeline
                                                    │
                                                    ▼
                                              Production System
```

## Threat categories

| Category | ACF Entries | Characterisation |
|----------|-------------|------------------|
| [Spoofing]({{< relref "spoofing" >}}) | ACF-S1 through ACF-S5 | 5 entries (3 core, 2 provisional) — agents fabricate competence signals and structural identities |
| [Tampering]({{< relref "tampering" >}}) | ACF-T1 through ACF-T4 | 4 entries (3 core, 1 provisional) — includes ACF-T1 (Critical), authority tier conflation |
| [Repudiation]({{< relref "repudiation" >}}) | ACF-R1 through ACF-R6 | 6 entries (4 core, 2 provisional) — audit trail destruction, verification displacement |
| [Information Disclosure]({{< relref "information-disclosure" >}}) | ACF-I1 | 1 entry (core) — verbose error responses |
| [Denial of Service]({{< relref "denial-of-service" >}}) | ACF-D1, ACF-D2 | 2 entries (both core) — finding flood and review capacity exhaustion |
| [Elevation of Privilege]({{< relref "elevation-of-privilege" >}}) | ACF-E1, ACF-E2 | 2 entries (both core) — includes ACF-E1 (Critical), implicit privilege grant |

## The compounding effect

These six threat categories do not operate independently. In practice, they compound — and the compounding produces a structural failure condition: agents generate a flood of code that follows established good practice, arriving at review boundaries faster than human assurance processes can absorb it, in the systems that have the least tolerance for those failure modes.

One illustrative scenario:

1. An agent generates code with **authority tier conflation** ([ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}})), creating the conditions for **implicit privilege grant** ([ACF-E1]({{< relref "/acf/e1-implicit-privilege-grant" >}})) — external API data used directly without validation.
2. Errors in that data are caught by a broad `except` block, producing **audit trail destruction** ([ACF-R1]({{< relref "/acf/r1-audit-trail-destruction" >}})).
3. The handler substitutes a default value rather than surfacing uncertainty — **fabricated default** ([ACF-S1]({{< relref "/acf/s1-competence-spoofing" >}})). Downstream components treat that fabricated value as authoritative.
4. Review volume pressure means the pattern is not detected before merge — **review capacity exhaustion** ([ACF-D2]({{< relref "/acf/d2-review-capacity-exhaustion" >}})).

Each individual pattern follows conventions generally regarded as good practice. The broad `except` block is responsible error handling. The default value is defensive programming. The direct API usage is clean integration code. A conventional review could approve each pattern individually, because each follows conventions reviewers are trained to accept. The compound effect is a system that silently produces wrong results, cannot explain why, and passed every review gate — not because the reviewer was negligent, but because every component followed established good practice for the wrong context.

A subtler compounding mechanism operates across time: upstream representational choices can collapse the semantic distinctions that downstream code needs. When a typed contract is flattened into a permissive dictionary structure, downstream defensive access patterns cease to look anomalous and begin to look prudent — upstream looseness manufactures the local conditions under which defensive handling appears justified. The [Trust Boundaries]({{< relref "/threat-model/trust-boundaries" >}}) section develops this as bidirectional authority collapse.

Case study evidence shows that this mechanism produced a latent bug that passed all automated checks and was only surfaced through four rounds of operator challenge. When agents produce these compounding shapes as a recurring characteristic rather than an occasional lapse, dormant but activatable defects accumulate. The resulting risk profile is qualitatively different from the same mistakes appearing sporadically at human velocity.

## Methodology note

Using a security framework (STRIDE) to categorise what is fundamentally a safety problem is a deliberate pragmatic choice — STRIDE is the vocabulary Australian government security assessments already use. The trade-off is that some mappings are more illuminating than others: T, I, and E map naturally; S is analogical (fabricated data presenting as authoritative, not identity forgery); D is the loosest fit (resource depletion, not an attack). The reader should weigh the individual failure modes on their merits, not on the strength of their STRIDE mapping.

The taxonomy intentionally mixes code-level semantic failures (S, T, I, E) and process-level assurance failures (D), because the central claim is that they interact: code-level failures pass review *because* of process-level failures.

It indexes observable artefacts rather than generative causes, since artefacts are what detection tools and review processes can act on. The categories above are the failure modes observed to date; the taxonomy is designed for extension.

For the full catalogue of all 20 failure modes, see the [ACF Taxonomy]({{< relref "acf" >}}).
