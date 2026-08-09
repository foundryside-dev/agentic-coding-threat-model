---
title: "ACF-R4: Context Handover Assumption"
sidebar:
  label: "ACF-R4: Context Handover Assumption"
  order: 19
acf:
  id: ACF-R4
  name: Context Handover Assumption
  stride: repudiation
  failure_layer: context-collapse
  entry_type: workflow-pattern
  relation: agent-specific
  risk_level: medium
  detection_status: partial
  portable_coverage: not-covered
  entry_status: provisional
  language_generality: language-general
  related: []
---

## Description

An agent produces a review, specification, plan, or recommendation that defers actions to a later session while assuming the consumer will have the producing session's context. The artefact looks actionable but is incomplete for its delivery path because required reasoning remains in the conversation rather than in the handed-over document.

Every planning, review, implementation, or testing handover crosses a context boundary. The handover artefact cannot be relied on as the complete record when a decision or caveat exists only in the producing session.

The pattern is often self-correcting when every later artefact receives an equally thorough review. Risk concentrates where review happens once or later review is materially lighter: a human may bridge the conversational context, but a new agent given only the specification cannot.

## Why agents produce this

Deferring work inside one session is reasonable because the agent retains context. Applying the same reasoning across sessions creates undeliverable recommendations. The assumption is implicit: the agent does not state that a future implementer will have the review context, but writes as though the context boundary does not exist.

## Example

```text
Blocking: ctx.fingerprint_key is a spurious symbol.
  Fix: Replace with get_fingerprint_key() from security module.

High: on_no_results: continue enables silent semantic degradation.
  Fix in spec before implementation.

Medium: HTTP 401 classified as non-retryable.
  Fix during implementation.
```

The first findings are embedded in the specification and remain actionable. The medium finding is deferred to an implementation session that may receive only the specification, so the information is silently lost at handover.

## Detection

Surface indicators include future-tense recommendations such as “the implementer should” or “fix in the next phase” where the needed change is not embedded in the artefact that consumer will read. Determining whether this is an actual failure requires understanding the workflow's session topology. The structural mitigation is self-contained handover: information needed by the next session belongs in the document, not only in the conversation.
