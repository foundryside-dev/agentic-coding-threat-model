---
title: "ACF-T2: Silent Coercion"
weight: 7
acf_id: "ACF-T2"
acf_name: "Silent Coercion"
stride_category: "tampering"
risk_level: "medium"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-S1", "ACF-T3"]
---

## Description

Type coercion across trust boundaries hides data quality issues. Values are silently converted to a compatible type rather than being flagged as invalid. The distinction between "this value is zero" and "we do not know the value" is lost permanently, compromising the integrity of any analysis or compliance report built on the data.

## STRIDE Mapping

**Category:** Tampering | **Risk:** Medium | **Detection:** Partial

Silent coercion is a tampering failure because it silently modifies data values during type conversion, destroying the distinction between valid data and missing or malformed data. The original value is replaced with a concrete substitute that passes all downstream checks.

## Generative Mechanism

Python's `or` operator and conditional expressions make coercion easy and idiomatic. `value = input_value or "default"` is a common pattern. Agents apply it broadly without distinguishing between contexts where coercion is appropriate (Tier 4 to Tier 3 at a validation boundary) and contexts where it is dangerous (Tier 1 internal data that should never need coercion). The pattern is language-general — similar coercion shortcuts exist in JavaScript (`||`), Java (ternary operators), and other languages.

## Risk Rating

**Medium.** Exploitable under specific conditions; the blast radius depends on how many downstream consumers rely on the coerced value. Silent coercion converts "unknown" into a concrete value that passes all downstream checks. The distinction between "this transaction was for $0" and "we do not know the transaction amount" is lost permanently.

## Code Examples

```python
# Silent coercion hides data quality problem
amount = float(row.get("transaction_amount", 0))
# Two failures compounded: .get() fabricates a default (ACF-S1),
# then float() coerces it to a numeric type.
# Missing transaction amount is silently zero — not "unknown" or "error."
# A zero-value transaction passes every downstream check.
# An audit query for "transactions over $1000" won't find it,
# but neither will "transactions with missing amounts."

# Locale coercion is equally dangerous
amount = float(row["measurement"].replace(",", "."))
# "3,14159" silently becomes 3.14159 — the original locale context
# is lost with no record that a transformation occurred.


# Correct — validate presence, validate type, preserve precision
from decimal import Decimal, InvalidOperation

if "transaction_amount" not in row:
    return RecordOutcome.error({"reason": "missing_amount", "row_id": row_id})
raw_amount = row["transaction_amount"]
try:
    amount = Decimal(raw_amount)  # Preserve precision; float would silently lose it
except (InvalidOperation, TypeError) as e:
    return RecordOutcome.error(
        {"reason": "invalid_amount", "raw": raw_amount, "error": str(e)}
    )
```

## Impact

Silent coercion converts "unknown" into a concrete value that passes all downstream checks. Audit queries cannot distinguish real data from fabricated defaults, compromising the integrity of any analysis or compliance report built on the data. Locale-dependent coercion (e.g., comma-to-dot replacement) destroys the original context with no record that a transformation occurred.

## Detection Approaches

Two tiers of coverage. *Default-based coercion* (`.get()` with non-None defaults, `or` chains with fallback values, ternary expressions with defaults) is partially detected: a fallback-default rule covers the `.get()` surface; `or` chains and ternary defaults are structurally detectable by custom Semgrep rules but with lower precision without authority tier annotations. *Type-casting coercion* (`float()` hiding precision loss, locale-dependent string operations, date parsing with assumed timezone) is not covered — no existing pattern rule targets type conversion on tier-classified data.

The distinction from [ACF-S1](../s1-competence-spoofing/) (Fabricated Default) is that T2 involves type conversion compounded with default substitution, not just default substitution alone. Semantic enforcement addresses the default-based surface only.

## Prevention

This failure mode is partially addressed by a fallback-default rule, which covers the default-based surface only. The type-casting coercion surface (precision loss through `float()`, locale-dependent transformations) is not yet covered by any rule set.

## Related Entries

- [ACF-S1: Fabricated Default](../s1-competence-spoofing/) — S1 fabricates a value where none exists (the field is missing); T2 silently coerces a value that does exist into a different type or representation. S1 invents data; T2 transforms it. A `.get()` call that provides a fallback string is S1; a `float(row.get("amount", 0))` that both fabricates a default and coerces the type is T2.
- [ACF-T3: Unstructured Signal Parsing](../t3-unstructured-signal-parsing/) — T2 silently coerces a *type*; T3 silently parses *prose as structure*. Both produce values that look correct today and silently degrade when the source changes, but the mechanisms differ — T2 converts data, T3 fabricates structure from text.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
