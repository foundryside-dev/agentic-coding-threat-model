---
title: 'ACF-T1: Authority Tier Conflation'
sidebar:
  label: 'ACF-T1: Authority Tier Conflation'
  order: 4
acf:
  id: ACF-T1
  name: Authority Tier Conflation
  stride: tampering
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: critical
  detection_status: none
  portable_coverage: covered
  entry_status: core
  language_generality: language-general
  related: [ACF-E1, ACF-S5]
---

## Description

Data from an external, untrusted source is used in an internal, trusted context without passing through a validation boundary. The data's effective authority tier is silently elevated.

This is one of the two Critical-rated failure modes because it compromises the integrity of the internal data store — the system's source of truth. Once external data enters the internal store without validation, every downstream consumer trusts it as internal data. The failure shape is not a breach but contamination: the data looks legitimate, the system processes it correctly, and the corruption spreads through every downstream report, decision, and audit record that reads from the internal store.

Consider a workforce management system that ingests contractor records from a partner HR platform via nightly sync. External fields flow directly into the internal database with no schema enforcement, and the internal access control system reads a `clearance_tier` field from the contractors table when routing contractors to sensitive projects.

During a later partner-platform schema migration, a configuration error sets a new partner-internal `clearance_tier` field to `"elevated"` for all active contractors. The partner corrects the error within hours, but the nightly sync runs during the error window. The internal database receives 1,847 elevated records, and the access control system routes those contractors to sensitive project queues for 36 hours until the next sync restores the values.

The investigation cannot determine which elevated-routing sessions were legitimate. The access logs are internally consistent because the rule was correctly applied to the data as it existed; the data itself was wrong. The audit trail records what the system did, not what it should have known about the field's provenance. There was no attack and no negligent actor. The exposure was architectural: an external field shared a name with an internal field and entered the authoritative store without allowlisting or independent corroboration.

The contamination property distinguishes T1 from failure modes that produce an event such as a crash, alert, or anomalous log entry. Authority tier conflation produces no event. Data enters the store silently, is processed correctly, and corrupts every downstream decision, report, and audit record that depends on it. Correcting the source data does not retroactively correct decisions already made from it.

## Why agents produce this

Python's type system does not distinguish between data from different sources. A `dict` from `requests.get().json()` and a `dict` from a validated internal query are the same type. Agents see both as "a dict" and treat them interchangeably because nothing in the language tells them otherwise.

## Example

```python
# Agent-generated — clean, readable, wrong for this context
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

## Detection

Use taint analysis to trace the return values of functions marked `@external_boundary`, or matched by a known external-call table, and flag them if they reach trusted producers or data-store operations without passing through a validation boundary marked `@trust_boundary(to_level="GUARDED")` or `@trust_boundary(to_level="ASSURED")`. This is the core capability of the companion specification's implemented taint engine, and ACF-T1 is the central case its trust-flow rules cover: untrusted data reaching a trusted producer, whether by return value or call argument.

## Distinguished from

**ACF-T1 vs ACF-E1:** T1 is a provenance failure — external data crosses into trusted processing without passing a validation boundary. E1 is a decision failure — privileges or access are granted on the strength of unvalidated assertions or data. T1 asks "did this data earn trusted status?"; E1 asks "did this claim improperly trigger a privileged action?"

**ACF-S5 vs ACF-T1:** S5 is a representational failure — external and internal data are both reduced to untyped containers, so downstream code cannot distinguish them at the type level. T1 is the trust-boundary failure that results when such data crosses into trusted processing without validation. S5 makes T1 harder to detect; T1 is the semantic violation itself.
