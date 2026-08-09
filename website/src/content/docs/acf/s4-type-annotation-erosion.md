---
title: "ACF-S4: Type Annotation Erosion"
sidebar:
  label: "ACF-S4: Type Annotation Erosion"
  order: 16
acf:
  id: ACF-S4
  name: Type Annotation Erosion
  stride: spoofing
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  portable_coverage: not-covered
  entry_status: provisional
  language_generality: python-specific
  related: [ACF-S2, ACF-S5, ACF-T4]
---

## Description

Type annotations are weakened or suppressed—through `# type: ignore`, widening a typed value to `Any`, or inserting `cast()`—to clear type errors instead of fixing the underlying mismatch. The code appears type-safe because the checker reports no errors, while the relevant safety constraint has been removed.

This is a meta-failure. It disables detection for other entries: a spurious field access is detectable only while the object has a declared type. Each local suppression expands a blind spot, and an explicit `Any` or ignore comment misrepresents participation in the type system.

## Why agents produce this

Resolving a type mismatch correctly requires understanding and satisfying the type hierarchy. Suppression is shorter, locally complete, and avoids coordinated changes. Agents optimising for local coherence and small diffs therefore reach for the action that clears the immediate checker error, even though it removes the constraint that exposed the problem.

## Example

```python
# Suppression clears the error and disables later field checking.
def check_threshold(assessment: Any):  # was Assessment
    # type: ignore[union-attr]
    if assessment.risk_rating > 5:
        escalate(assessment)


# The constraint is satisfied instead of removed.
def check_threshold(assessment: Assessment):
    if assessment.risk_rating is None:
        raise MissingRiskRating(assessment.id)
    if assessment.risk_rating > 5:
        escalate(assessment)
```

This is a meta-failure — it degrades the detection capability for other taxonomy entries. ACF-S2 (Spurious Field Access) is detectable by mypy *if the object is fully annotated*. ACF-S3 (Structural Identity Spoofing) is detectable by `isinstance` checks *if the type hierarchy is maintained*. When an agent widens a parameter to `Any` or adds `# type: ignore`, those detection mechanisms are disabled for the affected path. The erosion is cumulative: each suppression is locally minor, but across a codebase they create expanding blind spots where the type checker—the first line of detection for several ACF entries—can no longer see. Unlike a missing annotation, which is visibly untyped, `Any` and `# type: ignore` claim type safety while providing none. The code appears to participate in the type system while opting out. This is spoofing in the STRIDE sense: the code misrepresents a safety property.

## Detection

Flag ignore directives, parameters newly widened to `Any`, and casts in agent-generated diffs. Existing tools can identify the surface syntax, but distinguishing genuine dynamic interoperation from erosion requires context. Strict type-checker settings can make detection stronger; tracking suppression counts over time provides a useful proxy for whether type safety is being traded for compilation success.

## Distinguished from

**ACF-S4 vs ACF-S2:** S4 degrades the detection substrate for S2. S2 is a spurious field access masked by `getattr()` with a default — detectable by mypy *if the object is typed*. S4 widens the object to `Any` or adds `# type: ignore`, making mypy silent. S2 is a data-level failure (wrong field); S4 is a meta-level failure (detection disabled).

**ACF-S4 vs ACF-S5:** S4 removes or weakens type safety that already exists; S5 avoids creating type structure in the first place. S4 is erosion of an existing detection surface; S5 is failure to construct that surface at all.

**ACF-S4 vs ACF-T4:** Both describe the removal of a safety mechanism rather than satisfaction of it. T4 removes runtime guards (assertions, defensive raises); S4 removes static analysis guards (type annotations, type-checker constraints). Both are maintenance-phase failures — they appear when agents are resolving errors, not when generating greenfield code.
