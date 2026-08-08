---
title: "ACF-S4: Type Annotation Erosion"
weight: 4
acf_id: "ACF-S4"
acf_name: "Type Annotation Erosion"
stride_category: "spoofing"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "provisional"
language_generality: "python-specific"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-S2", "ACF-S5", "ACF-T4"]
---

## Description

Type annotations are weakened or suppressed — `# type: ignore` comments are added, typed parameters are widened to `Any`, or `cast()` calls are inserted — to resolve type errors rather than fixing the underlying type mismatch. The code presents itself as type-safe (mypy reports no errors) while the type safety that detection tools depend on has been silently removed.

## STRIDE Mapping

**Primary category:** [Spoofing]({{< relref "/threat-model/stride/spoofing" >}})

The code misrepresents a safety property. An `Any` annotation or a `# type: ignore` comment *claims* type safety while providing none. The code appears to participate in the type system while actually opting out of it. This is spoofing in the STRIDE sense: the code misrepresents a safety property.

## Risk Rating

**High.** This is a meta-failure — it degrades the detection capability for other taxonomy entries. [ACF-S2]({{< relref "/acf/s2-hallucinated-field-access" >}}) (Spurious Field Access) is detectable by mypy *if the object is fully annotated*. [ACF-S3]({{< relref "/acf/s3-structural-identity-spoofing" >}}) (Structural Identity Spoofing) is detectable by `isinstance` checks *if the type hierarchy is maintained*. When an agent widens a parameter to `Any` or adds `# type: ignore`, those detection mechanisms are disabled for the affected code path. The erosion is cumulative: each suppression is locally minor, but across a codebase they create expanding blind spots where the type checker — which is the first line of detection for several ACF entries — can no longer see. Unlike a missing annotation (which is visible as an untyped parameter), an `Any` annotation or a `# type: ignore` comment *claims* type safety while providing none. The code appears to participate in the type system while actually opting out of it.

## Generative Mechanism

When an agent encounters a type error — a parameter mismatch, an incompatible return type, a missing attribute on a typed object — the correct fix requires understanding the type hierarchy and modifying the code to satisfy the constraint. The expedient fix is to suppress the constraint: add `# type: ignore`, widen the parameter to `Any`, or wrap the expression in `cast()`. Training data contains both approaches, but the suppression pattern is shorter, locally complete, and resolves the immediate error without requiring changes elsewhere. Agents optimising for local coherence and minimal diff size will reach for suppression. This is structurally similar to [ACF-T4]({{< relref "/acf/t4-safety-guard-erosion" >}}) (Safety Guard Erosion) — both remove a safety mechanism rather than satisfying it — but S4 targets the *type system* specifically, which is the detection substrate for other taxonomy entries.

## Examples

```python
# Agent encounters a type error on assessment.risk_rating
# (risk_rating is Optional[int], but the comparison requires int)

# Suppression approach — resolves the error, degrades detection
def check_threshold(assessment: Any):  # was: Assessment
    # type: ignore[union-attr]
    if assessment.risk_rating > 5:
        escalate(assessment)
# mypy is now silent on this function. If a future change removes
# risk_rating from Assessment, mypy will not catch it — because
# the parameter is Any. ACF-S2 (spurious field access) is
# now undetectable in this function.

# Correct approach — satisfies the type constraint
def check_threshold(assessment: Assessment):
    if assessment.risk_rating is None:
        raise MissingRiskRating(assessment.id)
    if assessment.risk_rating > 5:
        escalate(assessment)
# mypy validates field access. If risk_rating is removed or
# renamed, mypy catches it. The None case is handled explicitly.
```

## Detection Approaches

Flag `# type: ignore` comments, parameters typed as `Any` (especially where a narrower type was previously used), and `cast()` calls in agent-generated diffs. The structural pattern is straightforward and existing tools can identify it — mypy itself reports the count of `type: ignore` directives, and ruff/flake8 plugins can flag `Any` usage. Detection is rated Partial because identifying the *suppression* is easy, but distinguishing legitimate uses (genuinely dynamic code, third-party library interop) from erosion requires context. In codebases with a strict `disallow_any_explicit = True` mypy configuration, the detection is effectively Good — but few codebases enforce this. A useful proxy metric: track the `# type: ignore` count over time in agent-generated commits. A rising count is a signal that type safety is being traded for compilation success.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

Detection approaches for this provisional entry are under development.

## Related Entries

- **[ACF-S2]({{< relref "/acf/s2-hallucinated-field-access" >}}) (Spurious Field Access).** S4 degrades the detection substrate for S2. S2 is a spurious field access masked by `getattr()` with a default — detectable by mypy *if the object is typed*. S4 widens the object to `Any` or adds `# type: ignore`, making mypy silent. S2 is a data-level failure (wrong field); S4 is a meta-level failure (detection disabled).
- **[ACF-S5]({{< relref "/acf/s5-type-structure-avoidance" >}}) (Type Structure Avoidance).** S4 removes or weakens type safety that already exists; S5 avoids creating type structure in the first place. S4 is erosion of an existing detection surface; S5 is failure to construct that surface at all.
- **[ACF-T4]({{< relref "/acf/t4-safety-guard-erosion" >}}) (Safety Guard Erosion).** Both describe the removal of a safety mechanism rather than satisfaction of it. T4 removes runtime guards (assertions, defensive raises); S4 removes static analysis guards (type annotations, type-checker constraints). Both are maintenance-phase failures — they appear when agents are resolving errors, not when generating greenfield code.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
