## Wardline: An As-Built Specification
### Semantic Trust-Boundary Enforcement

**Date:** 8 August 2026
**Status:** DRAFT v1.0.0-draft — as-built
**Describes:** wardline v1.5.0 (plus current `release/1.5.0` branch behaviour, marked where it applies)
**Prepared by:** John Morrissey
**Document type:** As-built specification of a shipped static analyser — trust lattice, boundary declarations, rule catalogue, gate semantics, and verification properties
**Parent paper:** *Semantic Defects in AI-Generated Code: Assurance Frameworks for AI-Assisted Development in High-Stakes Code Paths*
**Implementation:** `wardline` on PyPI; repository `foundryside-dev/wardline`. Pure Python, `requires-python >= 3.12`, zero-dependency base package.
**Language frontends:** Python (full analyser), Rust (preview — command-injection slice)

---

### Version history

This table versions *the document*. Document versions and implementation versions are unrelated and unfortunately overlap — the specification had a 0.2.0 and so did the tool, about ten weeks apart and with nothing to do with each other. Implementation releases are dated in the growth arc below.

| Document version | Date | Status | Nature |
|---|---|---|---|
| 0.2.0 | 18 Mar 2026 | Superseded — archived 8 Aug 2026 | Designed specification, written before any implementation existed: four-tier authority model, eight-state machine, eight pattern rules, seventeen annotation groups, governed exception register, conformance profiles, Python and Java bindings. |
| 1.0.0-draft | 8 Aug 2026 | Current | As-built rewrite. Describes the implementation that exists, records what was designed and never built, and drops what the implementation did not need. |

The 0.2.0 documents are retained in the repository archive and are referred to throughout as *the designed specification (archived)*. They are cited as a record of design intent only. They are never evidence of behaviour: where this document and the archive disagree, the implementation governs, and where this document and the implementation disagree, the implementation governs.

---

### Designed, built, grown

The designed specification was written before a line of the tool existed. It reasoned from a four-tier authority model outward: tiers, then an eight-state enforcement machine, then eight pattern rules, then a governed exception register with reviewer identity and temporal separation, then conformance profiles for a multi-tool ecosystem that had no tools in it. It specified a manifest format, a cross-language taint propagation contract, a type-system enforcement layer, and a runtime structural layer. It was, in the author's own later assessment, a monument to complexity — internally coherent, externally unbuilt, and sized for an organisation rather than a repository.

What was built began as a deliberate retreat. Version 0.1.0 shipped on 30 May 2026 — ten weeks after the designed specification was dated — and it was small: the taint engine and trust lattice, decorator-based trust markers, **four** rules (`PY-WL-101` through `104`), JSONL and SARIF output, baselines and waivers with expiry, and, from day one rather than as later growth, the opt-in LLM triage judge. No manifest of trust topology, no governance register, no conformance scheme, no Java.

It then grew organically rather than by specification. Fourteen further releases between 30 May and 31 July 2026 — nine weeks, fifteen entries in the changelog counting 0.1.0 itself, with no 1.0.0 and no 1.4.0 — took it to v1.5.0: four rules became twenty-eight, and the tool acquired an MCP server, an agent-install command, a Rust preview frontend, trust-grammar packs, attestation and rekeying, FastAPI and Pydantic source coverage, and a steady progression of enforcement-honesty controls. The current `release/1.5.0` branch carries two more that no release has: a second judge transport and the inertness gate described in §3.1. The growth was driven by defects found in real code and by what the analyser could be made to prove, not by working through the designed backlog. Roughly half the rule set that exists today — deserialisation, dynamic execution, path traversal, SSRF, SQL injection, XXE, template injection, native-library loading — is classic sink analysis the designed specification never imagined, arrived at because the engine that tracked trust across boundaries turned out to be the same engine that tracks untrusted data into sinks. **The whole implementation is about ten weeks old**, and maturity claims anywhere in this document should be read against that.

Some of the design survived intact: the eight-state lattice is the designed §5.1 state machine, renamed and shipped. Some of it was implemented, measured, and *falsified* — the designed join algebra ran in production, produced false positives on correct code, and was replaced by a simpler operator, with a dated audit and an architecture decision record as the account (§4.3). And some of it did not survive at all: the governed exception register, the type-system and runtime enforcement layers, the trusted restoration boundaries, the conformance profiles, and the flagship `.get()`-default rule the parent paper leads with. Those are not quietly dropped. They are inventoried in §10 with their original intent recorded, because several remain worth building and none should be mistaken for shipped behaviour.

The pattern across all of it is worth stating in one line, because it is the most useful thing this rewrite has to say to anyone writing a specification ahead of an implementation. **The designed specification was a good threat model and a poor implementation plan.** Its threat identification survived almost entirely — manifest poisoning, coverage blindness leading to a green gate over nothing, governance fatigue, exception sprawl, and the evasion trajectory were all real, and all of them got answered. Its mechanism design survived almost nowhere. And in every case where a threat was answered, the built answer was a *mechanical* control where the specification had proposed a *procedural* one: two-person review of a manifest became caller-granted trust packs (§5); governance capacity planning became a CI test that fails when the waiver count outgrows the rule count (§8); coverage ratio reporting became a fail-closed inertness trip (§3.1). Cheaper, narrower, and enforced by the toolchain rather than by an organisation that has to keep caring.

The bar for this document is simple and enforceable: a reader who opens the repository must find every claim in it true.

---

### How to read this document

This document has two parts: Part I (this specification) and Part II (a Python practitioner reference derived from the implementation). There is no Java binding — no Java implementation exists, and none is planned.

**Adopters** (putting wardline on a project)
→ §1 (what it is), §2 (the problem), §3 (non-goals — read this before adopting), §5 (declarations and trust grants), §7 (gates and suppression) → Part II-A (install, decorators, configuration, CLI).

**Reviewers and assessors** (evaluating a wardline deployment)
→ §3 (non-goals), §4 (the trust lattice), §6 (rules and severity), §7 (gate, suppression channels, the "no governance" design position), §8 (verification properties), §9 (residual risks).

**Tool and frontend implementers**
→ §4 (lattice, operators, reachability invariant), §6 (rule catalogue and severity model), §11 (frontend registry and how a new language plugs in).

**Readers of the parent paper** (arriving with four-tier authority vocabulary)
→ §4.5 maps the four tiers onto the implemented lattice states. Read that first, then §6. The coding-posture and authority-collapse material that the designed specification carried is parent-paper doctrine and is not restated here; see *Semantic Defects in AI-Generated Code* (§5).

**Anyone deciding whether to trust this document**
→ §8 (how the implementation's claims are verified: labelled corpus, false-positive rate gate, sentinels, byte-identity goldens, self-hosting CI) and §10 (what was designed and never built).

---

### Contents

**Part I — Wardline: An As-Built Specification**

1. [What a Wardline is](#1-what-a-wardline-is)
2. [The problem a Wardline solves](#2-the-problem-a-wardline-solves)
3. [Non-goals](#3-non-goals)
4. [The trust lattice](#4-the-trust-lattice)
5. [Declarations and trust grants](#5-declarations-and-trust-grants)
6. [Rules and severity](#6-rules-and-severity)
7. [Gates, suppression, and the judge](#7-gates-suppression-and-the-judge)
8. [Verification properties](#8-verification-properties)
9. [Residual risks](#9-residual-risks)
10. [Roadmap: the unbuilt](#10-roadmap-the-unbuilt)
11. [Language frontends](#11-language-frontends)

**Part II — Practitioner Reference**

A. [Python reference](#a-python-reference)

---
