---
tags:
  - architect
  - specification
---

# Wardline: Semantic Trust-Boundary Enforcement

[:material-file-pdf-box: Download PDF](../pdf/wardline-companion-community.pdf){ .md-button }

## What this is

Wardline is a static analyser that reads the trust boundaries an application declares about itself and checks whether the code honours them. It is a shipped tool, not a proposal: `wardline` on PyPI, repository `foundryside-dev/wardline`, pure Python, `requires-python >= 3.12`, zero-dependency base package. This section documents **v1.5.0** as built.

A wardline is the set of declarations an application makes about where its trust boundaries are — which functions take untrusted data in, which functions raise trust by validating it, and which functions are entitled to assume they are working on trusted data. Everything else follows from those declarations: the trust lattice is what a declaration assigns, the rules are what a declaration makes checkable, and the gate is what a declaration makes enforceable.

The declarations live in the source, on the functions they describe, as three decorators. **There is no manifest.** The tool requires no project-level policy file to scan a codebase; configuration under `weft.toml [wardline]` is optional and, where it names trust-extending packs, is subordinate to what the caller grants at the command line. Because the declarations sit in the source, a wardline is not a document about a codebase — it is a property of one. It cannot drift from the code it describes without the drift being a code change, visible in the same diff and reviewed by the same reviewer.

A wardline declares four things, all of them local to a function:

- that a function's return is raw and untrusted, because the data crosses into the system there;
- that a function validates, and what trust level its output has earned;
- that a function is entitled to assume trusted data, and at what level;
- by omission, that a function is in the developer-freedom zone and is not being asserted about at all.

It does not declare what the data *means*. The implemented model is narrow and correspondingly defensible: it decides whether a function's actual trust matches its declared trust, and whether untrusted data reaches a dangerous sink. It cannot decide whether a validator checks the *right* predicate.

The declarations themselves come from a tiny marker package (`weft-markers`) whose runtime behaviour is to do nothing. They survive uninstalling wardline. What they cost the application is three import lines; what they buy is that the institutional knowledge of where the trust boundaries are stops living in reviewers' heads.

## The problem it solves

There is a structural gap between what automated tooling checks and what high-stakes code requires. The standard assurance stack — linters, type checkers, SAST, DAST, unit tests, conventional peer review — verifies *syntactic* and *conventional* correctness. It cannot determine whether a fallback default is institutionally appropriate, whether an exception handler preserves the audit trail, or whether data crossing a trust boundary has actually been validated on the way through.

Agent-generated code exploits this gap systematically. Agents produce code that follows established good practice — defensive programming, graceful error handling, sensible defaults — applied without contextual judgement. A `.get("security_classification", "OFFICIAL")` is syntactically identical to `.get("city", "Sydney")`. The first silently downgrades a document's classification; the second supplies a harmless location default. No tool in the standard assurance stack distinguishes them, because the distinction is *semantic*.

A wardline closes part of that gap by supplying the context the tool cannot infer. Once a function declares that it produces trusted data, the analyser has something to check against — whether the data actually reaching that function's return has been through a validating boundary, or whether it arrived raw from outside and was simply relabelled. The declaration is the missing premise.

**Wardline is silent until you opt in.** Undecorated code resolves to the developer-freedom zone and the tier-modulated severity model suppresses findings on it. A scan over a large untouched codebase produces no policy findings at all. That buys adoption without a suppression bankruptcy on day one — and it costs one thing, severely: a project that declares nothing gets a green gate that is enforcing nothing. The compensating control is the inertness trip (`--fail-on-inert`), which turns "recognised no trust boundaries" into a gate failure that no suppression can clear.

## Designed, then built

This section is an **as-built specification**, and the difference between what was designed and what exists is part of its subject matter rather than an embarrassment to be tidied away.

A designed specification was written in March 2026, before a line of the tool existed. It reasoned outward from a four-tier authority model: tiers, then an eight-state enforcement machine, then eight pattern rules, then a governed exception register with reviewer identity and temporal separation, then conformance profiles for a multi-tool ecosystem that had no tools in it — plus a manifest format, a cross-language taint contract, a type-system enforcement layer, a runtime structural layer, and Python and Java bindings. It was, in the author's own later assessment, internally coherent and externally unbuilt.

