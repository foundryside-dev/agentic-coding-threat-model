---
title: "ACF-D1: Finding Flood"
weight: 18
acf_id: "ACF-D1"
acf_name: "Finding Flood"
stride_category: "denial-of-service"
risk_level: "high"
detection_status: "na"
entry_type: "process-threat"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-D2"]
---

## Description

The volume of static analysis findings on agent-generated code overwhelms reviewers, causing them to rubber-stamp findings without evaluation. The DoS is against the *review process*, not the system itself. This is distinct from a code pattern because the individual findings may each be legitimate — the threat is the aggregate volume, not any single finding.

## STRIDE Mapping

**Category:** Denial of Service

The denial of service target is the human review process, not a technical system. Agent-generated code produces findings at a volume that exceeds the review pipeline's capacity, degrading the process from active evaluation to passive dismissal.

## Risk Rating

**High.** A review process that rubber-stamps findings rather than evaluating them provides false assurance — the organisation believes its security posture is maintained while real issues pass through undetected. The gap between perceived and actual assurance widens silently as suppression rates rise.

## Generative Mechanism

Agents produce code at volume, and if that code triggers many findings, the review queue grows faster than the review capacity. Reviewers under volume pressure shift from evaluating each finding to batch-dismissing them. The finding flood is an emergent process threat: no single agent action causes it, but the aggregate output of agent-generated code systematically degrades the review process.

## Process Failure Mode

The finding flood creates a vicious cycle:

1. Agent generates code that triggers many static analysis findings
2. Review queue grows faster than reviewers can process it
3. Reviewers shift from careful evaluation to batch dismissal
4. Suppression rates rise, but the metric is treated as "findings resolved" rather than "findings ignored"
5. Real security issues are dismissed alongside false positives
6. The review process provides a false sense of security — it appears functional but has lost its filtering capability

This is distinct from a code pattern because the individual findings may each be legitimate. The threat is the aggregate volume, not any single finding.

## Impact

A review process that rubber-stamps findings rather than evaluating them provides false assurance — the organisation believes its security posture is maintained while real issues pass through undetected. The gap between perceived and actual assurance widens silently as suppression rates rise.

## Detection

N/A — this is a process threat, not a code pattern. Detection is through process metrics rather than technical controls:

- Measured suppression rates as a health metric — rising suppression rates signal review degradation
- Periodic audit of suppressed findings to verify they were genuinely false positives
- Finding caps per rule per file to prevent any single rule from flooding the queue
- Prioritised finding presentation (critical findings first, low-severity findings batched)
- Automated first-pass triage of findings and proposed exceptions — for example, a prompted model evaluating each flagged violation against the declared rule before it reaches a human — so that human attention is reserved for ambiguous or high-stakes cases. **Advisory only, never the authoritative gate**

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

As a process threat, ACF-D1 is not addressed by pattern rules. Mitigation requires organisational review practices:

- Finding caps per rule per file to prevent any single rule from flooding the queue
- Prioritised finding presentation (critical findings first, low-severity findings batched)
- Measured suppression rates as a health metric — rising suppression rates signal review degradation
- Periodic audit of suppressed findings to verify they were genuinely false positives
- Automated first-pass triage of findings and proposed exceptions — a prompted model evaluating each flagged violation against the declared rule before it reaches a human, so human attention is reserved for ambiguous or high-stakes cases. The division of labour is deliberate: the judge absorbs the flood, the human holds the authority. **Advisory only, never the authoritative gate** — see the [validation boundary as built]({{< relref "/appendices/case-study" >}}#postscript-the-validation-boundary-as-built)

## Related Entries

ACF-D1 is closely related to [ACF-D2]({{< relref "/acf/d2-review-capacity-exhaustion" >}}) (Review Capacity Exhaustion). Both are process threats, but D1 overwhelms the static analysis review process specifically (finding triage), while D2 overwhelms the human code review process more broadly. D1 is a narrower form of the same organisational pressure that D2 describes — both degrade assurance through volume rather than through any individual code defect.

**Distinguishing D1 from D2:** D1 is an upstream cause — agents generate a high volume of findings that flood the review pipeline. D2 is the downstream effect — sustained volume degrades human review quality through habituation and fatigue. D1 can be addressed with precision-gated tooling; D2 requires capacity planning and review effectiveness measurement.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
