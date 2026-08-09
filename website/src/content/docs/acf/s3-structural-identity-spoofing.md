---
title: 'ACF-S3: Structural Identity Spoofing'
sidebar:
  label: 'S3 Structural Identity Spoofing'
  order: 3
acf:
  id: ACF-S3
  name: Structural Identity Spoofing
  stride: spoofing
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  portable_coverage: not-covered-bespoke-only
  entry_status: core
  language_generality: python-specific
  related: [ACF-E1]
---

## Description

A `hasattr()` check is used as a capability or privilege gate, allowing any object that declares the expected attribute to pass regardless of whether the object is of the correct type. The gate accepts structural presence as proof of identity. Its primary STRIDE category is Spoofing, with Elevation of Privilege as a consequence.

Unlike ACF-S1, where a fabricated value is visible at the call site, the exploit surface for `hasattr` gates is anywhere an object is constructed, potentially far from the gate. The gate looks secure in isolation. Python's `__getattr__` protocol makes the problem worse because a single class can dynamically claim to possess *any* attribute.

This is the capability-based equivalent of ACF-S1's fabricated default pattern: ACF-S1 fabricates *data* where absence should be a failure; ACF-S3 fabricates *identity* where type membership should be required. The object claims to be something it is not, and the gate believes it because the check is structural (has the attribute) rather than ontological (is the type). The elevation of privilege consequence follows directly: the impersonator passes through a privilege gate that should have rejected it.

## Why agents produce this

`hasattr()` is the idiomatic Python pattern for duck-typing capability checks. Training data is saturated with it. Agents building plugin systems, authorisation checks, or capability dispatchers reach for `hasattr` by default because it is the "Pythonic" way to test whether an object supports an operation. The concept that structural presence is not ontological identity — that *having* an attribute is not the same as *being* the right type — is a security distinction that the language actively discourages.

## Example

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

A class using `__getattr__` can pass every `hasattr` check in the codebase:

```python
class UniversalImpersonator:
    def __getattr__(self, name):
        return True  # "Yes, I have that. And everything else."

# This object passes every hasattr check in the entire codebase.
# An isinstance check is immune to this.
```

## Detection

An unconditional lint rule banning `hasattr()` catches all instances; the case study codebase enforces this. General-purpose linters do not flag `hasattr` because it is considered idiomatic Python. The designed companion specification treated `hasattr` as prohibited wherever structural guarantees are declared: an error in the trusted and validated states (`INTEGRAL`, `ASSURED`, `GUARDED`, `UNKNOWN_ASSURED`, and `UNKNOWN_GUARDED`) and governable in the raw states (`EXTERNAL_RAW`, `UNKNOWN_RAW`, and `MIXED_RAW`). Unlike `.get()` or `getattr()`, which are context-dependent, in high-stakes contexts there is no legitimate use of `hasattr` that cannot be expressed more safely as `isinstance()`, explicit `try`/`except AttributeError`, or an allowlist check.

The designed WL-006 rule for runtime type-checking of internal data would have provided secondary coverage. Neither rule was built. The as-built implementation records ACF-S3 as not covered directly; its nearest rule fires on tainted reflective attribute access, which is a sink rule rather than a structural-identity rule. The case study codebase's unconditional `hasattr` ban remains a bespoke rule. Detection is rated Partial because the rule is simple to implement but not present in any widely deployed tool.

## Distinguished from

**ACF-E1 vs ACF-S3:** E1 is about unvalidated external assertions — a partner API says "verified" and the code grants access. S3 is about unsound gate predicates — `hasattr()` gates accept any object with the expected attribute regardless of type. Both result in implicit privilege grants, but through different mechanisms: E1 trusts the wrong *source*; S3 trusts the wrong *check*.
