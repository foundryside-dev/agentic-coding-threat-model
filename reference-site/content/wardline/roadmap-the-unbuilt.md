---
title: "Roadmap: The Unbuilt"
weight: 9
---

The designed specification described a great deal that was never built. Most of it was never built for a good reason — it presumed an organisational apparatus no command-line tool can supply, or a language-integration depth no static analyser reaches. Some was never built because the implementation grew from a deliberately minimal starting point and has not reached it yet.

> [!WARNING]
> **Nothing on this page is a commitment, and nothing on this page is implemented.** It exists so that a reader who wants to know what the design *intended* can find it without excavating the archive, and so a contributor can tell the difference between an idea that was **tried and rejected** and an idea that was **merely deferred**.

**Two roadmaps should not be confused.** The implementation maintains its own near-term thread list in `ROADMAP.md` — completeness work on the `explain_taint` chain, return-indirection in the explain surface, taint-combination hardening, star-import resolution for decorator markers — all incremental work on machinery that already exists, tracked as issues. **This page is the other thing entirely: designed capabilities with no implementation behind them at all.**

## Rules designed but not implemented

Five of the designed specification's eight framework rules have no counterpart in the shipped catalogue.

### WL-001 — member access with a fallback default

The flagship example of the parent paper — `.get("security_classification", "OFFICIAL")` on external data — **has no rule**.

The design held that fetching a member with a fallback default buries a policy decision inside a data-access idiom: where absence is meaningful, fabricating a value converts an integrity failure into silent corruption; where a structural contract guarantees presence, the fallback is redundant and masks the defect when the contract changes.

**This is the single largest gap between the paper's argument and the tool's behaviour, and it remains the most defensible thing on this page.**

### Declared-domain-defaults — the mechanism WL-001 needs to be usable

WL-001 alone would be intolerable: external data legitimately has optional fields, and a rule that fires on every one produces noise rather than signal. The design's answer was a **three-state field classification declared against the data source** rather than repeated at each access site:

| Classification | Behaviour |
|---|---|
| **Required** | Absence is an error; the finding always stands |
| **Optional with an approved default** | The finding is suppressed **only** when the declared default and the code default match exactly, and **only** inside a declared validation boundary |
| **Optional with no default** | Absence must be represented explicitly, never substituted |

**The design's sharpest move was the mismatch case:** a code default that *differs* from the institutionally approved default was a **more severe** finding than an undeclared default, because it represents a direct contradiction with declared policy rather than an omission.

This mechanism needs a per-source declaration surface the implementation does not have.

### WL-002 — existence-checking as a structural gate

Probing for a member's presence where the declared trust state already guarantees structure is either masking a defect or redundant noise. The design graded it by context: unconditional in states with both structural guarantees and known provenance, governable where structure is validated but provenance is not, and expected in raw contexts where existence-checking is legitimate domain logic.

### WL-005 — audit-critical writes inside broad exception handlers

The implementation flags broad exception handlers (`PY-WL-103`) and silently swallowed exceptions (`PY-WL-104`) inside trusted-tier functions. **It does not distinguish the specific case the design considered worst:** an audit write nested inside a broad handler, where the handler catches the audit failure along with everything else and execution continues as though the record were written.

*That is a repudiation vector with a legal record on the other end of it, and it deserves its own finding.*

### WL-006 — runtime type-checking of internal data

Internal data's type should be guaranteed by construction. The design's argument: a runtime type check on the system's own artefacts is a **confession of structural doubt** — either the construction guarantee is real and the check is noise, or it is not real and the check is masking a deeper problem.

Implementing this well requires distinguishing defensive checks at genuine boundaries from defensive checks in the interior, which is exactly the distinction the trust lattice already draws.

### WL-008 — semantic validation without prior shape validation

An **ordering constraint** rather than a body-content check: a boundary applying domain-constraint checks to data whose field presence and type correctness have never been established may crash, mislead, or silently operate on the wrong types. The design required the scanner to trace a semantic boundary's inputs back to a shape boundary's outputs on every data-flow path.

**The taint engine has the callgraph and the propagation machinery this would need; the rule was never written.**

## Trusted restoration boundaries

The design separated **construction** — producing a new authoritative artefact from validated inputs — from **restoration**, which reconstitutes a previously serialised authoritative artefact from its raw representation. Restoration required an evidence-backed provenance claim across four cumulative categories:

| Evidence category | What it establishes | Verifiable by a tool? |
|---|---|---|
| **Structural** | The representation passes shape validation | Yes — the minimum for any restoration above raw |
| **Semantic** | Domain constraints re-verified, because business rules evolve and data valid at serialisation time may not be valid now | Yes |
| **Integrity** | Checksums or signatures establishing the representation has not been modified since serialisation | Yes |
| **Provenance-institutional** | An attestation that the storage boundary is under the organisation's control | **No — explicitly institutional, not technical** |

