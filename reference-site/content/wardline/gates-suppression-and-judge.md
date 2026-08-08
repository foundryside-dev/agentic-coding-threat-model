---
title: "Gates, Suppression, and the Judge"
weight: 6
---

The [lattice]({{< relref "trust-lattice" >}}) assigns trust, the [declarations]({{< relref "declarations-and-trust-grants" >}}) fix it, the [rules]({{< relref "rules" >}}) make it checkable. This page is the last step: turning a stream of findings into a decision a pipeline can act on, and what may and may not overturn that decision.

**The organising idea is the same one that governs declarations.** A repository may say a great deal about how it wishes to be assessed. None of that binds the assessment. The caller decides what the repository's own content is allowed to do to the gate — and the default is that repository-resident suppression files have **no authority over the gate at all**.

## The gate decision

A scan produces a `GateDecision`. It is a **data object, not an exception**: a tripped gate is an ordinary outcome the surfaces render, never an error the tool raises. Both the CLI and the MCP server call the same `gate_decision()` factory over the same `ScanResult`, so the two surfaces cannot drift.

| Field | Meaning |
|---|---|
| `verdict` | `NOT_EVALUATED`, `PASSED`, or `FAILED` |
| `tripped` | Whether any sub-gate fired. `exit_class` mirrors it (0 or 1) |
| `reason` | A human-readable sentence naming the count and class of defects that decided it, **and the population it judged** |

`verdict` exists because **`tripped: false` is not the same statement as "this tree is clean"**. A scan invoked with no threshold has not been assessed; a scan over zero discovered files has assessed nothing. Both are `NOT_EVALUATED`.

The dataclass makes the dishonest combinations **unconstructible**, as `__post_init__` guards rather than conventions:

- `PASSED` requires a configured gate
- `PASSED` over zero scanned files raises
- `FAILED` holds if and only if the gate tripped
- every decision must carry a reason

Alongside the verdict, every decision reports **`would_trip_at`** — the highest severity at which the gate *would* have tripped on the population it saw, computed in every branch including the no-threshold one. A first bare `wardline scan` therefore cannot read as a green light: it says it did not evaluate, and it names the worst thing it found.

### Three sub-gates

They compose into the single `tripped` flag, and the decision decomposes it (`severity_tripped`, `unanalyzed_tripped`, `inert_tripped`) so a consumer can attribute a trip without parsing prose.

| Sub-gate | Flag | Default | Trips when |
|---|---|---|---|
| **Severity** | `--fail-on {CRITICAL,ERROR,WARN,INFO}` | none — enforcement is an explicit act | Any active finding of kind `defect` carries a severity at or above the threshold |
| **Unanalysed** | `--fail-on-unanalyzed` | `False` | Any file was discovered but never analysed despite being analysable — a parse error, a recursion-depth skip, a missing source root. Benign no-module skips are excluded |
| **Inertness** | `--fail-on-inert` | `False` | The scan recognised **zero** trust boundaries over a non-trivial amount of code |

Severity `NONE` is absent from the ordering and can never gate.

> [!NOTE]
> **Rule maturity does not affect gating.** A `preview` rule gates exactly like a `stable` one, and is baselineable on the same terms. This was corrected in v1.2, when the gate was found to have been *ignoring* any rule of `preview` maturity — a scan could pass green with an active `ERROR` defect present. Maturity is now purely informational, and `UPGRADING.md` records that there is no configuration flag to restore the old behaviour.

Note the asymmetry the implementation already builds in for the unanalysed gate: parse errors and file failures are themselves gate-eligible `ERROR` defects, so part of that territory is covered by `--fail-on` alone.

## Inertness

Inertness detection answers the failure mode the opt-in posture creates. A codebase with no recognised boundaries produces no defects no matter what it does, and `wardline scan . --fail-on ERROR` over it **passes green while checking nothing**. Before this existed, the only hint was `INFO`-severity `WLN-L3-LOW-RESOLUTION` noise — "exactly the severity an agent filters out."

**The mechanism is deliberately cheap.** It reads no new analysis; it folds the `WLN-ENGINE-METRICS` finding the engine already emits. That finding carries a per-function provenance histogram whose total is the number of functions analysed and whose `anchored` and `config` buckets count functions seeded from a recognised boundary or a configured source.

