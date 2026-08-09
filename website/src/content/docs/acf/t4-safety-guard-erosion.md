---
title: "ACF-T4: Safety Guard Erosion"
sidebar:
  label: "ACF-T4: Safety Guard Erosion"
  order: 18
acf:
  id: ACF-T4
  name: Safety Guard Erosion
  stride: tampering
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: medium
  detection_status: none
  portable_coverage: not-covered
  entry_status: provisional
  language_generality: language-general
  related: [ACF-S4, ACF-R5]
---

## Description

Existing precondition guards—assertions, defensive raises, and invariant checks—are removed or weakened during agent-performed refactoring. The characteristic guards protect paths the present test suite does not exercise. A check that appears redundant under today's construction order exists to catch future initialisation, subclass, or call-path changes.

Removing such guards reverses institutional learning. The same outcome can arise when an agent adds code without adopting established safety conventions: the guard does not appear in the diff because it was never created.

## Why agents produce this

Agents optimise for the local coherence of the code they are editing. A guard looks redundant when the nearby path always satisfies it, and training data reinforces simplification, dead-code removal, and trust in the type system. The agent applies those principles without evaluating the guard's future-regression purpose or inspecting peer modules for project-specific conventions.

## Example

```python
# Before refactoring: an explicit precondition.
class DataverseSource:
    def _paginate(self):
        assert self._client is not None, "pagination called before connect()"
        # Pagination logic.


# After agent refactoring: the guard is removed as unnecessary.
class DataverseSource:
    def _paginate(self):
        # _client is assigned by today's __enter__ path, but a future caller
        # can now fail later with a confusing NoneType error.
        pass
```

Safety guards are typically added after an incident or because an experienced developer understands what can go wrong. Removing them silently reverses institutional learning. This maintenance-phase failure can arrive at campaign scale through a directive as well as through a local refactor: Appendix E.8 records a near-miss in which a remediation ticket marked an anti-masquerading guard for deletion. The campaign would have removed a control it existed to install and was stopped only because the executing session checked the ticket against its governing decision records.

A related convention-drift pattern reaches the same unsafe state when new code fails to *adopt* an established guard. In the case study, peer checkpoint modules established rigorous deserialisation using set-based required-field checks, `isinstance` type guards, and `AuditIntegrityError` for anomalies. A later module written by the same agent used `int()` and `str()` coercion instead—the statistically common training-data pattern rather than the project convention. The peer modules were available, but the agent did not consult them. Unless CI enforces the convention, new additions drift while still looking correct in isolation.

## Detection

No existing tool detects this class. Diff analysis could flag removed assertions and `if ... raise` guards, particularly where tests do not cover the path. Flagging all removed guards would be noisy, so coverage context is essential. Detecting absent adoption of an established convention is harder and requires a model of which safety patterns should appear in each context.

## Distinguished from

**ACF-S4 vs ACF-T4:** Both describe the removal of a safety mechanism rather than satisfaction of it. T4 removes runtime guards (assertions, defensive raises); S4 removes static analysis guards (type annotations, type-checker constraints). Both are maintenance-phase failures — they appear when agents are resolving errors, not when generating greenfield code.

**ACF-T4 vs ACF-R5:** T4 (guard erosion) can manifest as part of R5 — a remediation commit that removes safety guards not related to the original violation. Both are maintenance-phase failures targeting the gap between greenfield authoring and code modification.
