---
title: "ACF-T4: Safety Guard Erosion"
weight: 9
acf_id: "ACF-T4"
acf_name: "Safety Guard Erosion"
stride_category: "tampering"
risk_level: "medium"
detection_status: "none"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "provisional"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-S4", "ACF-R5"]
---

## Description

Existing precondition guards — assertions, defensive raises, invariant checks — are removed or weakened during agent-performed refactoring. The specific failure shape: guards that protect preconditions on code paths *not currently exercised by the test suite*. The assertion that is "obviously redundant" because the current code always satisfies it exists to catch future code paths that do not — initialisation reordering, new construction paths, subclass overrides. The agent cannot model future modifications and removes the guard as dead code.

## STRIDE Mapping

**Category:** Tampering | **Risk:** Medium | **Detection:** None

Safety guard erosion is a tampering failure because it removes integrity controls that protect preconditions. The guards themselves are not data, but their removal changes the system's behaviour under future conditions — weakening the boundary between valid and invalid states.

## Generative Mechanism

Agents optimise for the local coherence of the code they are editing. An assertion checking `self._client is not None` looks redundant when the agent can see that `_client` is assigned in `connect()`, called in `__enter__()`. But the assertion exists to catch a future code path that calls `_paginate()` before `connect()` completes. Training data reinforces this: "remove dead code," "simplify assertions," "trust the type system" are sound principles for human developers who can evaluate future-regression risk. Agents apply them without that evaluation.

## Risk Rating

**Medium.** Exploitable under specific conditions — specifically when future code paths exercise the precondition that the removed guard was protecting. The blast radius depends on the criticality of the guarded invariant and the time between guard removal and the introduction of the violating code path.

## Code Examples

```python
# Before refactoring — assertion guards a precondition
class DataverseSource:
    def _paginate(self):
        assert self._client is not None, "pagination called before connect()"
        # ... pagination logic

# After agent refactoring — assertion removed as "unnecessary"
class DataverseSource:
    def _paginate(self):
        # Agent: _client assigned in connect(), called in __enter__().
        # "Obviously not None here." Guard removed.
        # A future code path that calls _paginate before connect()
        # will get a confusing NoneType error instead of the assertion.
```

### Convention drift — failure to adopt established guards

A related pattern — not removal of existing guards but failure to *adopt* established conventions in new code — produces the same outcome through a different path. In a project where peer modules establish a rigorous deserialisation pattern (set-based required-field checks, `isinstance` type guards, `AuditIntegrityError` on any anomaly), a later module written by the same agent may default to `int()`/`str()` coercion instead — the statistically common pattern from training data, not the project convention. The peer modules were available as examples. The agent did not consult them. Unless CI enforces the convention, later additions drift from it, and the drift is invisible because the new code looks correct in isolation.

## Impact

Safety guards are typically added in response to a past incident or an experienced developer's understanding of what can go wrong. Removing them silently reverses institutional learning. This is a maintenance-phase failure — it appears during refactoring, not during initial code generation, and targets a gap in the core taxonomy's coverage.

## Detection Approaches

No existing tool detects this. Structural detection is feasible: flag removed `assert` statements and `if ... raise` guard patterns in agent-generated diffs, but only on code paths not covered by the current test suite. This scoping is critical — flagging all removed guards would produce unacceptable noise. The related convention-drift pattern (new code not adopting established guards) is harder to detect because there is no before/after diff to compare — the guard was never present. Detection would require a convention-expectation model that specifies which patterns should appear in which contexts, then flags their absence in new code.

## Prevention

Detection approaches for this provisional entry are under development.

## Related Entries

- [ACF-S4: Type Annotation Erosion](../s4-type-annotation-erosion/) — Both describe the removal of a safety mechanism rather than satisfaction of it. T4 removes runtime guards (assertions, defensive raises); S4 removes static analysis guards (type annotations, type-checker constraints). Both are maintenance-phase failures.
- [ACF-R5: Remediation-Induced Violation](../r5-remediation-induced-violation/) — T4 (guard erosion) can manifest as part of R5 — a remediation commit that removes safety guards not related to the original violation. Both are maintenance-phase failures targeting the gap between greenfield authoring and code modification.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
