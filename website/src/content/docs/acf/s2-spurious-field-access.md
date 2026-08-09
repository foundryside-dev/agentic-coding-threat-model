---
title: 'ACF-S2: Spurious Field Access'
sidebar:
  label: 'ACF-S2: Spurious Field Access'
  order: 2
acf:
  id: ACF-S2
  name: Spurious Field Access
  stride: spoofing
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  portable_coverage: not-covered-bespoke-only
  entry_status: core
  language_generality: python-specific
  related: [ACF-S4]
---

## Description

An agent accesses a field name that does not exist on the target object, masked by `getattr()` with a default. The code operates on fabricated data while appearing to access a real field.

The code silently does nothing instead of crashing. In a security context, "nothing happens" can mean threats are not escalated or alerts are not raised — failures of omission that are harder to detect than failures of commission.

## Why agents produce this

Agents occasionally reference nonexistent field names, predicting a plausible field name that does not exist in the actual schema. Without `getattr`, this produces an immediate `AttributeError`. With `getattr(obj, "spurious_field", None)`, the error is silently suppressed and the code operates on `None` or another supplied default.

## Example

```python
# Agent referenced nonexistent "risk_score" — actual field is "risk_rating"
threshold = getattr(assessment, "risk_score", 0)
if threshold > 5:
    escalate(assessment)
# risk_score is always 0 (the default), so nothing is ever escalated.
# The code looks correct. Tests pass (they test the escalation path with explicit values).
# The bug is invisible until someone notices that escalation never triggers.

# Correct — access the real field directly, crash if it doesn't exist
threshold = assessment.risk_rating
if threshold > 5:
    escalate(assessment)
# If the field name is wrong, AttributeError fires immediately.
# No silent suppression, no fabricated zero threshold.
```

## Detection

Type checkers such as mypy and pyright catch this *if the object is fully annotated*. If the object is `Any` or untyped, type checkers are silent. The designed companion specification specified a complementary rule: flag `getattr` with a default on any object with a declared type annotation, because the annotation means the field set is known and access should be direct. It also specified a type-system enforcement layer. Neither was built, and the as-built implementation records ACF-S2 as not covered.

At the specification layer, a distinct detection path exists: reality review, which checks whether referenced APIs, parameters, and field names actually exist in the target library or codebase. Appendix E.6 demonstrates this approach catching a spurious `force_refresh` parameter that was internally consistent within a specification but did not exist in the actual API. Symbol resolution against dependency metadata can automate this verification.

## Distinguished from

**ACF-S4 vs ACF-S2:** S4 degrades the detection substrate for S2. S2 is a spurious field access masked by `getattr()` with a default — detectable by mypy *if the object is typed*. S4 widens the object to `Any` or adds `# type: ignore`, making mypy silent. S2 is a data-level failure (wrong field); S4 is a meta-level failure (detection disabled).
