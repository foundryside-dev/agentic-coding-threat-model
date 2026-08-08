---
title: "Residual Risks"
weight: 8
---

These are **properties of the implementation as it exists**, not defects awaiting a fix. Some are inherited from the designed specification and survive intact because they were structural rather than speculative. Some the implementation has answered, and are recorded as closed. Several are new — they exist *because* of choices the implementation made.

Each entry names the risk, the mechanism that limits it, and the point at which the mechanism stops.

## Declaration risks

### 1. Declaration correctness

Wardline enforces the trust topology the code declares. If `@trusted` sits on a function that assembles data from an unvetted source, or `@external_boundary` marks a function that is not in fact the perimeter, **enforcement is structurally correct and semantically meaningless** — the gate faithfully implements a wrong map.

| Pushes back | Cannot establish |
|---|---|
| `PY-WL-110` flags contradictory or ambiguous trust declarations | Whether the declared level is the *right* level for the data in question |
| `PY-WL-114` rejects an invalid decorator level | |
| `PY-WL-119` flags a boundary whose validator is degenerate | |

That judgement is human, and the implementation provides **no governance apparatus to compel it** — the designed specification's ratification model was never built.

### 2. Dishonest declaration

Distinct from honest error. An agent generating code with wardline markers may produce structurally valid but **semantically dishonest** declarations — a `@trust_boundary(to_level=ASSURED)` on a function that performs a check unrelated to the constraint the caller cares about.

The structural rules catch the crude cases: `PY-WL-102` (no rejection path), `PY-WL-113` (fail-open), `PY-WL-111` (rejection path exists only as an `assert`, CWE-617), `PY-WL-119` (validator rejects nothing).

**A validator that rejects *something irrelevant* satisfies all four.** Structural verification establishes that a boundary is a boundary; it cannot establish that it is the *right* boundary.

### 3. Coverage is opt-in, so absence of findings is not evidence of safety

> "Wardline is silent until you opt in. Undecorated code sits in the developer-freedom zone." — the project README

