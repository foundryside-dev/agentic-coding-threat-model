---
title: 'ACF-S1: Fabricated Default'
sidebar:
  label: 'ACF-S1: Fabricated Default'
  order: 1
acf:
  id: ACF-S1
  name: Fabricated Default
  stride: spoofing
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  portable_coverage: not-covered-bespoke-only
  entry_status: core
  language_generality: python-specific
  related: [ACF-T2]
---

## Description

Default values fabricate data where the absence of data should be surfaced as a failure, error, or explicit "unknown." The code presents a confident result that is actually based on fabricated input.

The first version in the example silently downgrades security classifications when data is missing. A PROTECTED document with a corrupted or missing `security_classification` field is treated as OFFICIAL. Downstream access control decisions are based on the fabricated classification.

S1 applies not only to business data received from external sources but also to the system's own operational data: telemetry, run identifiers, latency measurements, and audit metadata. When `self._run_id or ""` replaces a `None` run ID with an empty string, the system fabricates a value for data it should have produced correctly. A `None` run ID means something is broken in the system's initialisation; an empty string looks like normal operation. Similarly, `error.latency_ms or 0.0` fabricates a zero latency where measurement failed. Operators can no longer distinguish "instantaneous" from "unmeasured."

The mechanism is identical to business data fabrication (`or default` on data where absence is meaningful), but internal state fabrication corrupts *observability* rather than *business logic*. Incidents become harder to diagnose because the system's own diagnostic data has been normalised away.

The pattern also extends to governance artefacts. An agent that fabricates a plausible-sounding rationale for a trust-escalation exception substitutes a plausible fabrication where genuine evidence should be required. The designed companion specification addressed this through temporal separation, reviewer identity requirements, and recurrence tracking on exception rationales; none of that governance was built. The case study project's signed exception register — judge triage plus an operator-held signing key — is the working control for this variant.

## Why agents produce this

The `.get(key, default)` pattern appears in millions of Python files. In most contexts, providing a default for missing keys is genuinely good practice — a web application displaying "Unknown" for a missing user name is fine. Agents learn this as a universal pattern and apply it in contexts where the default fabricates safety-critical data.

## Example

```python
# Agent-generated — looks defensive and robust
def assess_risk_level(record):
    classification = record.get("security_classification", "OFFICIAL")
    clearance = record.get("required_clearance", "baseline")
    return classification, clearance

# Correct for high-stakes context — absence is a failure
def assess_risk_level(record):
    if "security_classification" not in record:
        raise MissingSecurityClassification(
            f"Record {record['id']}: security_classification absent — "
            f"upstream data integrity failure, cannot assess risk"
        )
    if "required_clearance" not in record:
        raise MissingSecurityClearance(
            f"Record {record['id']}: required_clearance absent — "
            f"cannot determine access level, refusing to default"
        )
    return record["security_classification"], record["required_clearance"]
```

## Detection

Flag `.get()` and `getattr()` with defaults on objects whose type is annotated with an authority tier of Tier 1 (authoritative internal), Tier 2 (semantically validated), or Tier 3 (shape-validated). This requires authority tier annotations, which existing tools do not provide. Semgrep custom rules can flag the structural pattern — `.get()` with non-`None` defaults — without provenance context, but at significantly lower precision because many legitimate uses exist. Such a rule would require extensive per-project tuning or triage.

For internal state fabrication, flag `or ""`, `or 0.0`, `or 0`, and similar fallbacks on fields that feed telemetry, metrics, or audit metadata. The designed companion specification mapped ACF-S1 to a member-access-with-fallback-default rule (WL-001), graded by declared context, with `or` fallbacks on Tier 1 data equally in scope. That rule was never built. The as-built reference implementation records ACF-S1 as not covered and identifies it as the largest single gap between the paper's argument and the portable tool. The case study project's bespoke enforcement covers the pattern through a `.get()`-must-be-whitelisted rule, so detection of ACF-S1 is attributable to the bespoke layer, not the portable one.

:::note[Compounding: upstream representational looseness]
The risk is amplified when upstream code has already erased the type information that would distinguish legitimate optionality from a contract violation. When a typed dataclass is serialised to `dict[str, Any]`, the downstream `.get()` ceases to look anomalous because the type system no longer signals that the key should always be present. Appendix E documents an incident in which a CI enforcer correctly flagged `.get()` on an internal path, but the agent could not determine why the flag was correct because the upstream serialisation had destroyed the evidence. The agent broadened the exception policy instead.
:::

## Distinguished from

**ACF-S1 vs ACF-T2:** S1 fabricates a value where none exists (the field is missing); T2 silently coerces a value that does exist into a different type or representation. S1 invents data; T2 transforms it. Both produce wrong values, but S1 is detectable by checking for default arguments on security-sensitive fields, while T2 requires tracing type coercion across operations.