| Condition | Value |
|---|---|
| Recognised trust boundaries | 0 |
| Functions analysed | ≥ 5 |

The five-function floor exempts a single crafted temporary file — an exploration is not a gate. `low_resolution_ratio` is reported alongside as a secondary health number and **deliberately does not drive the verdict**, because a framework-heavy application legitimately resolves few of its library calls.

> [!CAUTION]
> **Nothing can clear an inert trip.** The agent-facing summary says so in as many words: the gate failed because the scan is inert, and *"suppressions cannot clear this trip."* An inert trip means the gate had nothing to enforce; a suppression store is a statement about findings, and there are none.
>
> The only resolutions are to declare boundaries, bind a trust vocabulary with a pack, or drop the flag.

**Release status.** `--fail-on-inert` is present on the `release/1.5.0` branch and does not appear in the CHANGELOG — read it as current-branch behaviour, not as shipped in v1.5.0. The inert *posture field* (`resolution.inert`) and the stderr banner shipped in v1.1.0 and are released, as is `--fail-on-unanalyzed`. Both flags default to `False`.

This is the parent paper's [seventh verification property]({{< relref "verification" >}}#property-7--inertness-detection), implemented.

## What the gate judges

> [!WARNING]
> **By default, repository-resident suppression files annotate findings but cannot clear the gate.**

`run_scan` takes `trust_suppressions`, defaulting to `False`. When it is off — the default — the scan builds **two populations from one analysis**:

| Population | Suppression applied | Used for |
|---|---|---|
| **Emitted** findings | baseline, waiver, and judged records applied; every finding carries an accurate suppression state and reason | What a developer reads; what a report shows; the summary-line counts |
| **Gate** population | **zero** suppression applied, built by the same structural path | What `--fail-on` evaluates |

**The threat this closes:** baseline, waivers, and judged records are all committed repository content, so a malicious pull request could add an entry keyed to the fingerprint of its own new defect and clear the gate. Under the secure default it cannot — the entry is honoured in the display, ignored in the decision.

### Two escapes, and the difference between them

| Escape | What it does | When it is appropriate |
|---|---|---|
| `--trust-suppressions` | Hands authority back to the repository's files | An explicit operator trust decision. Appropriate for a trusted local checkout and for the judge workflow's internals. **Never appropriate for enforcement over untrusted pull-request content** |
| `--new-since <ref>` | The CI ratchet — scopes both the emitted findings and the gate to what is new since an operator-supplied reference | Pull-request builds. **The reference comes from the pipeline, not from the tree**, which is what makes it unforgeable in a way a committed file is not |

The gate's `reason` string names the escape rather than leaving the situation mysterious:

```
N suppressed ERROR+ defect(s) (baseline/waiver/judged) not cleared;
pass --trust-suppressions (trusted checkout) or --new-since <ref> (PR)
```

Because the guidance is generated from the actual gate population rather than the display set, a delta scan cannot misreport a repository-suppressed defect as active and swallow the guidance.

**The migration signal.** `baseline_migration_hint` fires in exactly one situation — a committed baseline exists, the gate tripped, the trip is driven *solely* by baselined defects re-entering the unsuppressed population, and neither escape was passed — and prints a one-line explanation of why the repository went red with no code change. A genuine active trip, a waiver-only trip, or a trusted run all return `None`, so the hint cannot become background noise.

### Robustness to scoping

Three separate properties:

1. **`--fail-on` cannot be armed in `--affected` mode at all.** Composing them is a hard error and exit 2 — an advisory delta analysing part of the tree cannot certify a green gate.
2. **The gate population is never narrowed by the scope filter.** The emitted findings are narrowed to the affected entities, but a producer-supplied scope cannot hide a co-located finding from the gate.
3. **A clean delta subset reports `NOT_EVALUATED`, not `PASSED`** — analysing 40 of 900 files does not certify the other 860. An empty or wholly unresolvable scope falls back to a full scan.

## Three suppression channels

All three stores live under `.weft/wardline/`, all are keyed on a finding's fingerprint, and all are resolved by a **single join predicate** in `core/finding_identity.py` with the precedence:

