---
title: "ACF-T1: Authority Tier Conflation"
weight: 6
acf_id: "ACF-T1"
acf_name: "Authority Tier Conflation"
stride_category: "tampering"
risk_level: "critical"
detection_status: "none"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-E1", "ACF-S5"]
---

## Description

Data from an external (untrusted) source is used in an internal (trusted) context without passing through a validation boundary. The data's effective authority tier is silently elevated. This is one of the two Critical-rated failure modes in the taxonomy because it compromises the integrity of the internal data store — the system's source of truth.

## STRIDE Mapping

**Category:** Tampering | **Risk:** Critical | **Detection:** None

Authority tier conflation is a tampering failure because external data silently modifies the contents of an internal (trusted) data store. The data is not altered in transit — it is accepted without validation, which elevates its effective authority tier from untrusted to trusted.

## Generative Mechanism

Python's type system does not distinguish between data from different sources. A `dict` from `requests.get().json()` and a `dict` from a validated internal query are the same type. Agents see both as "a dict" and treat them interchangeably because nothing in the language tells them otherwise. The pattern is language-general: Java, C#, TypeScript, and Go all share this characteristic — external and internal data have the same types at the language level.

## Risk Rating

**Critical.** Silent compromise of trust boundaries; high likelihood of agent generation; no existing detection. Once external data enters the internal store without validation, every downstream consumer trusts it as internal data. The failure shape is not a breach but a contamination: the data looks legitimate, the system processes it correctly, and the corruption spreads through every downstream report, decision, and audit record that reads from the internal store.

## Code Examples

```python
# Agent-generated — clean, readable, catastrophically wrong
def sync_partner_records(partner_api_url):
    response = requests.get(f"{partner_api_url}/records")
    records = response.json()
    for record in records:
        db.execute(
            insert(internal_records).values(**record)
        )
    # External data inserted directly into internal database.
    # No schema validation, no field allowlisting, no type checking.
    # Partner could send arbitrary fields, wrong types, injection payloads.

# Correct — validate at the boundary
def sync_partner_records(partner_api_url):
    response = requests.get(f"{partner_api_url}/records")
    raw_records = response.json()
    for raw in raw_records:
        try:
            validated = PartnerRecordSchema.validate(raw)
        except ValidationError as e:
            quarantine(raw, reason=str(e))
            continue
        db.execute(
            insert(internal_records).values(
                name=validated.name,
                status=validated.status,
            )
        )
```

### Extended scenario — workforce management system

Consider a workforce management system that ingests contractor records from a partner HR platform via nightly sync. The sync code does `INSERT INTO contractors VALUES(**record)` — external fields flow directly into the internal database with no schema enforcement. The internal access control system reads a `clearance_tier` field from the contractors table when routing contractors to sensitive projects.

Three months after deployment, the partner platform undergoes a schema migration. A developer at the partner organisation makes a configuration error: a new internal field called `clearance_tier` — used by the partner's own workflow engine to flag records for manual review — is accidentally set to `"elevated"` for all active contractors during the migration. The partner notices the error within hours and corrects it. From the partner's perspective, it is a brief internal data quality incident, resolved before end of day.

From the internal system's perspective: the nightly sync ran during the error window. 1,847 contractor records now have `clearance_tier = "elevated"` in the internal database. The access control system, reading `clearance_tier` as an authoritative internal field, routes those contractors to sensitive project queues they should not be able to reach. For 36 hours — until the next nightly sync restores the correct values — elevated routing applies to 1,847 contractors.

The investigation that follows is confused at every level. Operations sees anomalous routing decisions, but the access control logs show the rule was correctly applied: `clearance_tier = "elevated"` did produce elevated routing. The rule is not wrong. Security traces the elevated values to the partner sync, contacts the partner, and confirms the data quality incident. The internal database is corrected with a re-sync.

But the investigation cannot answer the question that matters: during the 36-hour window, which elevated-routing sessions were legitimate and which were not? The access logs are internally consistent — the rule was correctly applied to the data as it existed. The data was wrong. The audit trail is forensically useless for the window in question, because it records what the system did, not what the system *should have known* about the provenance of the field it was acting on.

There was no attack. No one was negligent. The partner developer who made the configuration error fixed it within hours. The internal system worked exactly as designed. The exposure was a property of the architecture: a field arrived from an external source, shared a name with an internal field, and was inserted directly into the internal database where it was treated as authoritative. The validation boundary that would have caught this — that would have treated `clearance_tier` from an external source as an untrusted claim requiring field allowlisting and independent corroboration — was never built.

## Impact

**The contamination property distinguishes T1 from other failure modes.** A traditional vulnerability produces an event: a crash, an alert, an anomalous log entry. Authority tier conflation produces no event. The data enters the store silently, is processed correctly by every downstream system, and corrupts every downstream decision, report, and audit record that depends on it. By the time the contamination is discovered, it may have propagated through months of records — reports generated from the internal store, decisions made on the basis of those reports, downstream systems that ingested the internal store's output as their own authoritative input. Correcting the source data does not retroactively correct the decisions made on the basis of it.

## Detection Approaches

Taint analysis — trace the return values of functions marked `@external_boundary` (or matched by a known external call heuristic list) and flag if they reach data store operations without passing through a function marked `@validates_external` (or, in the decomposed two-step validation case, `@validates_shape` followed by `@validates_semantic`). This is tier-flow enforcement between declared boundaries. No widely deployed tool currently detects this; project-specific pattern matching provides limited intra-function proxy coverage.

## Prevention

No pattern rule covers ACF-T1 directly. The failure mode requires taint analysis across function boundaries — tracing data flow from external sources to internal stores. Organisations should establish explicit validation boundaries between external inputs and internal data stores as an architectural control.

## Related Entries

- [ACF-E1: Implicit Privilege Grant](../e1-implicit-privilege-grant/) — Both involve accepting external assertions without independent verification, but T1 concerns data integrity (external data contaminating internal stores) while E1 concerns access control (external assertions granting privileges).
- [ACF-S5: Type Structure Avoidance](../s5-type-structure-avoidance/) — When agents avoid creating typed structures for external data, the absence of type boundaries makes T1 harder to detect because there is no type-level distinction between validated and unvalidated data.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
