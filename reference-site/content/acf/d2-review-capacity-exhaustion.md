---
title: "ACF-D2: Review Capacity Exhaustion"
weight: 19
acf_id: "ACF-D2"
acf_name: "Review Capacity Exhaustion"
stride_category: "denial-of-service"
risk_level: "high"
detection_status: "na"
entry_type: "process-threat"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-D1"]
---

## Description

Agent code generation velocity exceeds the organisation's capacity for security-focussed review, degrading review from active verification to passive scanning. The organisation believes it has code review coverage, but the review has lost its security assurance value — subtle issues that require careful analysis pass through undetected.

## STRIDE Mapping

**Category:** Denial of Service

The denial of service target is the human code review process itself. Unlike ACF-D1 (which overwhelms the static analysis finding triage), ACF-D2 overwhelms the broader human code review process — all review, not just finding triage.

## Risk Rating

**High.** The gap between perceived and actual assurance widens silently. The organisation believes it has code review coverage, but the review has lost its security assurance value. Subtle issues that require careful analysis — the kind of issues catalogued throughout this taxonomy — pass through undetected because reviewers no longer have the time to evaluate them.

## Generative Mechanism

Agents can generate plausible, convention-conforming code faster than review processes were designed to absorb. Review capacity does not scale at the same rate. The review process becomes a bottleneck, and the organisational response is often to lower the review bar rather than reduce the generation rate. This is an emergent process threat driven by the aggregate velocity of agent-generated code, not by any individual code pattern.

## Process Failure Mode

Review capacity exhaustion manifests as a gradual degradation:

1. Code generation velocity increases as agents are adopted more broadly
2. Review queue depth grows — reviewers fall behind
3. Organisational pressure to "keep up" leads to shorter review times per change
4. Review shifts from active verification ("is this correct and secure?") to passive scanning ("does this look roughly right?")
5. Subtle security issues that require careful analysis pass through undetected
6. The organisation believes it has code review coverage, but the review has lost its security assurance value

Unlike ACF-D1 (finding flood), which overwhelms the static analysis review process, ACF-D2 overwhelms the human code review process itself. Both are process threats, but ACF-D2 is broader — it affects all review, not just finding triage.

## Impact

The gap between perceived and actual assurance widens silently. The organisation believes it has code review coverage, but the review has lost its security assurance value. Subtle issues that require careful analysis — the kind of issues catalogued throughout this taxonomy — pass through undetected because reviewers no longer have the time to evaluate them.

## Detection

N/A — this is a process threat, not a code pattern. Detection is through process metrics:

- Volume-aware capacity planning — track the ratio of generated code to review capacity and flag when it exceeds sustainable levels
- Measured review effectiveness metrics — track not just "reviews completed" but "issues found per review" as a quality indicator
- Automated pre-screening to reduce the human review burden — automated checks handle the mechanical verification, freeing reviewers for semantic analysis
- Review scope boundaries — define which generated code requires full security review vs. which can be covered by automated checks alone

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

As a process threat, ACF-D2 is not addressed by pattern rules. Mitigation requires organisational review practices:

- Automated pre-screening to reduce the human review burden
- Volume-aware capacity planning — track the ratio of generated code to review capacity
- Measured review effectiveness metrics — track "issues found per review" as a quality indicator
- Review scope boundaries — define which generated code requires full security review vs. automated checks alone

## Related Entries

ACF-D2 is closely related to [ACF-D1]({{< relref "/acf/d1-finding-flood" >}}) (Finding Flood). Both are process threats, but D1 overwhelms the static analysis review process specifically (finding triage), while D2 overwhelms the human code review process more broadly. D2 is the broader form — it affects all review, not just finding triage. Both are driven by the same underlying dynamic: agent-generated code volume exceeding the organisation's review capacity.

**Distinguishing D1 from D2:** D1 is an upstream cause — agents generate a high volume of findings that flood the review pipeline. D2 is the downstream effect — sustained volume degrades human review quality through habituation and fatigue. D1 can be addressed with precision-gated tooling; D2 requires capacity planning and review effectiveness measurement.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
