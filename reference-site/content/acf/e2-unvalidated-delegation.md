---
title: "ACF-E2: Unvalidated Delegation"
weight: 21
acf_id: "ACF-E2"
acf_name: "Unvalidated Delegation"
stride_category: "elevation-of-privilege"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "known-class-agent-amplified"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: []
---

## Description

User-supplied parameters are used directly in privileged operations (database queries, file access, system commands) without validation or restriction. The delegation effectively grants the user the same privilege level as the database query itself. While this is a known vulnerability class, agents produce it at systematically higher rates because the concise, idiomatic pattern is the shortest path from input to query.

## STRIDE Mapping

**Category:** Elevation of Privilege

User-supplied parameters flow directly into privileged operations without restriction. The user effectively gains the same privilege level as the operation itself — they can filter on internal fields, modify restricted data, or access records that should be gated by access control.

## Risk Rating

**High.** Data integrity, audit trail, or availability impact; moderate-to-high likelihood of agent generation. The concise, idiomatic nature of the insecure pattern means agents produce it reflexively — the shortest path from input to query is also the insecure path.

## Generative Mechanism

The pattern `db.query(Model).filter_by(**user_params)` is concise and idiomatic. Agents produce it because it is the shortest path from input to query. The concept that user parameters must be restricted to an allowlist of permitted fields is a security requirement, not a language requirement. Training data is saturated with this concise pattern because it works correctly in contexts where all fields are publicly queryable — agents apply it without distinguishing between public and restricted fields.

## Examples

```python
# Agent-generated — concise, idiomatic, insecure
def search_records(user_query: dict):
    return db.query(Record).filter_by(**user_query)
# User can filter on internal fields: is_deleted, internal_score,
# admin_notes — fields that should not be queryable.

# Correct — restrict to allowed fields
ALLOWED_SEARCH_FIELDS = frozenset({"name", "status", "created_date"})

def search_records(user_query: dict):
    filtered = {
        k: v for k, v in user_query.items()
        if k in ALLOWED_SEARCH_FIELDS
    }
    return db.query(Record).filter_by(**filtered)
```

## Impact

Unvalidated delegation allows users to access data or operations they should not have access to. By passing arbitrary parameters to a privileged operation, a user can filter on internal fields (exposing hidden data), modify fields that should be read-only, or access records that should be restricted. The delegation effectively grants the user the same privilege level as the database query itself.

## Process-Layer Dimension

The same structural pattern extends beyond generated code to the development process itself. Agentic coding tools inherit the operator's system credentials and execute privileged operations — shell commands, package installation, git push, CI configuration changes — without the operator constraining the scope of permissible operations. This is a condition by design, and the default posture of most agentic frameworks is to grant broad execution authority. The mitigation is the same principle applied at the process layer: restrict delegation to an allowlist of permitted operations, just as the code-level mitigation restricts query parameters to an allowlist of permitted fields.

## Detection

SQL injection scanners catch some cases (especially string interpolation into SQL). Parameter delegation via `**kwargs` unpacking into ORM queries is less consistently detected. Semantic detection requires understanding which operations are privileged and which parameters are user-controlled. Taint analysis can trace user input to privileged operations, but distinguishing validated from unvalidated parameters requires annotation of validation boundaries. Semantic enforcement addresses ACF-E2 through taint analysis combined with access-and-attribution declarations, which verify that authorisation checks precede privileged operations.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

No pattern rule covers ACF-E2 directly. The failure mode is addressed through taint analysis combined with access-and-attribution declarations, which verify that authorisation checks precede privileged operations. Organisations should enforce field allowlists on all user-supplied parameters before they reach privileged operations.

## Related Entries

ACF-E2 has no directly related entries in the core taxonomy. It is a known vulnerability class (unvalidated input to privileged operations) that is produced at systematically higher rates by agents due to the concise, idiomatic nature of the insecure pattern. The failure mode is distinct from [ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) (Authority Tier Conflation) — T1 concerns data flowing from untrusted to trusted stores, while E2 concerns user parameters flowing directly to privileged operations without field restriction.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
