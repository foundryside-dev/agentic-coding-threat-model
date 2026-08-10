---
title: 'ACF-T2: Silent Coercion'
sidebar:
  label: 'ACF-T2: Silent Coercion'
  order: 5
acf:
  id: ACF-T2
  name: Silent Coercion
  stride: tampering
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: medium
  detection_status: partial
  portable_coverage: not-covered-bespoke-only
  entry_status: core
  language_generality: language-general
  related: [ACF-S1, ACF-T3]
---

## Description

Type coercion across trust boundaries hides data quality issues. Values are silently converted to a compatible type rather than being flagged as invalid.

Silent coercion converts "unknown" into a concrete value that passes all downstream checks. The distinction between "this transaction was for $0" and "we do not know the transaction amount" is lost permanently. Audit queries cannot distinguish real data from fabricated defaults, compromising the integrity of any analysis or compliance report built on the data.

## Why agents produce this

Python's `or` operator and conditional expressions make coercion easy and idiomatic. `value = input_value or "default"` is a common pattern. Agents apply it broadly without distinguishing between contexts where coercion is appropriate, such as Tier 4 to Tier 3 at a validation boundary, and contexts where it is dangerous, such as Tier 1 internal data that should never need coercion.

## Example

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

## Detection

Detection has two tiers. For default-based coercion, flag `.get()` with non-`None` defaults, `or` chains with fallback values, and ternary expressions with defaults. The case study's bespoke `.get()` rule covers that surface. Custom Semgrep rules can detect `or` chains and ternary defaults structurally, but with lower precision when authority tier annotations are unavailable.

Type-casting coercion — such as `float()` hiding precision loss, locale-dependent string operations, or date parsing with an assumed timezone — is not covered by any current rule set. No existing pattern rule targets type conversion on tier-classified data. The as-built companion specification records ACF-T2 as not covered: default-based coercion belonged to the unbuilt WL-001, and broader coercion was outside the design's scope.

## Distinguished from

**ACF-S1 vs ACF-T2:** S1 fabricates a value where none exists (the field is missing); T2 silently coerces a value that does exist into a different type or representation. S1 invents data; T2 transforms it. Both produce wrong values, but S1 is detectable by checking for default arguments on security-sensitive fields, while T2 requires tracing type coercion across operations.

**ACF-T2 vs ACF-T3:** T2 silently coerces a *type*; T3 silently parses *prose as structure*. Both produce values that look correct today and silently degrade when the source changes, but the mechanisms differ — T2 converts data, T3 fabricates structure from text.
