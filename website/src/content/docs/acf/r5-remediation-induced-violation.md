---
title: "ACF-R5: Remediation-Induced Violation"
sidebar:
  label: "ACF-R5: Remediation-Induced Violation"
  order: 10
acf:
  id: ACF-R5
  name: Remediation-Induced Violation
  stride: repudiation
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: none
  portable_coverage: indirect-only
  entry_status: core
  language_generality: language-general
  related: [ACF-R3, ACF-T4]
---

## Description

An agent tasked with fixing a known violation introduces a different violation in the fix itself. The remediation may genuinely remove the original problem while introducing a failure that the review process is less likely to catch because attention is anchored on the original violation. This differs from the same bad pattern recurring later: R5 is a new violation in the remediation itself.

Remediation carries an implicit assurance signal. A commit described as fixing a violation suggests that the code has already received critical evaluation, so reviewers may apply less scrutiny. At organisational scale, the measured violation count can fall while an unmeasured class of debt grows.

## Why agents produce this

Remediation is framed as a constrained task: fix a specific violation. The agent focuses on removing the flagged pattern without re-evaluating whether the replacement preserves all the original properties, including those outside the flagged category. The new code passes the check that found the first violation, while the replacement defect sits in a different cognitive frame.

## Example

### Tautological assertion

```python
# Before: flagged for an unsound hasattr() gate.
assert hasattr(PluginRetryableError, "retryable"), \
    "PluginRetryableError missing retryable attribute"

# Agent's fix: hasattr is gone, but the replacement can never fail.
assert PluginRetryableError.retryable is not None or True, \
    "PluginRetryableError missing retryable attribute"
```

### Exception-handler collapse

```python
# Before: one broad handler is the reported problem.
try:
    query = template.render(query=extracted, row=row_data)
except UndefinedError as error:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(error)})
except SecurityError as error:
    return QueryResult(error={
        "reason": "template_rendering_failed",
        "error": f"Sandbox violation: {error}",
    })
except Exception as error:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(error)})

# Agent's "fix" — three new problems
try:
    query = template.render(query=extracted, row=row_data)
except (UndefinedError, SecurityError, OverflowError,
        ZeroDivisionError, ArithmeticError,  # parent of the previous two
        TypeError, ValueError) as error:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(error)})
# Problem 1: TypeError/ValueError are likely code bugs, not user errors.
#   Catching them softens a crash into "template rendering failed."
# Problem 2: SecurityError lost its "Sandbox violation:" prefix.
#   Audit trail classification signal destroyed.
# Problem 3: ArithmeticError is parent of OverflowError and ZeroDivisionError.
#   Listing all three is redundant — shallow hierarchy knowledge.
```

## Detection

No existing tool detects remediation-induced violations as a class. Detection requires comparing every property of the replacement code with the original, not merely confirming that the reported pattern disappeared. The practical process control is to review remediation commits with the same or greater scrutiny as new code.

## Distinguished from

**ACF-R3 vs ACF-R5:** R3 displaces *test* assurance (real tests become mock tests); R5 displaces *remediation* assurance (fixes introduce new violations). Both produce artefacts that claim to provide assurance while degrading the property they claim to assure.

**ACF-T4 vs ACF-R5:** T4 (guard erosion) can manifest as part of R5 — a remediation commit that removes safety guards not related to the original violation. Both are maintenance-phase failures targeting the gap between greenfield authoring and code modification.
