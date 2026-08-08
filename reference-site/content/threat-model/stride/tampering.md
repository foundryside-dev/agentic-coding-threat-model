---
title: "Tampering"
weight: 2
stride_slug: "tampering"
---

In traditional STRIDE analysis, tampering involves an attacker modifying data in transit or at rest without authorisation — altering a database record, intercepting and changing a message, corrupting a configuration file. The data itself is changed.

The agentic variant is **authority tier conflation**: external (untrusted) data is treated as internal (trusted) data without validation, effectively tampering with the authority tier rather than the data itself.

## Mechanism

Agents do not distinguish between data from different authority tiers because the programming language does not enforce it. A `dict` from a validated database query and a `dict` from an unvalidated API response are the same type. The agent treats them interchangeably.

## Code examples

```python
# API response used directly without validation boundary
api_response = requests.get(external_url).json()
save_to_internal_database(api_response["records"])
# External data enters the trusted internal store without validation.
# The agent does not see a trust boundary — it sees a dict going into a function.

# Deserialized data assumed trustworthy
config = json.loads(uploaded_config_file.read())
apply_system_settings(config)
# User-uploaded JSON treated as trusted configuration.
```

## Why existing controls miss it

Type checkers verify shape (`dict`), not provenance. Linters check syntax, not trust-boundary crossings. The defect only becomes visible at the level of semantic boundary enforcement.

## Risk in government context

Injection attacks through unvalidated external data, data corruption of authoritative records, and compliance failures when data provenance cannot be demonstrated.

## ACF entries in this category

The ACF taxonomy separates the Tampering category into four failure modes (three core, one provisional):

- [ACF-T1: Authority Tier Conflation]({{< relref "/acf/t1-authority-tier-conflation" >}}) — external data treated as internal without validation
- [ACF-T2: Silent Coercion]({{< relref "/acf/t2-silent-coercion" >}}) — implicit type conversions that modify data meaning
- [ACF-T3: Unstructured Signal Parsing]({{< relref "/acf/t3-unstructured-signal-parsing" >}}) — unstructured signal parsing (provisional)
- [ACF-T4: Safety Guard Erosion]({{< relref "/acf/t4-safety-guard-erosion" >}}) — safety guard erosion (provisional)

## See also

- [ACF Taxonomy Index]({{< relref "/acf" >}}) — complete taxonomy of AI code failure modes
- [Elevation of Privilege]({{< relref "elevation-of-privilege" >}}) — related category: where T1 describes the missing validation boundary, E1 describes the consequence
- [Spoofing]({{< relref "spoofing" >}}) — related category: fabricated defaults that compound with unvalidated data