> **waiver > judged > baseline**

An active waiver (explicit human intent, carrying an expiry) beats a judge's `FALSE_POSITIVE` verdict, which beats a silent baseline match. Factoring the join into one predicate means the suppression layer asks a question rather than re-implementing precedence at each call site.

| Channel | File | Written by | Carries |
|---|---|---|---|
| **Baseline** | `baseline.yaml` | `wardline baseline create` / `update` | Fingerprint, plus rule, path, and message for git-diff legibility. **Only the fingerprint is loaded into the match set.** No reason, no expiry |
| **Waiver** | `waivers.yaml` | the `waiver_add` MCP tool | Fingerprint, **mandatory** reason, optional ISO `expires`, optional SEI entity identity |
| **Judged** | `judged.yaml` | `wardline judge --write` | Fingerprint, rule, path, message, model rationale, `model_id`, transport, confidence, `recorded_at`, `policy_hash` |

**Baseline** is the accept-the-past channel: a snapshot of what the tree currently produces, so enforcement can begin at the current line without a remediation project first. It is deliberately the weakest record — a baseline match is a silent membership test, which is why it sits lowest in the precedence order.

**Waivers** are the deliberate-exception channel, and are **machine-written**: there is no waiver CLI command; the writing path is the `waiver_add` MCP tool, which is why the store lives in wardline's own state directory rather than in operator-authored `weft.toml`. The reason field is not advisory — `parse_waivers` raises `ConfigError` on a missing or blank reason, both on load *and* before any write, so a reasonless waiver cannot be created and cannot be honoured if hand-inserted. Expiry is optional but real: a waiver is active **through** its expiry day and stops suppressing strictly after it, so the finding resurfaces. The optional `entity_sei` binds the waiver to a rename-surviving identity, carried verbatim and never parsed. **A malformed entry anywhere in the store is a hard load error** — a finding must never be silently suppressed by a bad record.

**Judged** records carry two integrity properties worth stating here. A judged record suppresses **only** as a `FALSE_POSITIVE` verdict: the field is required and any other value is rejected on load, so a hand-edited `TRUE_POSITIVE` cannot be smuggled in as a silent suppression. And the provenance fields — `model_id`, `judge_transport`, `policy_hash`, `confidence`, `rationale` — are all **required, never defaulted**, on the stated grounds that a judged record with no attributable model, policy, or confidence is an unauditable suppression.

## The "No governance" position

The module docstrings of all three stores carry the same two-word verdict: **"No governance."**

That is a design position, not an oversight. There is **no owner field, no approver, no reviewer identity, no temporal separation between author and approver, no signature on either file, and no exceptionability classes** determining which findings may be suppressed at all. The designed specification proposed all of it — a governed exception register with reviewer identity, temporal separation, four exceptionability classes and an 8×8 severity/exceptionability matrix. None of it was built.

The position is defensible because the implementation answers the same threat by a different route:

1. **The primary control is mechanical: the files have no authority over the gate.** An ungoverned suppression store that cannot clear a gate is a very different object from one that can. Governance apparatus on these files would be protecting an authority the files do not, by default, hold. **Authority was moved to the caller instead of being administered inside the repository.**
2. **Provenance is required where it is available.** A waiver must carry a reason; a judged record must carry its model, transport, policy hash, confidence, and the model's verbatim rationale — which `judged.py` calls *"the audit primitive."* Neither file records *who*, but both record *why*.
3. **Debt is surfaced rather than dropped.** The `assure` posture carries a `waiver_debt` entry per configured waiver with `days_left`, which may be negative for a lapsed waiver — "surfaced honestly, never dropped." That debt sits inside the signed attestation payload.
4. **A test constrains accumulation.** `tests/corpus/test_waiver_discipline.py` asserts that every waiver carries a reason and that the waiver count does not exceed the built-in rule count — a false-positive-economics tripwire, on the reasoning that suppression outgrowing the rule set that justifies it is a signal about the rules.

> [!WARNING]
> **What remains genuinely absent is accountability for the decision.** Nothing records that a named person accepted a risk, nothing prevents the same actor from raising and approving a suppression, and nothing signs either file. In a setting that requires an attributable acceptance record, that record must live **outside the tool** — in the review that admits the commit which adds the entry.

