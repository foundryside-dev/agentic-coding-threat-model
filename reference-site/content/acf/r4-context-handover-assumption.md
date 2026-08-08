---
title: "ACF-R4: Context Handover Assumption"
weight: 13
acf_id: "ACF-R4"
acf_name: "Context Handover Assumption"
stride_category: "repudiation"
risk_level: "medium"
detection_status: "partial"
entry_type: "workflow-pattern"
relation: "agent-specific"
entry_status: "provisional"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: []
---

## Description

An agent produces an artefact — a review, a specification, a plan, or a set of recommendations — that defers actions to a future session or a different agent, implicitly assuming the consumer will have access to the producing agent's context. The artefact reads as actionable, but it is incomplete for its actual delivery path because required context remains in the producing session rather than in the artefact handed to the consumer. In agentic workflows, handover between sessions is not optional — reviewing agents hand off to implementing agents, planning agents hand off to coding agents, specification agents hand off to test-writing agents. Each handover crosses a context boundary, and the workflow cannot assume the producing agent has correctly modelled what the consumer will or will not see. The STRIDE fit is Repudiation: the handover artefact cannot be relied upon as a complete record of findings required by the next stage. Risk rises in workflows where handover artefacts are reviewed only once or where later-stage review is materially lighter — common in government specification review processes where the whole point of pre-implementation review is to avoid a second pass.

## STRIDE Mapping

**Category:** Repudiation

The handover artefact cannot be relied upon as a complete record of findings required by the next stage.

## Risk Rating

**Risk:** Medium

## Generative Mechanism

The workflow provides no basis to assume the producing agent has correctly modelled the information boundary between its session and the next. Within a session, deferred actions are reasonable — "I'll address this in the next function" works because the agent retains context. The same reasoning pattern applied *across* session boundaries produces undeliverable recommendations, because the agent does not distinguish between "defer within my session" and "defer to a session that cannot see my reasoning." Critically, this assumption is made implicitly — the agent does not produce a visible "I assume the implementer will have my context" step. It simply acts on that assumption, and the consequence (deferred, undeliverable actions) is the only observable signal.

## Code Examples

A reviewing agent produces specification-level findings:

```
Blocking: ctx.fingerprint_key is a spurious symbol.
  Fix: Replace with get_fingerprint_key() from security module.

High: on_no_results: continue enables silent semantic degradation.
  Fix in spec before implementation.

Medium: HTTP 401 classified as non-retryable (could be transient token expiry).
  Fix during implementation.
```

The blocking and high-priority fixes are specified inline — actionable regardless of consumer context. The medium-priority items are deferred to "implementation" — but the implementing agent will start a fresh session with the specification as input, not the review. Unless the review findings are written *into* the specification, the deferred items are silently dropped. The reviewing agent has produced a complete-looking triage that is incomplete for its actual delivery path.

## Impact

An important structural property distinguishes ACF-R4 from the other failure modes: it is naturally self-correcting under agentic review. If a reviewing agent's deferred findings are lost at the handover boundary and the implementing agent reproduces the same problems in code, a second review pass will generally catch the same issues — the reviewing agent's analytical frames do not depend on the first review's context. In workflows where review runs on every artefact, ACF-R4 is primarily an efficiency failure caught by the next cycle. The danger concentrates in workflows where review is run only once or where subsequent review is lighter. With that calibration: the output looks like a competent, prioritised review. A human reading it accumulates context across the conversation and can carry the deferred items forward — the human is the context bridge. An implementing agent given only the specification will reproduce the exact patterns the review flagged, because the specification still contains them and the review findings are not in the implementing agent's context. The failure is invisible at the review stage — the review *is* correct — and only manifests when the implementation proceeds without the deferred findings.

This is particularly consequential in multi-agent workflows that are becoming standard practice: a planning agent drafts a specification, a reviewing agent evaluates it, an implementing agent builds it, a testing agent verifies it. Each handover is a context boundary. Any finding, caveat, or design decision that lives in one agent's session but is not written into the artefact that crosses the boundary is lost — not forgotten, but never transmitted. The more handovers in the workflow, the more context boundaries exist, and the more opportunities for this failure to silently drop information that a human workflow participant would have carried forward.

## Detection Approaches

Detection is rated Partial because the surface pattern is identifiable — deferred-action language in agent-produced artefacts — but the semantic question (whether the deferral target actually has access to the finding) requires understanding the workflow's session topology. Heuristic indicators: recommendations that use future-tense deferral ("the implementer should," "address during," "fix in the next phase") without embedding the fix in the artefact the consumer will actually read; review findings triaged into priority tiers where lower-priority items are expected to survive by context transfer rather than by document modification; and plans that reference earlier-session findings by description rather than by embedding. The structural mitigation is to require that every handover artefact be self-contained: if information matters for the next session, it must be in the document, not in the conversation.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

Detection approaches for this provisional entry are under development.

## Related Entries

*No directly related core entries identified. ACF-R4 describes a workflow-level pattern distinct from the code-level failure modes in the core taxonomy.*

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
