---
title: "Spoofing"
weight: 1
stride_slug: "spoofing"
---

In traditional STRIDE analysis, spoofing refers to an entity claiming to be something it is not — a forged authentication token, a spoofed IP address, a process impersonating another user. The system accepts the false identity and grants access or trust accordingly.

The agentic variant extends this to **competence spoofing**: code *appears* to handle data correctly but operates on fabricated or default values, presenting a false picture of data integrity.

## Mechanism

Agents default to defensive patterns that substitute values rather than failing. The code "works" — it produces output, it does not crash — but the output is based on fabricated data rather than actual data. The code spoofs the competence of correct data handling.

This is an **analogical extension** of STRIDE's original Spoofing category — fabricated data presenting as authoritative, rather than identity forgery in the traditional sense. The mapping is proposed for ASD evaluation rather than presented as standard STRIDE doctrine.

## Code examples

```python
# Fabricates a default rather than surfacing missing data
user_role = getattr(session, "role", "readonly")
# Missing role silently becomes "readonly" — wrong in either direction.

# Substitutes processing time for missing event time
event_time = record.timestamp or datetime.now()
# The audit trail now records when we processed the record, not when
# the event occurred. Temporal provenance has been fabricated.

# Fabricates identity via structural presence
if hasattr(obj, "security_clearance"):
    handle_classified(obj)
# Structural check, not identity check — any object with this attribute passes.
```

## Why existing controls miss it

The code is syntactically valid, follows common patterns, and passes tests — because the failure is semantic, not syntactic. No existing linter, type checker, or SAST tool is designed to determine whether a default value on a particular field fabricates data that will be treated as authoritative. That judgment requires domain-specific context about the security semantics of each field — context that lives in team culture and project documentation, not in the programming language or any standard tooling. A human reviewer under time pressure may see "defensive coding" — a positive signal — and approve it.

## Risk in government context

Classification decisions, access control, evidentiary integrity — any domain where "I don't know" and "the default" are different answers with different consequences.

## ACF entries in this category

The ACF taxonomy expands this STRIDE category into five failure modes (three core, two provisional):

- [ACF-S1: Fabricated Default]({{< relref "/acf/s1-competence-spoofing" >}}) — default values that fabricate authoritative data
- [ACF-S2: Spurious Field Access]({{< relref "/acf/s2-hallucinated-field-access" >}}) — locally coherent but incorrect model of the code
- [ACF-S3: Structural Identity Spoofing]({{< relref "/acf/s3-structural-identity-spoofing" >}}) — structural checks used as identity checks
- [ACF-S4: Type Annotation Erosion]({{< relref "/acf/s4-type-annotation-erosion" >}}) — degradation of the detection substrate (provisional)
- [ACF-S5: Type Structure Avoidance]({{< relref "/acf/s5-type-structure-avoidance" >}}) — avoidance of type structure (provisional)

## See also

- [ACF Taxonomy Index]({{< relref "/acf" >}}) — complete taxonomy of AI code failure modes
- [Tampering]({{< relref "tampering" >}}) — related category: authority tier conflation
- [Elevation of Privilege]({{< relref "elevation-of-privilege" >}}) — related category: implicit privilege grant from fabricated defaults