## The judge

`wardline judge` submits one active `defect` finding, with a code excerpt, to a language model and asks for a single label: `TRUE_POSITIVE` or `FALSE_POSITIVE`. **It is triage, not analysis** — the judge never produces findings, only verdicts about findings the engine already produced.

The judge is not a later addition. It shipped in v0.1.0 on 30 May 2026, in the first release. **The design position that a model may adjudicate findings but never generate them, and that its rationale is the record, is original to the implementation.** What grew was the surrounding rigour.

**Release status.** The Codex transport, the `AUTO`/`CODEX_CLI`/`OPENROUTER` selector, and version-2 judged records carrying `judge_transport` are all unreleased on the current `release/1.5.0` branch. Released code writes version-1 judged records, whose provenance is OpenRouter. The fail-loud contract, the opt-in write, and caller-granted judge trust are released.

| Transport | Mechanism |
|---|---|
| `OPENROUTER` | A stdlib `urllib` POST, keeping the base package dependency-free |
| `CODEX_CLI` | The model as a **sealed subprocess** — a bounded execution environment with no ambient state roots, a bounded process runner with output byte limits, and a small read-only tool surface (`read_file`, `grep_files`, `glob_files`) capped at `max_calls = 24` per judgement. **The judge may read the repository to reach its verdict; it cannot write to it** |
| `AUTO` | Selector |

**Fail-loud contract.** Malformed model output raises `JudgeContractError` and the run crashes. This is the single most consequential design decision in the module, and it is applied with unusual thoroughness — non-UTF-8 output, output over the byte limit, duplicate JSON object keys, non-finite JSON numbers, a malformed JSONL event, an error or failed event, a missing final agent message, more or fewer than exactly one `turn.completed` event: each is a contract error rather than a value to coerce. *A judge that quietly recovers from a broken response is a judge whose suppressions cannot be trusted, because the recovery path is precisely where an unaudited default would be invented.*

**Writing is opt-in.** `--write` is a flag; the default is a dry run that reports verdicts and persists nothing. `FALSE_POSITIVE` verdicts appended to `judged.yaml` are the only judge output with any persistence.

**Caller-granted trust extends to the judge.** `--trust-judge-policy` admits the project's policy file as *untrusted judge context*; `--trust-judge-config` permits project configuration to select the transport, models, excerpt size, finding cap, and write-confidence floor. Without those grants a repository cannot influence how it is judged.

### The asymmetry

**The judge is never invoked automatically.** `core/run.py` — the module both the CLI and the MCP server call to scan — does not import `core.judge`. It imports `core.judged`, the record store. **No scan can reach a model.** The separation is structural rather than conventional: a scan is a pure function of disk and configuration.

**Judged records, however, are applied automatically and forever.** `run_scan` calls `load_judged` on every scan that applies suppression at all. A finding a model labelled a false positive once carries that label on every subsequent scan, with **no expiry field and no re-judgement trigger**. Waivers are the only channel with an expiry mechanism.

> **Judging is manual and opt-in; its consequences are automatic and persistent.** A single interactive decision, made by a model, becomes standing policy for the repository.

