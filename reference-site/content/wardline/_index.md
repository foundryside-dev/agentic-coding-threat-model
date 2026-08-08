---
title: "Wardline"
weight: 3
bookCollapseSection: true
---

**Status:** As-built specification, DRAFT v1.0.0-draft (8 August 2026)
**Describes:** wardline v1.5.0, plus `release/1.5.0` branch behaviour where marked
**Implementation:** `wardline` on PyPI. Pure Python, `requires-python >= 3.12`, zero-dependency base package
**Language frontends:** Python (full analyser), Rust (preview — command-injection slice)

Wardline is a shipped static analyser for semantic trust boundaries. This section is a practitioner lookup over its **as-built specification** — what the tool does, verified against the implementation. It replaces the earlier *designed specification* (v0.2.0, 18 March 2026), which was written before any implementation existed and is now archived.

> [!WARNING]
> **Read this before using any earlier version of these pages.** The designed specification described a four-tier authority model, a manifest (`wardline.yaml`), eight pattern rules `WL-001`–`WL-008`, seventeen annotation groups, a governed exception register, conformance profiles, and parallel Python and Java bindings. Most of that was never built. **There is no Java binding, no manifest, no exception register, and no `WL-00x` rule.** Where this section and the implementation disagree, the implementation governs.

## Designed versus built — the short version

| Designed | Built | Status |
|---|---|---|
| Eight-state enforcement machine | Eight-state trust lattice, renamed one-for-one | **Shipped.** Five states reachable by default |
| Provenance-clash join algebra (`taint_join`) | Rank-meet `least_trusted` | **Falsified.** Built, measured, produced false positives on correct code, taken off the default path |
| Root `wardline.yaml` manifest declaring trust topology | Three decorators in the source; no manifest | **Reversed.** Configuration is optional |
| Procedural governance against manifest poisoning | Caller-granted trust (`--trust-pack`, `--trust-suppressions`, judge grants) | **Replaced by a mechanical control** |
| Eight pattern rules `WL-001`–`WL-008` | 26 Python rules `PY-WL-101`–`126` + 2 Rust preview rules | **Three survived**; roughly half the built catalogue is sink analysis the design never imagined |
| 8×8 severity/exceptionability matrix | Tier-modulated severity, ~10 lines | **Compressed** |
| Governed exception register, reviewer identity, expiry | "No governance" by design; three fingerprint-keyed suppression stores | **Not built** — see [Gates, suppression, and the judge]({{< relref "gates-suppression-and-judge" >}}) |
| Seventeen annotation groups | One (the generic trust boundary) | **Sixteen not built** |
| Python and Java bindings | Python frontend, Rust preview | **No Java** |
| Trusted restoration boundaries | Nothing | **Not built** — which is why two lattice states have no producer |

The one-line summary the specification's own author draws: *the designed specification was a good threat model and a poor implementation plan.* Its threat identification survived almost entirely; its mechanism design survived almost nowhere. In every case where a threat was answered, the built answer was a **mechanical** control where the design proposed a **procedural** one.

## Pages in this section