A repository with zero recognised trust boundaries produces zero defects, and `wardline scan . --fail-on ERROR` over it passes green while checking nothing. The [inertness trip]({{< relref "gates-suppression-and-judge" >}}#inertness) exists to make that visible, and no suppression can clear it.

**Two limits follow:**

1. `--fail-on-inert` defaults to `False` — the compensating control is present but not on by default, and the same applies to `--fail-on-unanalyzed`.
2. **Inertness is a floor, not a coverage metric.** Three boundaries over three thousand functions is not inert, and nothing in the tool says that ratio is thin. The designed annotation-coverage reporting requirement was not built.

## Analysis-scope risks

### 4. The analysis is deliberately bounded

> Wardline is "deliberately L1–L2 with an L3 project fixed point, not an exhaustive path-sensitive whole-program prover", favouring "a small, precise, opt-in rule set over broad SAST coverage."

That is a defensible position, stated openly — but it means **the guarantees are conditional**. Taint is tracked per variable through assignments, container operations, control-flow merges and call returns to a project-level fixed point, **not along every path a value could take**. Calls the resolver cannot resolve fall back to conservative states, which trades false negatives for noise in one direction and noise for silence in the other, depending on the fallback.

### 5. The dependency surface is covered by enumeration, not by contract

The designed `dependency_taint` declarations with version pinning and governance rationale were not built. What exists is curated:

- `scanner/taint/stdlib_taint.yaml` — return taint for a small set of standard-library calls, "so that common unresolved cross-module calls do not inflate `UNKNOWN_RAW` rates"
- `fastapi_sources.py` and `pydantic_discovery.py` — two named framework surfaces

These tables are auditable and versioned into the summary-cache key, so a table edit invalidates dependent summaries. **They are also finite.** A library outside them is handled by whatever the resolver can infer, and there is **no declaration mechanism by which a project can record — and have reviewed — a claim about what a given dependency returns.**

### 6. Sink coverage is enumerative

Roughly half the Python rule set is sink analysis. **Each rule recognises the sinks it knows.** A dangerous call the catalogue does not name is not checked, and the catalogue grows by deliberate addition rather than by inference. Same trade as risk 4, expressed at rule level.

### 7. Evasion-surface trajectory

The evasion surface for pattern rules grows as model capability grows: models that currently produce structurally sloppy code will produce structurally clean, semantically wrong code, routing around syntactic tripwires **without adversarial intent**.

| Family | Exposure |
|---|---|
| Boundary discipline | The observation holds |
| Sink rules | Holds **less strongly** — the pattern being matched is a call to a specific dangerous target rather than a stylistic idiom. A model cannot rephrase its way out of calling `subprocess` with tainted input, only out of being *recognised* as calling it, through indirection the callgraph does not resolve |

The compensating machinery is the [labelled corpus]({{< relref "verification" >}}#property-1--golden-corpus), which is where new evasion variants become measurable rather than anecdotal.

## Trust-grant and suppression risks

### 8. Grant residency

[Caller-granted trust]({{< relref "declarations-and-trust-grants" >}}#caller-granted-trust) is the implementation's strongest structural answer to manifest poisoning, and the precise formulation is: **repository *config* cannot self-authorise the scan gate.**

The residual sits in the word *config*. `install/mcp_json.py` reads `--trust-pack` and `--allow-custom-packs` out of a repository's `.mcp.json` and **preserves them when repairing that entry** — defensibly, since stripping a grant would silently return a working taint gate to inert. So a repository-controlled file shapes what an installed MCP entry launches with.

**An operator who runs `wardline install` against an unfamiliar repository inherits the launch flags that repository recorded.** The scan gate remains fail-closed on the caller's own invocation; the install path is where repository-controlled input reaches the grant surface.

### 9. Suppression channels carry no ownership and no signature

None of baseline, waivers, or judged records carries a reviewer identity, an approving authority, or a signature. The module docstrings say so verbatim: **"No governance."**

This is defensible because **suppression carries no gate authority by default** — the `--fail-on` gate evaluates a separately built *unsuppressed* population. The absence of signatures does not mean an unsigned entry can turn a build green. It cannot, unless the caller granted it the power to.

Secondary controls already in the files: a waiver's reason is mandatory; an expired waiver stops suppressing and the finding resurfaces; `test_waiver_discipline.py` requires a reason on every waiver and caps waiver count at rule count; the files are plain, human-readable, and committed, so they appear in every diff the project already reviews.

**Two residuals survive the bound:**

1. **Habitual grants.** An operator who adds `--trust-suppressions` to a shared script or a CI job to stop a red build re-inherits the full exposure, and nothing in the tool distinguishes a considered grant from a reflexive one.
2. **The record of *who* lives in version-control history, not in the artefact.** A suppression entry does not know that the code it was written against has since changed.

### 10. Judged suppression is manually invoked and automatically consequential

`wardline judge` is never auto-invoked — no scan reaches for a language model on its own. But a judged record is **persistent and auto-applied**: once a finding is labelled `FALSE_POSITIVE`, it is suppressed on every later scan.

The record carries `model_id`, `judge_transport`, `confidence`, `recorded_at`, and `policy_hash`, so the provenance is legible and the policy under which it was made is anchored — **recorded, not checked; nothing compares a later scan's policy against it.**

The asymmetry is bounded by the same secure default as risk 9: a judged record annotates every later scan but **cannot clear a gate the caller did not grant suppression trust to**. A model's `FALSE_POSITIVE` label is durable and automatic in what it *says*, not in what it can *authorise*.

**What remains is drift.** The label was formed against a specific finding in specific code, and neither the model nor the file learns that the code has since changed. A record that was correct when written can become wrong silently.

> [!NOTE]
> **One bound narrows that without removing it.** Under the current `wlfp2` scheme a fingerprint is a SHA-256 over exactly four inputs: **rule identifier, path, qualname, and taint path.** Line numbers are deliberately excluded, so a comment inserted above a function keeps the record attached — which is the intent.
>
> But a **rename**, a **move to another module**, or a **change in the route by which taint reaches the finding** alters one of the four, orphans the record, and the finding **resurfaces as active**. The drift risk therefore lives only in the window where all four inputs stay identical while the meaning of the code beneath them changes; where the join does break, **it breaks in the safe direction**, and `wardline rekey` exists for the case where the break is a deliberate scheme change rather than an edit.

### 11. Attestation proves integrity, not authorship

`core/attest.py` signs the posture bundle with **HMAC-SHA256 under a shared project key**. Its own threat-model docstring is unambiguous: this is "tamper-evidence within a key-holding trust domain," and is "NOT public, asymmetric, non-repudiable proof."

Verification requires possessing the same secret used to sign, so **anyone who can verify a bundle can also produce one**. Asymmetric signing would bind a bundle to a signer, but needs a non-stdlib dependency the zero-dependency base forbids — HMAC is "forced, not chosen."

**A bundle must not be presented as evidence of *who* produced a posture.** Waiver debt is inside the signed payload (`days_left` may go negative, "surfaced honestly, never dropped"), so a bundle cannot be made to look cleaner than the tree it describes — but only against a holder of the key.

## Risks the implementation closed

Two risks the designed specification carried do not arise as built. *How* each stopped being a risk is the more useful information.

### MIXED-state coarseness — predicted, and understated

The designed specification devoted a residual risk to the imprecision of collapsing composite values to `MIXED_RAW`, and proposed a field-sensitive `MIXED_TRACKED` extension state.

**The risk was real. It was worse than the register said, and the register's proposed remedy was the wrong one.** The provenance-clash join was implemented, measured against real code, and taken off the default path: two *clean* values of different families combining to `MIXED_RAW` — rank 7, inside the firing raw zone — was a `PY-WL-101` false positive on correct code. [Full account]({{< relref "trust-lattice" >}}#combination-two-operators-one-in-use).

So the designed risk correctly identified the join as the weak point, but framed it as a *precision* problem calling for a finer state. **It was an operator problem calling for a different operator.** The remedy was not more granularity in the lattice; it was declining to treat a provenance difference as a trust reduction at all.

### A note on the register's predictive record

**Three of the designed specification's fourteen residual risks were confirmed by implementation experience** rather than by argument — a better hit rate than a pre-implementation risk register usually earns.

| Designed risk | Confirmed by |
|---|---|
| Risk 4 — annotation coverage gaps | `core/resolution_posture.py` exists precisely for this; its docstring names the failure it catches, that a codebase with zero recognised boundaries passes a gate "while checking nothing," and calls that "false assurance" |
| Risk 11 — MIXED-state coarseness | The falsified join above |
| Risk 14 — third-party library boundary taint | Predicted that conservative treatment of library returns would generate enough noise to create pressure to over-declare. `stdlib_taint.yaml` exists, in its own words, "so that common unresolved cross-module calls do not inflate `UNKNOWN_RAW` rates" |

**Where the register was wrong, it was wrong by being too abstract. It was not wrong about where to look.**

### Governance decay

Several designed risks — expedited-path normalisation, governance fatigue, the governance-layer attack surface — described ways in which a human governance apparatus erodes under delivery pressure.

**No such apparatus was built.** There is no exception register, no reviewer identity, no ratification interval, and no expedited path to normalise. Those risks are not *mitigated*; they are **absent**, because the mechanism they attach to does not exist.

What replaces them is risks 8 through 11 above: **the surface that a hostile or careless actor targets is now the grant path and the suppression files, not a review workflow.** The designed governance model remains in [the roadmap]({{< relref "roadmap-the-unbuilt" >}}#the-governed-exception-register) precisely because removing the apparatus removed both the decay risk **and the assurance it was meant to provide**.

## See also

- [Gates, Suppression, and the Judge]({{< relref "gates-suppression-and-judge" >}}) — the mechanical controls that bound risks 8–11
- [Verification Properties]({{< relref "verification" >}}) — measured recall as the largest verification gap
- [Roadmap: The Unbuilt]({{< relref "roadmap-the-unbuilt" >}}) — what would close several of these