Two things bound the asymmetry, and neither dissolves it. First, under the default a judged record is applied to the annotated stream, **not to the gate**. Second, the provenance requirements make the standing decision inspectable years later. **What is not bounded is drift** — the engine changes, the rules change, the policy hash is recorded but nothing acts on a mismatch. Recorded as [residual risk 10]({{< relref "residual-risks" >}}#trust-grant-and-suppression-risks).

## Attest, assure, and rekey

Three commands sit above the gate and answer questions a pass/fail decision cannot.

### `wardline assure` — coverage, not defect count

Its framing question is the prior one a fail-closed tool must own: **how much of the declared trust surface did the engine reach a definite verdict on, and how much is honestly unknown?**

- The **denominator** is anchored (trust-declared) entities only, because undecorated code is the developer-freedom zone and never counts.
- **Coverage** means "verdict reached either way", so a defect is *covered* — the engine reached a definite negative verdict.
- The **honesty gap** is the `unknown` set: entities whose trust could not be proven, because there is no computed return taint, because the tier is undeclared or `UNKNOWN_*`, or because the engine under-scanned. Files discovered but never analysed each count as at least one uncovered surface item.

Per-entity verdicts are delegated wholesale to `classify_entity_trust`, the single source of truth, so an `assure` rollup and a `dossier` trust section cannot disagree.

### `wardline attest` — a signed posture bundle

Builds and signs a reproducible bundle: the `assure` posture including its waiver debt, the declared boundaries, the ruleset hash, the git commit and dirty flag. The CLI is **fail-closed on a dirty tree** unless `--allow-dirty` is passed, so a bundle's commit truthfully pins its source.

Determinism is a hard requirement of the format: every list in the payload is sorted on a stable key, and the only date-sensitive field is the waiver debt's `days_left`. The HMAC binds the **outer envelope schema** as well as the payload, so a future schema relabel cannot verify against the wrong wire contract.

> [!CAUTION]
> **The signature is HMAC-SHA256 with a SHARED PROJECT KEY.** That is *tamper-evidence within a key-holding trust domain* — **NOT public, asymmetric, non-repudiable proof**. Verification requires possessing the same secret used to sign, so anyone holding the project key can both produce and verify a bundle.
>
> Asymmetric signing would prove authorship without sharing a secret, but requires a non-stdlib dependency the zero-dependency base forbids. **HMAC is forced, not chosen.** A bundle MUST NOT be presented as cryptographic proof of *who* produced it.

### `wardline rekey` — migrating fingerprint-keyed stores

Fingerprints are the join key for all three stores, so changing how a fingerprint is computed **orphans every suppression in the repository**. Rekey computes both the old and the new fingerprint for every finding from a single scan and produces the remap that re-keys the stores, carrying baseline, waiver, and judged verdicts across the migration. It never touches the production hash, the analyser, or the rules.

The identity scheme is a frozen contract; rekey is what makes freezing it survivable.

## How the gate learned to be honest

Almost nothing on this page was in the first release. The gate machinery accumulated over about ten weeks, and it accumulated in **one direction** — each step closed a way for the tool to report a pass it had not earned.

| Step | Shipped | What it closed |
|---|---|---|
| Explicit gate verdict — "no vacuous green" | v1.0.1, 17 Jun 2026 | A bare scan with no `--fail-on` exited 0 and read as a pass |
| Parse failures become gate-eligible *(breaking)* | v1.0.1, 17 Jun 2026 | A file that could not be read or parsed was a silent skip |
| The gate stops honouring committed suppressions *(breaking)* | v1.0.1, 17 Jun 2026 | A pull request could add a suppression keyed to its own new defect's fingerprint and clear the gate |
| Inert-gate visibility — "enforcement-posture honesty" | v1.1.0, 29 Jun 2026 | A scan recognising zero trust boundaries passed green while checking nothing |
| Zero scanned files is `NOT_EVALUATED` | v1.3.0, 3 Jul 2026 | A configured gate over an empty discovery reported an authoritative `PASSED` over nothing |
| `--fail-on-inert` | current branch | An inert scan becomes an exit code rather than a banner |

Two observations belong in an as-built record rather than a marketing one.

**Three of these were breaking changes accepted deliberately**, on the reasoning that a gate which reports a pass it has not earned is worse than a gate that goes red on upgrade. The migration hint exists because the third predictably turned repositories red with no code change, and the response was to *explain* the redness rather than soften the default.

**This progression is an argument for the parent paper's seventh verification property from the inside.** Every step above was a *false green discovered after shipping*, not designed for in advance — and the designed specification anticipated none of them. It specified determinism, precision floors, and a corpus schema; it did not specify that the gate must be able to say **"I did not look."** That property had to be learned.

## See also

- [Verification Properties]({{< relref "verification" >}}) — the seven properties, and inertness as property 7
- [Residual Risks]({{< relref "residual-risks" >}}#trust-grant-and-suppression-risks) — grant residency, unsigned suppression, judged drift, attestation limits
- [Python Reference]({{< relref "python-reference" >}}#suppression-file-formats) — the three file formats
