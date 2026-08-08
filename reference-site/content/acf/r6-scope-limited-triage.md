---
title: "ACF-R6: Scope-Limited Triage"
weight: 15
acf_id: "ACF-R6"
acf_name: "Scope-Limited Triage"
stride_category: "repudiation"
risk_level: "medium"
detection_status: "none"
entry_type: "workflow-pattern"
relation: "agent-specific"
entry_status: "provisional"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: []
---

## Description

An agent encounters evidence of a problem — a failing test, a warning, a deprecation, a TODO with safety implications — and classifies it as out of scope. The agent narrates the triage decision ("pre-existing failure, unrelated to our changes"), moves on, and the problem becomes *less* visible than it was before the agent encountered it. The core failure is not that the agent ignores the problem — it is that the agent makes a triage decision that should be the human's to make, presented as a factual observation rather than a judgement call.

*Note: This entry describes a workflow-level pattern (agent triage behaviour during sessions) rather than a code-level pattern, and is derived from session transcript analysis rather than code artefact inspection. It requires further corroboration across a broader set of agentic workflows before it can be considered a settled taxonomic class.*

## STRIDE Mapping

**Category:** Repudiation

The agent's triage decision is an unauditable action — the agent made a judgement that affected what information the human received, that judgement is not recorded in any persistent artefact, and it cannot be reconstructed or challenged after the fact.

## Risk Rating

**Risk:** Medium

## Generative Mechanism

Agentic workflows are structured around task completion. Evidence that falls outside the defined scope is a distraction from task completion. Training data reinforces this: development workflows routinely triage unrelated failures as "known issues" to maintain focus. A human developer who triages a failing test as "not mine" has institutional context about whether the test matters, who owns it, and whether it has been triaged before. The agent has none of this context and substitutes confidence for knowledge.

## Code Examples

The following is a process description from an agent session transcript, illustrating how the triage decision unfolds:

```
> Bash(pytest tests/ -x -q 2>&1 | tail -20)
  FAILED tests/unit/plugins/llm/test_llm_config.py::test_reserved_suffix_warns
     1 failed, 847 passed

> Good — the failing test is in test_llm_config.py which we didn't
  touch. Let me confirm it fails on the unchanged code too.

> Bash(git stash && pytest tests/.../test_llm_config.py -x -q)
  FAILED

> Pre-existing failure, unrelated to our changes.
```

The agent confirms the failure is pre-existing, narrates it as unrelated, and moves on. The triage is reasonable in isolation — the failure genuinely predates the agent's changes. But the agent has made a judgement call (this failure does not need to be surfaced for human decision) and presented it as a factual observation (pre-existing, unrelated). The human never sees the failure.

## Impact

In agentic workflows with multiple sessions over days or weeks, scope-limited triage creates an accumulated tenure problem: each session encounters the pre-existing failure, confirms it was already failing, and moves on. The failure is surfaced repeatedly, triaged repeatedly, and addressed never — because every session correctly determines it is "not my problem." Nobody is negligent. The failure accumulates anyway. In contracted development, an agent triaging a pre-existing defect as out-of-scope is making a contractual decision that the contracting agency might disagree with.

## Detection Approaches

No code-level tool detects this — it is a workflow behaviour. Detection requires transcript-level analysis: flag sessions that encounter test failures and do not surface them for human decision, and track which failures accumulate tenure across multiple sessions.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

Detection approaches for this provisional entry are under development.

## Related Entries

*No directly related core entries identified. ACF-R6 describes a workflow-level pattern distinct from the code-level failure modes in the core taxonomy.*

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