What was built began as a deliberate retreat. Version 0.1.0 shipped on 30 May 2026 and was small: the taint engine and trust lattice, decorator-based trust markers, four rules, JSONL and SARIF output, baselines and waivers with expiry, and an opt-in LLM triage judge. Fourteen further releases over nine weeks took it to v1.5.0 — four rules became twenty-eight, and the tool acquired an MCP server, an agent-install command, a Rust preview frontend, trust-grammar packs, attestation and rekeying, and a steady progression of enforcement-honesty controls. **The whole implementation is about ten weeks old**, and maturity claims should be read against that.

Some of the design survived intact: the eight-state lattice is the designed state machine, renamed and shipped. Some was implemented, measured, and *falsified* — the designed join algebra ran in production, produced false positives on correct code, and was replaced by a simpler operator, with a dated audit and an architecture decision record as the account. And some did not survive at all: the governed exception register, the type-system and runtime enforcement layers, the trusted restoration boundaries, the conformance profiles, and the flagship `.get()`-default rule the parent paper leads with. Those are not quietly dropped — they are inventoried, with their original intent recorded, in the specification's roadmap of the unbuilt.

The pattern is worth one line: **the designed specification was a good threat model and a poor implementation plan.** Its threat identification survived almost entirely; its mechanism design survived almost nowhere. In every case where a threat was answered, the built answer was a *mechanical* control where the specification had proposed a *procedural* one.

**No Java binding.** There is no Java implementation, there never was, and none is planned. Rust is a *scanned target language* with a two-rule preview frontend, not a binding.

## Document structure

- **[Specification (as built)](specification.md)** — Part I: the trust lattice and its operators, declarations and caller-granted trust, the twenty-eight-rule catalogue and tier-modulated severity, gates, suppression channels and the judge, verification properties, residual risks, the roadmap of the unbuilt, and the language frontend registry.
- **[Python reference](python-binding.md)** — Part II: installation, the three decorators, `weft.toml` configuration, the command surface, the three suppression file formats, output formats, a worked example, and CI integration.
- **[PDF](../pdf/wardline-companion-community.pdf)** — the complete companion document, both parts, in one file.

## Who should read what

| Audience | Recommended path |
|----------|-----------------|
| **Adopters** (putting wardline on a project) | [§1](specification.md#1-what-a-wardline-is) (what it is), [§2](specification.md#2-the-problem-a-wardline-solves) (the problem), [§3](specification.md#3-non-goals) (non-goals — read this before adopting), [§5](specification.md#5-declarations-and-trust-grants) (declarations and trust grants), [§7](specification.md#7-gates-suppression-and-the-judge) (gates and suppression), then the [Python reference](python-binding.md) for install, decorators, configuration and CLI. |
| **Reviewers and assessors** (evaluating a wardline deployment) | [§3](specification.md#3-non-goals) (non-goals), [§4](specification.md#4-the-trust-lattice) (the trust lattice), [§6](specification.md#6-rules-and-severity) (rules and severity), [§7](specification.md#7-gates-suppression-and-the-judge) (gate, suppression channels, the "no governance" design position), [§8](specification.md#8-verification-properties) (verification properties), [§9](specification.md#9-residual-risks) (residual risks). |
| **Tool and frontend implementers** | [§4](specification.md#4-the-trust-lattice) (lattice, operators, reachability invariant), [§6](specification.md#6-rules-and-severity) (rule catalogue and severity model), [§11](specification.md#11-language-frontends) (frontend registry and how a new language plugs in). |
| **Readers of the parent paper** (arriving with four-tier authority vocabulary) | [§4.5](specification.md#45-interpretation-for-readers-of-the-parent-paper) maps the four tiers onto the implemented lattice states. Read that first, then [§6](specification.md#6-rules-and-severity). |
| **Anyone deciding whether to trust the document** | [§8](specification.md#8-verification-properties) (how the implementation's claims are verified: labelled corpus, false-positive rate gate, sentinels, byte-identity goldens, self-hosting CI) and [§10](specification.md#10-roadmap-the-unbuilt) (what was designed and never built). |
| **Citizen programmers** (reviewing or writing code without developer tooling) | The [Practical Guide for Code Authors](../respond/practical-guide.md) — a separate companion that translates the ideas into five review questions, worked code examples, and hot-path identification for non-specialists. It is not part of the specification. |

---

**See also:** [Discussion Paper](../understand/index.md) | [ACF Taxonomy](../understand/taxonomy.md)
