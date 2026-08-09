---
title: "ACF-D1: Finding Flood"
sidebar:
  label: "ACF-D1: Finding Flood"
  order: 12
acf:
  id: ACF-D1
  name: Finding Flood
  stride: denial-of-service
  failure_layer: process-volume
  entry_type: process-threat
  relation: agent-specific
  risk_level: high
  detection_status: na
  portable_coverage: na-design-constraint
  entry_status: core
  language_generality: language-general
  related: [ACF-D2]
---

## Description

The volume of static-analysis findings on agent-generated code overwhelms reviewers, causing them to rubber-stamp findings without evaluating them. A process that records findings as resolved without evaluating them provides false assurance while genuine security issues pass undetected.

## Why this happens

Agents produce code at volume. When that code triggers many findings, the review queue grows faster than review capacity. Reviewers under pressure shift from evaluating each finding to batch dismissal. The denial of service is against the review process, not the running system.

## Process failure mode

1. An agent generates code that triggers many static-analysis findings.
2. The review queue grows faster than reviewers can process it.
3. Reviewers shift from careful evaluation to batch dismissal.
4. Suppression rises, but the metric records “findings resolved” rather than “findings ignored”.
5. Genuine security issues are dismissed alongside false positives.
6. The review process appears functional after losing its filtering capability.

The individual findings may each be legitimate. The threat is their aggregate volume, not any single finding.

## Detection and mitigation

- Cap findings per rule and file so no rule can flood the queue.
- Present critical findings first and batch low-severity findings.
- Treat rising suppression rates as a review-health signal.
- Audit suppressed findings periodically to confirm they were false positives.
- Use automated first-pass triage to reserve human attention for ambiguous or high-stakes cases, but keep automation advisory rather than authoritative.

## Distinguished from

**ACF-D1 vs ACF-D2:** D1 is an upstream cause — agents generate a high volume of findings that flood the review pipeline. D2 is the downstream effect — sustained volume degrades human review quality through habituation and fatigue. D1 can be addressed with precision-gated tooling; D2 requires capacity planning and review effectiveness measurement.
