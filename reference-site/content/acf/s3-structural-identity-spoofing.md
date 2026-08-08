---
title: "ACF-S3: Structural Identity Spoofing"
weight: 3
acf_id: "ACF-S3"
acf_name: "Structural Identity Spoofing"
stride_category: "spoofing"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "python-specific"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-E1"]
---

## Description

A `hasattr()` check is used as a capability or privilege gate, allowing any object that declares the expected attribute to pass — regardless of whether the object is of the correct type. The gate accepts structural presence as proof of identity. This is the capability-based equivalent of [ACF-S1]({{< relref "/acf/s1-competence-spoofing" >}})'s fabricated default pattern: S1 fabricates *data* where absence should be a failure; S3 fabricates *identity* where type membership should be required.

## STRIDE Mapping

**Primary category:** [Spoofing]({{< relref "/threat-model/stride/spoofing" >}}) (+ Elevation of Privilege consequence)

The mechanism is false structural identity — the object claims to be something it is not by declaring the expected attribute. The Elevation of Privilege consequence follows directly: the impersonator passes through a privilege gate that should have rejected it. The entry is classified under Spoofing because the mechanism is false structural identity, not elevation.

## Risk Rating

**High.** Unlike [ACF-S1]({{< relref "/acf/s1-competence-spoofing" >}}) where the fabricated value is visible at the call site, the exploit surface for `hasattr` gates is anywhere an object is constructed — potentially far from the gate. The gate looks secure in isolation. The elevation of privilege consequence follows directly: the impersonator passes through a privilege gate that should have rejected it. The object claims to be something it isn't, and the gate believes it because the check is structural (has the attribute) rather than ontological (is the type).

## Generative Mechanism

`hasattr()` is the idiomatic Python pattern for duck-typing capability checks. Training data is saturated with it — agents building plugin systems, authorisation checks, or capability dispatchers will reach for `hasattr` by default because it is the "Pythonic" way to test whether an object supports an operation. The concept that structural presence is not ontological identity — that *having* an attribute is not the same as *being* the right type — is a security distinction that the language actively discourages.

## Examples

```python
# Agent-generated — "Pythonic" duck-typing capability check
def process_classified(obj):
    if hasattr(obj, "security_clearance"):
        handle_classified(obj)  # Any object with this attr gets in

# Trivial bypass — no type hierarchy modification needed
class Impersonator:
    security_clearance = "TOP_SECRET"  # Just declare the attribute

process_classified(Impersonator())  # Gate opens

# Correct — requires actual type membership
def process_classified(obj):
    if isinstance(obj, ClearedPersonnel):
        handle_classified(obj)  # Must inherit from ClearedPersonnel
    # Cannot bypass without modifying the class hierarchy itself
```

Python's `__getattr__` protocol makes this worse — a single class can dynamically claim to possess *any* attribute:

```python
class UniversalImpersonator:
    def __getattr__(self, name):
        return True  # "Yes, I have that. And everything else."

# This object passes every hasattr check in the entire codebase.
# An isinstance check is immune to this.
```

## Detection Approaches

An unconditional lint rule banning `hasattr()` catches all instances. General-purpose linters do not flag `hasattr` because it is considered idiomatic Python. Semantic enforcement can treat `hasattr` as prohibited in contexts where structural guarantees are declared — an unconditional error on audit-trail, pipeline, and shape-validated paths, and a governable error on raw external data. Unlike `.get()` or `getattr()`, which are context-dependent: in high-stakes contexts there is no legitimate use of `hasattr` that cannot be expressed more safely as `isinstance()`, explicit `try`/`except AttributeError`, or an allowlist check.

A rule targeting runtime type-checking of internal data provides secondary coverage: an `isinstance()` guard on data classified as internal suggests the code does not trust the type system's guarantees, which may signal an S3-adjacent structural identity problem. Detection is rated Partial because the rule is simple to implement but not present in any widely-deployed tool.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

This failure mode is addressed by a rule prohibiting `hasattr` in contexts where structural guarantees are declared. In high-stakes contexts there is no legitimate use of `hasattr` that cannot be expressed more safely as `isinstance()`, explicit `try`/`except AttributeError`, or an allowlist check.

## Related Entries

**[ACF-E1]({{< relref "/acf/e1-implicit-privilege-grant" >}}) (Implicit Privilege Grant).** E1 is about unvalidated external assertions — a partner API says "verified" and the code grants access. S3 is about unsound gate predicates — `hasattr()` gates accept any object with the expected attribute regardless of type. Both result in implicit privilege grants, but through different mechanisms: E1 trusts the wrong *source*; S3 trusts the wrong *check*. The structural impersonation that S3 enables can result in implicit privilege grants — the impersonator passes through a privilege gate that should have rejected it. The primary STRIDE category is Spoofing because the mechanism is false structural identity, but the Elevation of Privilege consequence is a direct result.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
