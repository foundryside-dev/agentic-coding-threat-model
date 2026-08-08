---
title: "ACF-S1: Fabricated Default"
weight: 1
acf_id: "ACF-S1"
acf_name: "Fabricated Default"
stride_category: "spoofing"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "python-specific"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-T2"]
---

## Description

Default values fabricate data where the absence of data should be surfaced as a failure, error, or explicit "unknown." The code presents a confident result that is actually based on fabricated input. This applies not only to business data from external sources but also to a system's own operational data — telemetry, run identifiers, latency measurements, and audit metadata — where fabricated defaults corrupt observability rather than business logic.

## STRIDE Mapping

**Primary category:** [Spoofing]({{< relref "/threat-model/stride/spoofing" >}})

The code misrepresents the provenance of a value — a fabricated default is presented as though it were genuine data retrieved from the source. Downstream consumers cannot distinguish real from fabricated.

## Risk Rating

**High.** The agent-generated version silently downgrades security classifications when data is missing. A PROTECTED document with a corrupted or missing `security_classification` field is treated as OFFICIAL. Downstream access control decisions are based on the fabricated classification.

## Generative Mechanism

The `.get(key, default)` pattern appears in millions of Python files. In most contexts, providing a default for missing keys is genuinely good practice — a web application displaying "Unknown" for a missing user name is fine. Agents learn this as a universal pattern and apply it in contexts where the default fabricates safety-critical data. The pattern is short, locally coherent, and resolves missing-key concerns without requiring the agent to reason about whether absence is semantically meaningful.

## Examples

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

## Scope: Internal State Fabrication

S1 applies not only to business data received from external sources but to the system's own operational data — telemetry, run identifiers, latency measurements, and audit metadata. When `self._run_id or ""` replaces a `None` run ID with an empty string, the system fabricates a value for data it should have produced correctly. A `None` run ID means "something is broken in our initialisation"; an empty string looks like normal operation. Similarly, `error.latency_ms or 0.0` fabricates a zero latency where measurement failed — operators cannot distinguish "instantaneous" from "unmeasured." The mechanism is identical to business data fabrication (`or default` on data where absence is meaningful), but internal state fabrication corrupts *observability* rather than *business logic* — incidents become harder to diagnose because the system's own diagnostic data has been normalised away.

## Governance Artefact Extension

The S1 pattern also extends to governance artefacts: an agent that fabricates a plausible-sounding rationale for a trust-escalation exception is substituting a plausible fabrication where genuine evidence should be required — the same mechanism as a fabricated default on a data field, applied to a governance decision rather than code. An exception regime can counter this through temporal separation, reviewer identity requirements, and recurrence tracking on exception rationales.

> **Compounding: upstream representational looseness.** The risk of this pattern is amplified when upstream code has already erased the type information that would distinguish legitimate optionality from contract violation. When a typed dataclass is serialised to `dict[str, Any]`, the downstream `.get()` ceases to look anomalous — the type system no longer signals that the key should always be present. Appendix E documents an incident in which a CI enforcer correctly flagged `.get()` on an internal path, but the agent could not determine why the flag was correct because the upstream serialisation had destroyed the evidence. The agent broadened the exception policy instead.

## Detection Approaches

Flag `.get()` and `getattr()` with defaults on objects whose type is annotated with an authority tier of Tier 1 (authoritative internal), Tier 2 (semantically validated), or Tier 3 (shape-validated). Requires authority tier annotations not available in existing tools. Semgrep custom rules can flag the structural pattern (`.get()` with non-None defaults) without provenance context, but with significantly lower precision — many legitimate uses of `.get()` with defaults exist, so the rule would require extensive per-project tuning or triaging. For internal state fabrication, flag `or ""`, `or 0.0`, `or 0`, and similar `or` fallbacks on fields that feed telemetry, metrics, or audit metadata. A semantic enforcement rule targeting member access with a fallback default treats the pattern as an unconditional error on audit-trail paths and a governable error on raw external data. The `or` fallback on Tier 1 data is also an error under such a rule, because Tier 1 data is authored by the system itself and should never need fabricated defaults.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

This failure mode is addressed by a rule prohibiting member access with a fallback default — an unconditional error on audit-trail paths, and a governable error on raw external data.

## Related Entries

**ACF-S1 vs [ACF-T2]({{< relref "/acf/t2-silent-coercion" >}}) (Silent Coercion).** S1 fabricates a value where none exists (the field is missing); T2 silently coerces a value that does exist into a different type or representation. S1 invents data; T2 transforms it. A `.get()` call that provides a fallback string is S1; a `float(row.get("amount", 0))` that both fabricates a default and coerces the type is T2. The two patterns frequently co-occur in agent-generated code. Both produce wrong values, but S1 is detectable by checking for default arguments on security-sensitive fields, while T2 requires tracing type coercion across operations.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