| Page | What you'll find |
|------|-----------------|
| [What a Wardline Is]({{< relref "what-a-wardline-is" >}}) | The declaration model, terms and definitions, what a wardline does and does not declare |
| [The Problem and Non-Goals]({{< relref "problem-and-non-goals" >}}) | The semantic gap, ACF taxonomy coverage as built, seven non-goals, and the opt-in corollary |
| [The Trust Lattice]({{< relref "trust-lattice" >}}) | Eight states, `TRUST_RANK`, `least_trusted` versus `taint_join`, the reachable set, and the parent paper's tier mapping |
| [Declarations and Trust Grants]({{< relref "declarations-and-trust-grants" >}}) | Three decorators, trust-grammar packs, the five caller-side grants, `--strict-defaults` |
| [Rules]({{< relref "rules" >}}) | The 28 shipped rules by family, tier-modulated severity, de-confliction, rule selection |
| [Gates, Suppression, and the Judge]({{< relref "gates-suppression-and-judge" >}}) | Gate decision model, inertness, the three suppression channels, the "No governance" position, LLM triage, attest/assure/rekey |
| [Verification Properties]({{< relref "verification" >}}) | The parent paper's seven properties assessed against the implementation |
| [Residual Risks]({{< relref "residual-risks" >}}) | Eleven risks as built, plus the risks the implementation closed |
| [Roadmap: The Unbuilt]({{< relref "roadmap-the-unbuilt" >}}) | Designed capabilities with no implementation behind them |
| [Language Frontends]({{< relref "language-frontends" >}}) | The frontend registry, Python, the Rust preview, and the candidate-language rubric |
| [Python Reference]({{< relref "python-reference" >}}) | Install, decorators, `weft.toml`, the command surface, suppression file formats, output formats, CI |

## Reading paths

| You are | Read |
|---|---|
| **Adopting wardline on a project** | [What a wardline is]({{< relref "what-a-wardline-is" >}}) → [problem and non-goals]({{< relref "problem-and-non-goals" >}}) → [declarations and grants]({{< relref "declarations-and-trust-grants" >}}) → [gates and suppression]({{< relref "gates-suppression-and-judge" >}}) → [Python reference]({{< relref "python-reference" >}}) |
| **Evaluating a wardline deployment** | [Non-goals]({{< relref "problem-and-non-goals" >}}) → [trust lattice]({{< relref "trust-lattice" >}}) → [rules]({{< relref "rules" >}}) → [gates and suppression]({{< relref "gates-suppression-and-judge" >}}) → [verification]({{< relref "verification" >}}) → [residual risks]({{< relref "residual-risks" >}}) |
| **Implementing a tool or frontend** | [Trust lattice]({{< relref "trust-lattice" >}}) → [rules]({{< relref "rules" >}}) → [language frontends]({{< relref "language-frontends" >}}) |
| **Arriving from the parent paper's four tiers** | [Trust lattice — tier mapping]({{< relref "trust-lattice" >}}#interpretation-for-readers-of-the-parent-paper), then [rules]({{< relref "rules" >}}) |
| **Deciding whether to trust the document** | [Verification]({{< relref "verification" >}}) and [roadmap: the unbuilt]({{< relref "roadmap-the-unbuilt" >}}) |

## Growth arc

| Release | Date | What arrived |
|---|---|---|
| 0.1.0 | 30 May 2026 | Taint engine and trust lattice, decorator markers, **four** rules (`PY-WL-101`–`104`), JSONL and SARIF, baselines and waivers with expiry, the opt-in LLM triage judge |
| 1.0.1 | 17 Jun 2026 | Explicit gate verdict; parse failures gate-eligible; the gate stops honouring committed suppressions (all breaking) |
| 1.1.0 | 29 Jun 2026 | Inert-gate visibility; attestation bundle schema v2 |
| 1.3.0 | 3 Jul 2026 | Zero scanned files reports `NOT_EVALUATED` |
| 1.5.0 | 31 Jul 2026 | 28 rules, MCP server, agent-install, Rust preview frontend, trust-grammar packs, attestation and rekeying, FastAPI and Pydantic sources |
| `release/1.5.0` | current branch | `--fail-on-inert`; Codex judge transport |

Fifteen changelog entries in nine weeks, with no 1.0.0 and no 1.4.0. **The whole implementation is about ten weeks old**, and every maturity claim in this section should be read against that.

## See also

- [ACF Taxonomy]({{< relref "/acf" >}}) — the failure modes wardline covers, partially covers, and does not cover ([coverage table]({{< relref "problem-and-non-goals" >}}#coverage-against-the-acf-taxonomy))
- [The Response Landscape]({{< relref "/threat-model/response-landscape" >}}) — where semantic boundary enforcement sits among the available controls