The categories determined the restored state: all four yielded full restoration; missing integrity capped restoration one level lower; **missing institutional attestation meant no known-provenance state was reachable at all**.

**The value in this design is that last point.** It refuses trust uplift on assertion: a developer or an agent claiming "this is internal data" gets nothing for the claim. The implementation has no restoration concept; `PY-WL-120` is the nearest thing, flagging the flow rather than adjudicating the evidence behind it.

> [!NOTE]
> **This is the item with the sharpest evidence behind it, and the evidence is in the lattice.**
>
> `UNKNOWN_GUARDED` and `UNKNOWN_ASSURED` are canonical states in `core/taints.py`, carrying ranks 4 and 3 — and [neither is ever produced]({{< relref "trust-lattice" >}}#reachability-five-states-not-eight). They are not vestigial names. They are **exactly the two states the designed restoration model produced**: structure and semantics verified with no institutional attestation gives the assured-but-unknown-origin state; structure alone gives the guarded-but-unknown-origin state.
>
> Restoration boundaries were their producer. Restoration boundaries were never built, so the states have no way to come into existence. **The rooms were specified and the staircase was never built.**

That framing cuts both ways. It is a **real gap**: the lattice reserves expressive capacity for data that has passed technical validation but carries no institutional provenance claim, and nothing in the tool can currently place data there. It is also **why the states were retained rather than deleted** — the ADR that resolved the reachable-set question kept the `UNKNOWN_*` family explicitly for "extensibility headroom."

## Enforcement layers beyond static analysis

The design specified three enforcement layers on the principle that each layer's blind spots are another layer's coverage. **The implementation built one.**

**The type-system layer** would carry trust state in type annotations, so passing raw data where guarded data is expected produces a diagnostic **at development time** rather than a finding in CI, and records at different trust states with identical field structures become distinguishable types. *The attraction is feedback latency: a type error arrives while the code is being written, which is where an agent's generation loop can consume it.*

**The runtime structural layer** would make certain violations **impossible rather than detectable** — accessing an unset authoritative field raising rather than defaulting, subclasses of protected base classes unable to add unmarked methods, deserialised data unable to claim a trust state it has not earned. *This is the layer that addresses the class of defect static analysis structurally cannot see, because the pattern* works: *a fallback default returns a value, and nothing fails.*

The implementation is **static-only, by construction and without apology**. Both layers remain the honest answer to the question "what does static analysis miss," and the answer to that question is unchanged by not having built them.

## The governed exception register

The designed governance model made suppression a **governed act** rather than a file edit. An exception record carried:

- reviewer identity and role
- a rationale
- a grant date and an expiry
- **the severity at the time of grant**, so a later severity change could not silently widen the exception's coverage
- a provenance field recording whether the exception followed the standard or the expedited path, and whether it was agent-originated

Exceptions were graded by an **exceptionability class**:

| Class | Meaning |
|---|---|
| `UNCONDITIONAL` | A project invariant, not overridable by anyone |
| `STANDARD` | Overridable with documented rationale, named reviewer, and expiry |
| `RELAXED` | Acknowledgeable with lighter burden |
| `TRANSPARENT` | Expected in context; no governance required |

Each rule carried a matrix assigning a severity and an exceptionability class **per trust state**, so the same pattern was unconditional in one context and expected in another.

**Two of the design's better ideas sit inside this:**

1. **The expedited governance ratio** as a leading indicator of decay — every emergency path becomes the default path under sustained pressure, and the ratio makes that visible *before* it is complete.
2. **Optional `elimination_path` and `elimination_cost` fields**, which convert an exception register from a suppression list into an **architectural debt ledger** — a healthy deployment sees exceptions shift over time from deferred fixes toward genuine domain variance.

**As built, suppression is ungoverned by design.** The register does not exist, and the exceptionability matrix survives only in reduced form as the tier-modulated severity model. What replaces the governance is **mechanical rather than procedural**: suppression records carry no authority to clear a gate unless the caller grants it — so the question the register answered by asking *who approved this* is answered instead by **making an unapproved suppression unable to do the damage**.

That is a narrower guarantee than the register offered: *it bounds the blast radius without recording the decision.* The parts it does not replace are the ones worth revisiting — **reviewer identity, expiry with mandatory re-review, and the `elimination_path` ledger.**

## Cross-language taint propagation

The design specified what happens when data crosses between language runtimes, each with its own enforcement tool: **it resets to unknown-raw in the receiving binding**, because the receiver cannot verify the emitter's assertions. A receiving binding could preserve state only if it could independently verify the emitter's claim — in practice, through a shared declaration both bindings enforce identically.

The rule is deliberately conservative: over-tainting well-classified data is a cost, but the alternative allows a weaker binding to **launder trust state through a language boundary**.

The implementation now has [two frontends]({{< relref "language-frontends" >}}) and therefore has the problem in front of it, at least in principle. **Nothing in the current design propagates taint between them** — a Python scan and a Rust scan are separate runs over separate file sets with no shared state.

## Conformance profiles

The design anticipated an **ecosystem** — a type checker implementing one slice, a linter plugin implementing another, a CI orchestrator implementing the governance slice — and partitioned its conformance criteria accordingly, so a contributor facing a ten-criterion checklist would not conclude that the specification demanded a bespoke product. It also partitioned the governance burden into a *lite* profile for small teams and an *assurance* profile for organisations with dedicated capacity, with declared graduation triggers.

This was solving a real adoption problem, and the reasoning still stands for a multi-tool ecosystem. **There is no such ecosystem.** There is one tool, and its conformance surface is [the test suite]({{< relref "verification" >}}). That is a narrower claim than a conformance profile makes, and it is one that **can be verified by running it**.

## The manifest

The designed `wardline.yaml` — declaring tier assignments for data sources, a ratification authority, a review interval, overlay boundary declarations, dependency taint entries, and a fingerprint baseline — **was never built**. The `wardline.yaml` that exists in the implementation's repository root is 101 bytes of federation endpoint URLs.

**Most of the manifest's purpose has been superseded rather than deferred.** Its trust-grant function is answered better by [caller-granted trust]({{< relref "declarations-and-trust-grants" >}}), which moves the authority from a repository file to the invoking operator and closes the poisoning path mechanically rather than procedurally.

**Two parts are not superseded:**

1. The per-source declarations that declared-domain-defaults needs
2. The dependency taint declarations that would let a project record and review a claim about what a third-party call returns

If a declaration surface is ever built, those are the two things it should carry — **and the caller-grant model should govern it, so that the file declares and the operator grants.**

## Smaller designed items

**Asymmetric attestation signing.** `wardline attest` signs with HMAC-SHA256 under a shared project key, which establishes that a bundle has not changed since signing and **nothing about who signed it**. Asymmetric signing would bind a bundle to a signer and make it evidence *outside* the key-holding domain — which is what an external assessor actually needs. It requires a non-stdlib cryptographic dependency the zero-dependency base forbids. Confining the dependency to the existing `scanner` extra, or a new one, is the obvious route and has not been taken.

**Recall measurement by synthetic failure injection.** [Recall is the largest gap]({{< relref "verification" >}}#property-4--measured-recall) in the verification story: nothing counts what the engine misses. The designed bootstrapping route was to **inject known violations into the project's own clean code** and measure how many the scanner recovers, against a floor deliberately set below the precision floor. The machinery this needs — a labelled corpus, a reconciler, a deterministic analyser run — already exists; **what is missing is the injector and the ground truth it would generate.**

**Audit-primacy and atomicity annotations.** The designed vocabulary carried a group declaring which operations constitute the legal record and how they are ordered relative to logging and telemetry, and another declaring whether an operation is idempotent, atomic, or compensatable. Together they are what would take [ACF-R2]({{< relref "/acf/r2-partial-completion" >}}) from partially covered to covered: the implemented exception rules catch a failure that is caught and swallowed, but **nothing knows which write was the one that had to happen**, or which sequence of writes had to happen together. This is also the declaration surface WL-005 would need.

**The sixteen other annotation groups.** The designed vocabulary had seventeen groups; the generic trust boundary is the one that shipped. The rest — audit primacy, component contracts, data provenance, schema contracts, layer boundaries, template and parse safety, secret handling, operation semantics, failure mode, data sensitivity, determinism, concurrency and ordering, access and attribution, lifecycle and scope, and restoration boundaries — are unbuilt.

> Several would need no new engine, only rules and a vocabulary entry; several duplicate what other tools already do well; and **the reason the surviving one is the whole vocabulary is that it was the only group whose declarations the taint engine could actually check.** That is the test a candidate group should be held to before it is added.

## See also

- [Rules]({{< relref "rules" >}}) — what was built instead
- [Residual Risks]({{< relref "residual-risks" >}}) — the gaps these items would close
- [The Trust Lattice]({{< relref "trust-lattice" >}}#reachability-five-states-not-eight) — the two states with no producer
