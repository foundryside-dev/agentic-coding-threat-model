---
title: "ACF-D2: Review Capacity Exhaustion"
sidebar:
  label: "ACF-D2: Review Capacity Exhaustion"
  order: 13
acf:
  id: ACF-D2
  name: Review Capacity Exhaustion
  stride: denial-of-service
  failure_layer: process-volume
  entry_type: process-threat
  relation: agent-specific
  risk_level: high
  detection_status: na
  portable_coverage: na-design-constraint
  entry_status: core
  language_generality: language-general
  related: [ACF-D1]
---

## Description

Agent code-generation velocity exceeds the organisation's capacity for security-focussed review, degrading review from active verification to passive scanning. The organisation retains apparent review coverage while subtle issues pass undetected and the gap between perceived and actual assurance widens silently.

## Why this happens

Agents generate plausible, convention-conforming code faster than review processes were designed to absorb. Review capacity does not scale at the same rate. Review becomes a bottleneck, and organisations may respond by lowering the review bar instead of reducing generation volume.

## Process failure mode

1. Code-generation velocity increases as agents are adopted more broadly.
2. Review queues grow and reviewers fall behind.
3. Pressure to keep up shortens review time per change.
4. Review shifts from active verification to passive scanning.
5. Subtle issues requiring careful analysis pass undetected.
6. The organisation believes it has review coverage after review loses its assurance value.

D2 affects all human code review. It is broader than D1, which specifically floods static-analysis triage.

## Detection and mitigation

- Automate mechanical pre-screening so reviewers can focus on semantic analysis.
- Track the ratio of generated code to review capacity and flag unsustainable volume.
- Measure review effectiveness, not only completed-review counts.
- Define which generated changes require full security review and which can rely on automated checks.

## Distinguished from

**ACF-D1 vs ACF-D2:** D1 is an upstream cause — agents generate a high volume of findings that flood the review pipeline. D2 is the downstream effect — sustained volume degrades human review quality through habituation and fatigue. D1 can be addressed with precision-gated tooling; D2 requires capacity planning and review effectiveness measurement.
