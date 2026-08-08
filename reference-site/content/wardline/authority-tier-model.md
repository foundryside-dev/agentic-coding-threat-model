---
title: "Authority Tier Model"
weight: 1
---

The authority tier model is the foundation of any wardline. It defines how an application categorises its data according to the guarantees the system is entitled to assume about each value.

## Four tiers

| Tier | Classification | Meaning | Coding posture |
|------|---------------|---------|----------------|
| **Tier 1: Trusted assertion** | Authoritative internal data | Audit records, decision products, fact records. Missingness or corruption is an integrity failure — halt, do not default. | Offensive programming (invariant-enforcing, halt-on-breach) — assume invariants, detonate on breach. |
| **Tier 2: Semantically validated representation** | Semantically validated data | Has passed through both structural and semantic validation boundaries. Structure is trustworthy *and* values satisfy all domain constraints for every intended use within the declared bounded context. This includes external data that has been fully validated and internal data that has been re-validated after deserialisation or restoration. Safe to use for its declared semantic purposes without further value-level validation of the represented fields. | Confident programming — trust field values for domain operations; guard only against cross-cutting concerns (authorisation, concurrency, freshness, state transitions) that value-level validation cannot address. |
| **Tier 3: Shape-validated representation** | Shape-validated data | Has passed through a structural validation boundary. Fields are present, types are correct, the data conforms to its declared structural contract. Safe to handle — will not crash code that accesses its fields — but values may be nonsensical, unsafe, or out of domain range. | Guarded programming — direct field access is safe; validate domain constraints before using values in business logic, arithmetic, or security-sensitive operations. |
| **Tier 4: Raw observation** | Unvalidated external data | From outside the system boundary. May be malformed, malicious, or missing. Handling it without structural validation risks crashes; using its values risks silent corruption. | Sceptical programming — treat as hostile, validate structure first, normalise, reject. |

The coding posture column is normative. Each tier's posture is a consequence of what the preceding validation step has established:

- **Tier 1** is not defensive against malformed data — it is offensive against invariant violation. Fallback idioms (field access with defaults, attribute access with fallbacks, broad exception handling) are prohibited because they convert integrity failures into undetected corruption.
- **Tier 2** trusts both structure and values. Domain constraints have been verified for every intended use within the declared bounded context, so per-site value-level re-validation is redundant. Code at Tier 2 may use field values directly in calculations, comparisons, and decision logic. Cross-cutting concerns — authorisation checks, freshness verification, concurrency guards, state-transition validation — remain necessary because they are not properties of the data's values.
- **Tier 3** trusts structure but not values. Field access is safe (the structural contract guarantees the field exists and has the right type), but using a value in a division, a URL fetch, or a security decision without checking domain constraints is unsafe. The `.get()` with a default is redundant in Tier 3 (the field is guaranteed present) but the value it returns may still be dangerous.
- **Tier 4** trusts nothing. Even accessing a field may crash if the field is absent or the data is malformed.

Once these postures are explicit, the [pattern rules]({{< relref "rules" >}}) stop looking arbitrary and start looking like consequences of the tier model. The scope of the failure response (process crash vs request rejection vs circuit-breaker activation) is path-specific and determined by the application's architecture.

## Coding posture model

The conventional contrast in defensive programming literature is binary: fail-soft (graceful degradation) versus fail-fast (halt-on-anomaly). AI coding agents uniformly apply the former even where the latter is required. This framework extends the binary contrast to four postures — offensive, confident, guarded, sceptical — each tied to a specific tier. The extension is motivated by the need for finer posture granularity: a binary model maps postures only to the endpoints (offensive at Tier 1, sceptical at Tier 4). The intermediate postures — confident (Tier 2) and guarded (Tier 3) — occupy the space between those endpoints that a two-way contrast does not distinguish.

## Bidirectional authority collapse

Uniform defensive patterns produce a compound failure: they simultaneously give unvalidated external data more authority than it has earned (defaults and coercion allow Tier 4 data to cross inward as though validated) while treating authoritative internal data as more negotiable than it is allowed to be (the same patterns handle corruption of Tier 1 records as routine and recoverable rather than exceptional and evidentiary). The collapse is bidirectional because it degrades the authority model from both ends at once — too permissive at the perimeter and too casual at the core.

This framework's tier model and pattern rules address both directions: rules WL-001 through WL-004 fire at Tier 1 taint states to prevent the downward collapse (authoritative data treated as negotiable), and the same rules fire at Tier 4 / UNKNOWN / MIXED states to prevent the upward collapse (unvalidated data given unearned authority). The [severity matrix]({{< relref "rules" >}}) encodes these asymmetric enforcement consequences.

## Knowledge requirement at each promotion

Each tier transition requires knowledge proportional to its scope:

- **Shape validation (T4 to T3)** requires knowledge of the data's *structure* — its declared structural contract.
- **Semantic validation (T3 to T2)** requires knowledge of the data's *usage across the declared bounded context* — every intended use of the data and the constraints each imposes.
- **Trusted construction (T2 to T1)** requires knowledge of the data's *institutional meaning* — what authority the artefact carries and under what rules it may be produced.

Each step is a wider knowledge claim than the last, and each is a correspondingly bigger deal to get wrong.

## Verification gradient

The three transitions differ not only in knowledge scope but in *verification strength*:

- **T4 to T3** is machine-verifiable: schema conformance is decidable, and the enforcement tool can confirm that the structural contract is satisfied.
- **T3 to T2** rests on a governance-backed claim: the bounded-context declaration asserts that the validator satisfies every consumer's constraints, but this assertion is not machine-verified — the enforcement tool confirms that the declaration *exists* and that its contracts are coherent, not that they are *adequate*.
- **T2 to T1** is institutional: trusted construction is an act of institutional interpretation that no tool can verify.

Each step up the tier model widens the knowledge claim and weakens the verification guarantee. Tier 2's "confident programming" posture is therefore backed by a softer guarantee than Tier 3's "guarded programming" posture — the confidence rests on governance quality, not machine proof.

## Comprehensive validation scope

Semantic validation is always comprehensive within its scope: it establishes that the data satisfies every domain constraint for every intended use within the declared bounded context, not merely those of one particular code path. Data that has been validated for some uses but not all remains at Tier 3 until a validator with knowledge of all intended consumers has cleared it. In practice, this is often straightforward — a `base_url` must always be a valid, safe URL; an `amount` must always be non-negative — because the constraints are obvious and universal for that field. The hard cases are rare but important: they are the fields where different consumers impose different constraints, and the semantic validator must satisfy all of them.

The enforcement implementation of this model — effective states, taint-state algebra, transition semantics, restoration boundaries, and cross-language taint propagation — is specified in the [Enforcement specification]({{< relref "enforcement" >}}).

---

## See also

- [Enforcement specification]({{< relref "wardline/enforcement" >}}) — taint-state algebra and enforcement layers
- [Annotation vocabulary]({{< relref "wardline/annotation-vocabulary" >}}) — the declaration surface that maps to authority tiers
- [Verification and conformance]({{< relref "wardline/verification" >}}) — verification properties and conformance profiles
