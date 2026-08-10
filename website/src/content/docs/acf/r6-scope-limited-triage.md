---
title: "ACF-R6: Scope-Limited Triage"
sidebar:
  label: "ACF-R6: Scope-Limited Triage"
  order: 20
acf:
  id: ACF-R6
  name: Scope-Limited Triage
  stride: repudiation
  failure_layer: context-collapse
  entry_type: workflow-pattern
  relation: agent-specific
  risk_level: medium
  detection_status: none
  portable_coverage: not-covered
  entry_status: provisional
  language_generality: language-general
  related: []
---

## Description

An agent encounters evidence of a problem—a failing test, warning, deprecation, or safety-relevant TODO—and classifies it as out of scope. The agent narrates the decision as fact, moves on, and makes the issue less visible than before. The failure is not merely ignoring a problem; it is making a triage decision that belongs to the human operator.

This is a workflow-level pattern derived from session behaviour rather than a code artefact. It requires broader corroboration before promotion from provisional status.

Repeated sessions create tenure without ownership: each session correctly confirms that the failure predates its changes, labels it unrelated, and leaves it for the next session. Nobody is individually negligent, yet the issue is repeatedly encountered and never addressed. In contracted work, calling a defect out of scope is also a contractual judgement the agent may lack authority to make.

## Why agents produce this

Agent workflows optimise for completing the assigned task. Unrelated evidence competes with that objective, and development training data reinforces triaging known or pre-existing failures to maintain focus. A human developer may know who owns the issue and whether it was previously accepted; the agent lacks that institutional context and substitutes confidence for knowledge.

## Example

```text
Test run:
  FAILED test_[component].py::test_reserved_suffix_warns
  1 failed, 847 passed

Agent:
  The failing test is in a file we did not touch. It also fails on the
  unchanged code. Pre-existing failure, unrelated to our changes.
```

The provenance check is useful evidence, but it does not authorise the agent to decide that the user need not see or triage the failure.

## Detection

No code-level tool detects this workflow behaviour. Transcript analysis can flag sessions that encounter failures without surfacing them for human decision and can track failures that accumulate tenure across multiple sessions.
