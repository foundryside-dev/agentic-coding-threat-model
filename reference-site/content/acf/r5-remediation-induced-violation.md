---
title: "ACF-R5: Remediation-Induced Violation"
weight: 14
acf_id: "ACF-R5"
acf_name: "Remediation-Induced Violation"
stride_category: "repudiation"
risk_level: "high"
detection_status: "none"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-R3", "ACF-T4"]
---

## Description

An agent tasked with fixing a known violation introduces a *different* violation in the fix itself. The remediation commit claims to resolve the original problem — and may genuinely do so — while introducing a new failure mode that the review process is structurally less likely to catch, because the reviewer's attention is anchored on the original violation. This is distinct from the "corrections don't stick" observation, which describes the *same* pattern recurring in new code. R5 describes a violation *in the fix itself*.

## STRIDE Mapping

**Category:** Repudiation

The remediation commit carries an implicit assurance signal that degrades the review process's ability to catch new violations introduced by the fix.

## Risk Rating

**Risk:** High

## Generative Mechanism

Remediation is a constrained task: "fix this specific violation." The agent focuses on eliminating the flagged pattern and does not step back to evaluate whether the replacement code preserves all properties the original code had — including properties not subject to the violation. The fix passes the check that caught the original violation, and the new violation is in a different category.

## Code Examples

**Tautological assertion — pure R5:**

```python
# Before — flagged for using hasattr() (ACF-S3 violation)
assert hasattr(PluginRetryableError, 'retryable'), \
    "PluginRetryableError missing retryable attribute"

# Agent's "fix" — eliminated hasattr, introduced a tautology
assert PluginRetryableError.retryable is not None or True, \
    "PluginRetryableError missing retryable attribute"
# `X is not None or True` is ALWAYS true: when X is None,
# `None is not None` is False, but `False or True` is True.
# The assertion can never fail. The safety check is now decorative.
```

**Exception handler collapse — R5 introducing [ACF-R1]({{< relref "/acf/r1-audit-trail-destruction" >}}):**

```python
# Before — flagged for overly broad `except Exception` (ACF-R1)
try:
    query = template.render(query=extracted, row=row_data)
except UndefinedError as e:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(e)})
except SecurityError as e:
    return QueryResult(error={"reason": "template_rendering_failed",
                              "error": f"Sandbox violation: {e}"})
except Exception as e:  # ← the flagged violation
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(e)})

# Agent's "fix" — three new problems
try:
    query = template.render(query=extracted, row=row_data)
except (UndefinedError, SecurityError, OverflowError,
        ZeroDivisionError, ArithmeticError,  # parent of the previous two
        TypeError, ValueError) as e:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(e)})
# Problem 1: TypeError/ValueError are likely code bugs, not user errors.
#   Catching them softens a crash into "template rendering failed."
# Problem 2: SecurityError lost its "Sandbox violation:" prefix.
#   Audit trail classification signal destroyed.
# Problem 3: ArithmeticError is parent of OverflowError and ZeroDivisionError.
#   Listing all three is redundant — shallow hierarchy knowledge.
```

## Impact

Remediation carries an implicit assurance signal. A commit titled "fix: address tier model violations" tells the reviewer that this code has already been through one round of critical evaluation. The reviewer applies less scrutiny. The new violation is in a different cognitive frame. At organisational scale, the effect is that violation counts go down, assurance metrics improve, and the codebase accumulates a different class of debt that no metric is tracking.

## Detection Approaches

No existing tool detects this. Detection requires comparing the properties of the replacement code against the properties of the original code — not just checking whether the flagged pattern is gone. A simpler process control: treat remediation commits with the same or higher scrutiny as new code, not lower.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

Detection approaches for this entry are under development.

## Related Entries

- [ACF-R3: Verification Displacement]({{< relref "/acf/r3-verification-displacement" >}}) — R3 displaces *test* assurance (real tests become mock tests); R5 displaces *remediation* assurance (fixes introduce new violations). Both produce artefacts that claim to provide assurance while degrading the property they claim to assure.
- [ACF-T4: Safety Guard Erosion]({{< relref "/acf/t4-safety-guard-erosion" >}}) — T4 (guard erosion) can manifest as part of R5 — a remediation commit that removes safety guards not related to the original violation. Both are maintenance-phase failures targeting the gap between greenfield authoring and code modification.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
