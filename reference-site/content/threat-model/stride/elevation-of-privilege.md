---
title: "Elevation of Privilege"
weight: 6
stride_slug: "elevation-of-privilege"
---

In traditional STRIDE analysis, elevation of privilege involves a user or process gaining capabilities beyond what is authorised — exploiting a kernel vulnerability to move from user to root, leveraging a misconfigured role to access admin functions, or escaping a sandbox to reach the host system. The escalation is of *identity or access rights*.

The agentic variant is **implicit privilege grant**: external system assertions are accepted without independent verification, granting privileges based on unvalidated claims — treating an external authority statement as if it were an internal trust decision.

## Mechanism

Closely related to the Tampering category ([ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}})/[ACF-T2]({{< relref "/acf/t2-silent-coercion" >}})), but focussed on the *consequence* rather than the *mechanism*. Where T1 describes the missing validation boundary, E1 describes what happens next: the external system's assertion is acted upon as though it carried internal authority.

The privilege elevation is implicit — no explicit `setRole()` or `grantPermission()` call — because the elevation happens through data flow, not code structure.

## Code examples

```python
# User-supplied filter used in internal query without validation
def search_records(user_query: dict):
    results = db.query(Record).filter_by(**user_query)
    # Untrusted input unpacked into query — user can filter on internal fields.
    return results

# External system's assertion accepted without verification
partner_response = partner_api.verify_identity(applicant_id)
if partner_response.get("verified", False):
    grant_access(applicant_id)
    # No independent verification, no recording of the basis for the decision.
    # Partner's authority tier silently elevated to internal authority tier.
```

## Why existing controls miss it

The code follows common integration patterns. Scanners flag explicit privilege-escalation calls (`setRole()`, `grantPermission()`); they have no model for elevation-by-data-flow.

Both Critical-rated entries in the ACF taxonomy — [ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) (Authority Tier Conflation) and [ACF-E1]({{< relref "/acf/e1-implicit-privilege-grant" >}}) (Implicit Privilege Grant) — have zero detection capability from existing tooling. These are the highest-risk failures, and current tooling misses them entirely.

## Risk in government context

Unauthorised access to classified information, acceptance of unverified identity assertions in federated systems, and compliance failures in inter-agency data sharing.

ACF-E2's structural pattern also extends to the development process layer: agents inherit the operator's system credentials and execute privileged operations without the operator constraining scope — the same unvalidated delegation, expressed at the execution layer rather than the code layer.

## ACF entries in this category

The ACF taxonomy separates the Elevation of Privilege category into two core failure modes:

- [ACF-E1: Implicit Privilege Grant]({{< relref "/acf/e1-implicit-privilege-grant" >}}) — external assertions accepted without verification
- [ACF-E2: Unvalidated Delegation]({{< relref "/acf/e2-unvalidated-delegation" >}}) — delegation without independent verification

## See also

- [ACF Taxonomy Index]({{< relref "/acf" >}}) — complete taxonomy of AI code failure modes
- [ACF-T1: Authority Tier Conflation]({{< relref "/acf/t1-authority-tier-conflation" >}}) — related tampering pattern: missing validation boundary
- [ACF-T2: Silent Coercion]({{< relref "/acf/t2-silent-coercion" >}}) — related tampering pattern: implicit type conversions
- [Tampering]({{< relref "tampering" >}}) — related category: mechanism that produces the privilege elevation
