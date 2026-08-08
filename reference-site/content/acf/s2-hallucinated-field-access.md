---
title: "ACF-S2: Spurious Field Access"
weight: 2
acf_id: "ACF-S2"
acf_name: "Spurious Field Access"
stride_category: "spoofing"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "python-specific"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-S4"]
---

## Description

Agent accesses a field name that does not exist on the target object, masked by `getattr()` with a default. The code operates on fabricated data while appearing to access a real field. Without the `getattr` guard, the spurious field name would produce an immediate `AttributeError`; with it, the error is silently suppressed and the code operates on the default value.

## STRIDE Mapping

**Primary category:** [Spoofing]({{< relref "/threat-model/stride/spoofing" >}})

The code presents fabricated data (the `getattr` default) as though it were a genuine field value. The field name itself is spurious — a plausible prediction that does not correspond to the actual schema.

## Risk Rating

**High.** The code silently does nothing instead of crashing. In a security context, "nothing happens" can mean "threats are not escalated" or "alerts are not raised" — failures of omission that are harder to detect than failures of commission.

## Generative Mechanism

Agents occasionally reference nonexistent field names — predicting a plausible field name that does not exist in the actual schema. Without `getattr`, this produces an immediate `AttributeError`. With `getattr(obj, "spurious_field", None)`, the error is silently suppressed and the code operates on `None` (or whatever default is provided).

## Examples

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

## Detection Approaches

Type checkers (mypy, pyright) catch this *if the object is fully annotated*. If the object is `Any` or untyped, type checkers are silent. A complementary semantic rule flags `getattr` with a default on any object that has a declared type annotation, because the annotation means the field set is known and access should be direct.

At the specification layer, a distinct detection path exists: "reality review" — checking whether referenced APIs, parameters, and field names actually exist in the target library or codebase. Appendix E.6 demonstrates this catching a spurious `force_refresh` parameter that was internally consistent within a specification but did not exist in the actual API. This verification is automatable through symbol resolution against dependency metadata.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

This failure mode is addressed by a rule flagging `getattr` with a default on typed objects, where the field set is known and direct access should be used instead.

## Related Entries

**[ACF-S4]({{< relref "/acf/s4-type-annotation-erosion" >}}) (Type Annotation Erosion).** S4 degrades the detection substrate for S2. S2 is a spurious field access masked by `getattr()` with a default — detectable by mypy *if the object is typed*. S4 widens the object to `Any` or adds `# type: ignore`, making mypy silent. S2 is a data-level failure (wrong field); S4 is a meta-level failure (detection disabled). When annotations are widened to `Any` or suppressed with `# type: ignore`, the type checker can no longer catch spurious field access. S4 thus degrades the primary detection mechanism for S2.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
