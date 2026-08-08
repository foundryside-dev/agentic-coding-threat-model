### 7. Gates, suppression, and the judge

The lattice (§4) assigns trust, the declarations (§5) fix it, the rules (§6) make it checkable. This section is about the last step: turning a stream of findings into a decision a pipeline can act on, and about what may and may not overturn that decision.

The single organising idea is the same one that governs §5. A repository may say a great deal about how it wishes to be assessed — which packs define its trust vocabulary, which findings it considers settled, which judge policy should inform triage. None of that binds the assessment. The caller decides what the repository's own content is allowed to do to the gate. In §5 the mechanism is `--trust-pack` and `--allow-custom-packs`; here it is `--trust-suppressions`, and the default is that repository-resident suppression files have no authority over the gate at all.

#### 7.1 The gate decision

A scan produces a `GateDecision` (`core/run.py`). It is a data object, not an exception: a tripped gate is an ordinary outcome the surfaces render, never an error the tool raises. Both the CLI and the MCP server call the same `gate_decision()` factory over the same `ScanResult`, so the two surfaces cannot drift — the CLI exits on `tripped` and the MCP gate block serialises the identical decision.

The decision carries three fields a consumer reads in order:

| Field | Meaning |
|---|---|
| `verdict` | `NOT_EVALUATED`, `PASSED`, or `FAILED`. |
| `tripped` | Whether any sub-gate fired. `exit_class` mirrors it (0 or 1). |
| `reason` | A human-readable sentence naming the count and class of defects that decided it, and the population it judged. |

`verdict` exists because `tripped: false` is not the same statement as "this tree is clean". A scan invoked with no threshold has not been assessed; a scan over zero discovered files has assessed nothing. Both are `NOT_EVALUATED`. The dataclass makes the dishonest combinations unconstructible: `PASSED` requires a configured gate, `PASSED` over zero scanned files raises, `FAILED` holds if and only if the gate tripped, and every decision must carry a reason. These are `__post_init__` guards rather than conventions, so a second construction site cannot reintroduce a tripped gate that serialises as a pass.

Alongside the verdict, every decision reports `would_trip_at` — the highest severity at which the gate *would* have tripped on the population it saw, computed in every branch including the no-threshold one. A first bare `wardline scan` therefore cannot read as a green light: it says it did not evaluate, and it names the worst thing it found.

Three independent sub-gates compose into the single `tripped` flag, and the decision decomposes it so a consumer can attribute a trip without parsing prose (`severity_tripped`, `unanalyzed_tripped`, `inert_tripped`).

**The severity gate — `--fail-on`.** Takes a threshold from `CRITICAL`, `ERROR`, `WARN`, `INFO`; there is no default, so enforcement is an explicit act. It trips when any active finding of kind `defect` carries a severity at or above the threshold. Severity `NONE` — the engine's own facts, metrics, and classifications — is absent from the ordering and can never gate (§6). Rule maturity does not affect gating: a `preview` rule gates exactly like a `stable` one, and is baselineable on the same terms. That was corrected in v1.2, when it was found that the gate had been ignoring any rule of `preview` maturity — a scan could pass green with an active `ERROR` defect present. Maturity is now purely informational, and `UPGRADING.md` records that there is no configuration flag to restore the old behaviour.

**The unanalysed gate — `--fail-on-unanalyzed`.** Trips when any file was discovered but never analysed despite being analysable: a parse error, a recursion-depth skip, a missing source root. Benign no-module skips are excluded. Default `False`. Note the asymmetry the implementation already builds in: parse errors and file failures are themselves gate-eligible `ERROR` defects, on the fail-closed principle that unscanned code must not read green, so part of this territory is covered by `--fail-on` alone.

**The inertness gate — `--fail-on-inert`.** Trips when the scan recognised *zero* trust boundaries over a non-trivial amount of code. Default `False`.

#### 7.2 Inertness

Inertness detection answers the failure mode that the opt-in posture creates. Wardline fires only where untrusted data violates a *declared* trust tier, so a codebase with no recognised boundaries produces no defects no matter what it does, and `wardline scan . --fail-on ERROR` over it passes green while checking nothing. The module docstring in `core/resolution_posture.py` states the problem in those terms and adds the detail that makes it dangerous: before this existed, the only hint was `INFO`-severity `WLN-L3-LOW-RESOLUTION` noise — "exactly the severity an agent filters out."

The mechanism is deliberately cheap. It reads no new analysis; it folds the `WLN-ENGINE-METRICS` finding the engine already emits. That finding carries a per-function provenance histogram whose total is the number of functions analysed and whose `anchored` and `config` buckets count functions seeded from a recognised boundary or a configured source. A scan is inert when the recognised-boundary count is zero and at least five functions were analysed. The five-function floor exempts a single crafted temporary file — an exploration is not a gate. `low_resolution_ratio` is reported alongside as a secondary health number and deliberately does not drive the verdict, because a framework-heavy application legitimately resolves few of its library calls.

The property that makes the trip meaningful is that nothing can clear it. `core/agent_summary.py` says so to the agent in as many words: the gate failed because the scan is inert, and "suppressions cannot clear this trip." An inert trip means the gate had nothing to enforce; a suppression store is a statement about findings, and there are none. The only resolutions are to declare boundaries, bind a trust vocabulary with a pack (§5), or drop the flag.

The detection arrived before the gate. Inertness *visibility* shipped in v1.1.0: scan output has carried a `resolution.inert` posture field since then, and an armed `--fail-on` gate that passes while recognising zero boundaries prints a stderr banner, calibrated to stay silent on bare or advisory scans and on legitimately boundary-free pure-logic code. Turning that verdict into an exit code is the newer step.

!!! note "Release status"
    `--fail-on-inert` is present on the `release/1.5.0` branch and does not appear in the CHANGELOG. It should be read as current-branch behaviour, not as shipped in v1.5.0 — unlike the inert posture field and banner, which are released. Its sibling `--fail-on-unanalyzed` is also released. Both flags default to `False`, so the compensating control for the opt-in posture exists but is not on by default — recorded as a residual risk in §9.

This is the parent paper's seventh verification property, implemented (*Semantic Defects in AI-Generated Code*, §7.2). §8 treats it as such.

#### 7.3 What the gate judges

This is the part of §7 most likely to be misread, so it is stated flatly before anything else in it.

**By default, repository-resident suppression files annotate findings but cannot clear the gate.**

`run_scan` takes `trust_suppressions`, defaulting to `False`, and the CLI flag is `--trust-suppressions`. When it is off — the default — the scan builds two populations from one analysis. The *emitted* findings have baseline, waiver, and judged records applied, so every finding carries an accurate suppression state and its reason: this is what a developer reads, what a report shows, and what the counts in the summary line partition. The *gate* population is built by the same structural path with zero suppression applied, and that is what `--fail-on` evaluates.

The threat this closes is explicit in the changelog that introduced it. Baseline, waivers, and judged records are all committed repository content, so a malicious pull request could add an entry keyed to the fingerprint of its own new defect and clear the gate. Under the secure default it cannot: the entry is honoured in the display, ignored in the decision.

Two escapes exist, and the difference between them is the whole point.

- **`--trust-suppressions`** hands authority back to the repository's files. It is an explicit operator trust decision, appropriate for a trusted local checkout and for the judge workflow's own internals, and never appropriate for enforcement over untrusted pull-request content.
- **`--new-since <ref>`** is the CI ratchet. It scopes both the emitted findings and the gate to what is new since an operator-supplied reference. The reference comes from the pipeline, not from the tree, which is what makes it unforgeable in a way a committed file is not.

The gate's own `reason` string is written to make the situation legible rather than mysterious. When suppressed findings are what drove the trip, it says so and names the escape: `N suppressed ERROR+ defect(s) (baseline/waiver/judged) not cleared; pass --trust-suppressions (trusted checkout) or --new-since <ref> (PR)`. Because the escape guidance is generated from the actual gate population rather than from the display set, a delta scan cannot misreport a repository-suppressed defect as active and swallow the guidance.

There is even a migration signal. `baseline_migration_hint` fires in exactly one situation — a committed baseline exists, the gate tripped, the trip is driven *solely* by baselined defects re-entering the unsuppressed population, and neither escape was passed — and prints a one-line explanation of why the repository went red with no code change. A genuine active trip, a waiver-only trip, or a trusted run all return `None`, so the hint cannot become background noise. The secure default and its hint shipped in v1.0.1 (`UPGRADING.md` records the breaking change).

The gate is also robust to scoping, in three separate ways. `--fail-on` cannot be armed in `--affected` mode at all: composing them is a hard error and exit 2, on the reasoning that an advisory delta analysing part of the tree cannot certify a green gate. The population that the verdict and the opt-in sub-gates do evaluate is never narrowed by the scope filter — the emitted findings are narrowed to the affected entities, but a producer-supplied scope cannot hide a co-located finding from the gate. And a clean delta subset is reported as `NOT_EVALUATED`, not `PASSED`, because analysing 40 of 900 files does not certify the other 860. An empty or wholly unresolvable scope falls back to a full scan.

Read together with §5, the pattern is one mechanism applied twice. A repository declares its trust vocabulary; the caller grants it. A repository records its settled findings; the caller grants them. In neither case is the repository's own content the authority on its own assessment.

#### 7.4 Three suppression channels

There are three stores, all under `.weft/wardline/`, all keyed on a finding's fingerprint, and all resolved by a single join predicate in `core/finding_identity.py` with the precedence **waiver > judged > baseline**. An active waiver — explicit human intent, carrying an expiry — beats a judge's `FALSE_POSITIVE` verdict, which beats a silent baseline match. Factoring the join into one predicate means the suppression layer asks a question rather than re-implementing precedence at each call site.

Each channel resolves a finding's *suppression state* on the emitted stream. Whether that state also clears the gate is decided entirely by §7.3.

| Channel | File | Written by | Carries |
|---|---|---|---|
| Baseline | `baseline.yaml` | `wardline baseline create` / `update` | Fingerprint, plus rule, path, and message for git-diff legibility. Only the fingerprint is loaded into the match set. No reason, no expiry. |
| Waiver | `waivers.yaml` | the `waiver_add` MCP tool | Fingerprint, **mandatory** reason, optional ISO `expires`, optional SEI entity identity. |
| Judged | `judged.yaml` | `wardline judge --write` | Fingerprint, rule, path, message, model rationale, `model_id`, transport, confidence, `recorded_at`, `policy_hash`. |

**Baseline** is the accept-the-past channel: a snapshot of what the tree currently produces, so that enforcement can begin at the current line without a remediation project first. It is deliberately the weakest record. The committed file carries each entry's rule, path, and message so that a human can read the file in a git diff, but only the fingerprint is loaded into the match set, and no rationale is captured — a baseline match is a silent membership test. That is why it sits lowest in the precedence order.

**Waivers** are the deliberate-exception channel. They are fingerprint-keyed machine-written state — there is no waiver CLI command; the writing path is the `waiver_add` MCP tool over the core `add_waiver` function, which is why the store lives in wardline's own state directory rather than in the operator-authored `weft.toml`. The reason field is not advisory: `parse_waivers` raises `ConfigError` on a missing or blank reason, and it does so both on load and *before* any write, so a reasonless waiver cannot be created and cannot be honoured if hand-inserted. Expiry is optional but real: a waiver is active through its expiry day and stops suppressing strictly after it, so the finding resurfaces rather than being permanently forgotten. The optional `entity_sei` binds the waiver to a rename-surviving identity for the code entity it covers, so a suppression survives a move; it is carried verbatim and never parsed. A malformed entry anywhere in the store is a hard load error — the design rule being that a finding must never be silently suppressed by a bad record. (One caveat for a reader checking this against the source: `judged.py`'s docstring draws a contrast with "hand-authored waivers", which is stale. `waivers.py` is the authority on its own store and states the opposite — waivers are "fingerprint-keyed entries an operator never hand-authors", written through the MCP tool, which is why they live in wardline's state directory rather than in operator configuration.)

**Judged** records are the machine-triage channel, described in §7.5. Two integrity properties are worth stating here. A judged record suppresses only as a `FALSE_POSITIVE` verdict: the field is required and any other value is rejected on load, so a hand-edited `TRUE_POSITIVE` cannot be smuggled in as a silent suppression. And the provenance fields — `model_id`, `judge_transport`, `policy_hash`, `confidence`, `rationale` — are all required, never defaulted, on the stated grounds that a judged record with no attributable model, policy, or confidence is an unauditable suppression.

##### The "No governance" position

The module docstrings of all three stores — `baseline.py`, `waivers.py`, and `judged.py` — carry the same two-word verdict: **"No governance."**

That is a design position, not an oversight, and it is worth naming precisely. There is no owner field, no approver, no reviewer identity, no temporal separation between author and approver, no signature on either file, and no exceptionability classes determining which findings may be suppressed at all. The designed specification (archived) proposed all of it — a governed exception register with reviewer identity, temporal separation, four exceptionability classes and an eight-by-eight severity/exceptionability matrix. None of it was built (§10).

The position is defensible because the implementation answers the same threat by a different route, and it is worth being clear about which control does the work.

1. **The primary control is mechanical: the files have no authority over the gate.** An ungoverned suppression store that cannot clear a gate is a very different object from one that can. Governance apparatus on these files would be protecting an authority the files do not, by default, hold. This is the point at which the "No governance" position stops being a gap and starts being a consequence: authority was moved to the caller instead of being administered inside the repository.
2. **Provenance is required where it is available.** A waiver must carry a reason; a judged record must carry its model, transport, policy hash, confidence, and the model's verbatim rationale, which `judged.py` calls "the audit primitive." Neither file records *who*, but both record *why*.
3. **Debt is surfaced rather than dropped.** The `assure` posture carries a `waiver_debt` entry per configured waiver with `days_left`, which may be negative for a lapsed waiver — "surfaced honestly, never dropped, so accepted debt that has lapsed its acceptance window stays visible." That debt sits inside the signed attestation payload (§7.6).
4. **A test constrains accumulation.** `tests/corpus/test_waiver_discipline.py` asserts that every waiver in the tool's own repository carries a reason and that the waiver count does not exceed the built-in rule count — a false-positive-economics tripwire, on the reasoning that suppression outgrowing the rule set that justifies it is a signal about the rules. §8 records what that test does and does not currently exercise.

What remains genuinely absent is accountability for the decision. Nothing in the implementation records that a named person accepted a risk, nothing prevents the same actor from raising and approving a suppression, and nothing signs either file. In a setting that requires an attributable acceptance record, that record must live outside the tool — in the review that admits the commit which adds the entry. §9 records this as a residual risk.

#### 7.5 The judge

`wardline judge` submits one active `defect` finding, with a code excerpt, to a language model and asks for a single label: `TRUE_POSITIVE` or `FALSE_POSITIVE`. It is triage, not analysis — the judge never produces findings, only verdicts about findings the engine already produced.

The judge is not a later addition. It shipped in v0.1.0 on 30 May 2026, in the first release, alongside the taint engine, decorator-based trust markers, four rules, and baselines and waivers with expiry — described there in the same terms it holds today: an opt-in layer that "reads each active finding cold and labels it true/false positive with a rationale", over a dependency-free stdlib transport. The design position that a model may adjudicate findings but never generate them, and that its rationale is the record, is original to the implementation rather than something it grew into. What grew was the surrounding rigour: the Codex transport, the sealed execution environment, the required provenance fields, and the caller-granted trust over judge policy and configuration.

!!! note "Release status"
    The Codex transport, the `AUTO` / `CODEX_CLI` / `OPENROUTER` selector, and version-2 judged records carrying `judge_transport` are all `[Unreleased]` on the current `release/1.5.0` branch. Released code writes version-1 judged records, whose provenance is OpenRouter. Read the transport material below as current-branch behaviour; the fail-loud contract, the opt-in write, and the caller-granted judge trust are released.

**Transports.** `AUTO`, `CODEX_CLI`, `OPENROUTER`. The OpenRouter path is a stdlib `urllib` POST, keeping the base package dependency-free. The Codex path runs the model as a sealed subprocess: a bounded execution environment with no ambient state roots, a bounded process runner with output byte limits, and a small read-only tool surface (`read_file`, `grep_files`, `glob_files`) capped at `max_calls = 24` per judgement. The judge may read the repository to reach its verdict; it cannot write to it.

**Fail-loud contract.** Malformed model output raises `JudgeContractError` and the run crashes. This is the single most consequential design decision in the module, and it is applied with unusual thoroughness — non-UTF-8 output, output over the byte limit, duplicate JSON object keys, non-finite JSON numbers, a malformed JSONL event, an error or failed event, a missing final agent message, more or fewer than exactly one `turn.completed` event: each is a contract error rather than a value to coerce. The rationale is stated in the module docstring: the model's verbatim rationale is the audit primitive, and a malformed response "crashes rather than being coerced." A judge that quietly recovers from a broken response is a judge whose suppressions cannot be trusted, because the recovery path is precisely where an unaudited default would be invented.

**Writing is opt-in.** `--write` is a flag; the default is a dry run that reports verdicts and persists nothing. `FALSE_POSITIVE` verdicts appended to `judged.yaml` are the only judge output with any persistence.

**Caller-granted trust extends to the judge.** A repository may supply a judge policy file and judge configuration in `weft.toml`, and neither takes effect unless the caller grants it: `--trust-judge-policy` admits the project's policy file as untrusted judge context, and `--trust-judge-config` permits project configuration to select the transport, models, excerpt size, finding cap, and write-confidence floor. Without those grants a repository cannot influence how it is judged — the same mechanism as §5, applied to the triage surface.

##### The asymmetry

**The judge is never invoked automatically.** `core/run.py` — the module both the CLI and the MCP server call to scan — does not import `core.judge`. It imports `core.judged`, the record store. No scan can reach a model. That separation is structural rather than conventional: a scan is a pure function of disk and configuration, and its network-touching relatives (Loomweave SEI enrichment, Filigree emission, the judge) are all injected or invoked by the caller.

**Judged records, however, are applied automatically and forever.** `run_scan` calls `load_judged` on every scan that applies suppression at all. A finding a model labelled a false positive once carries that label on every subsequent scan, with no expiry field and no re-judgement trigger. Waivers are the only channel with an expiry mechanism, so unlike a waived finding a judged one never resurfaces of its own accord.

Name the shape plainly: **judging is manual and opt-in; its consequences are automatic and persistent.** A single interactive decision, made by a model, becomes standing policy for the repository.

Two things bound the asymmetry, and neither dissolves it. First, the bound from §7.3: under the default, a judged record is applied to the annotated stream, not to the gate — its standing effect is on what a developer sees, and it becomes an effect on enforcement only under `--trust-suppressions` or inside a `--new-since` scope. Second, the provenance requirements make the standing decision inspectable: every judged entry names the model, the transport, the policy hash, the confidence, and the rationale, so a reviewer can read *what was decided and on what basis* even years later. What is not bounded is drift. The engine changes; the rules change; the policy hash is recorded but nothing acts on a mismatch. A judged record minted against one version of a rule continues to suppress that fingerprint under later versions. §9 records this.

#### 7.6 Attest, assure, and rekey

Three commands sit above the gate and answer questions a pass/fail decision cannot.

**`wardline assure`** reports trust-surface *coverage* rather than defect count. Its framing question is the prior one a fail-closed tool must own: how much of the declared trust surface did the engine reach a definite verdict on, and how much is honestly unknown? The denominator is the anchored — trust-declared — entities only, because undecorated code is the developer-freedom zone and never counts. Coverage means "verdict reached either way", so a defect is *covered*: the engine reached a definite negative verdict. The honesty gap is the `unknown` set: entities whose trust could not be proven, because there is no computed return taint, because the tier is undeclared or `UNKNOWN_*`, or because the engine under-scanned. Files discovered but never analysed each count as at least one uncovered surface item, since the declarations inside them are unknown. Per-entity verdicts are delegated wholesale to `classify_entity_trust`, the single source of truth, so an `assure` rollup and a `dossier` trust section cannot disagree.

**`wardline attest`** builds and signs a reproducible posture bundle: the `assure` posture including its waiver debt, the declared boundaries, the ruleset hash, the git commit and dirty flag. The CLI is fail-closed on a dirty tree unless `--allow-dirty` is passed, so a bundle's commit truthfully pins its source. Determinism is a hard requirement of the format: every list in the payload is sorted on a stable key so the test suite's randomised ordering cannot perturb the bytes, and the only date-sensitive field is the waiver debt's `days_left` — a waiver-free tree's payload is fully date-independent. The HMAC binds the outer envelope schema as well as the payload, so a future schema relabel cannot verify against the wrong wire contract.

The signature is where the honesty matters, and the module states it before anything else:

> The signature is **HMAC-SHA256 with a SHARED PROJECT KEY**. That makes it *tamper-evidence within a key-holding trust domain* … NOT public, asymmetric, non-repudiable proof.

Verification requires possessing the same secret used to sign. Anyone holding the project key can both produce and verify a bundle, so the bundle does not bind itself to a specific signer — it establishes that the content has not changed since signing, and nothing about who signed it. Asymmetric signing would prove authorship without sharing a secret, but it requires a non-stdlib dependency, which the zero-dependency base forbids. The docstring's own summary is the one to carry forward: **HMAC is forced, not chosen.** A bundle MUST NOT be presented as cryptographic proof of *who* produced it. §9 records the limit; §10.8 records asymmetric signing as designed-not-built.

**`wardline rekey`** exists because fingerprints are the join key for all three stores, so changing how a fingerprint is computed orphans every suppression in the repository. Rekey computes both the old and the new fingerprint for every finding from a single scan and produces the remap that re-keys the stores, carrying baseline, waiver, and judged verdicts across the migration. It never touches the production hash, the analyser, or the rules. It is included here because it is the operational consequence of fingerprint-keyed suppression: the identity scheme is a frozen contract (§8), and a tool for moving verdicts across a deliberate break is what makes freezing it survivable.

#### 7.7 How the gate learned to be honest

Almost nothing in this section was in the first release. The gate machinery described above — the explicit verdict, the two populations, the sub-gate decomposition, the inertness trip — accumulated over about ten weeks, and it accumulated in one direction. Each step closed a way for the tool to report a pass it had not earned. The sequence is worth recording because it is the clearest evidence in the implementation that *enforcement honesty* is a distinct engineering concern from detection quality, and one that only becomes visible under real use.

| Step | Shipped | What it closed |
|---|---|---|
| Explicit gate verdict — "no vacuous green" | v1.0.1, 17 Jun 2026 | A bare scan with no `--fail-on` exited 0 and read as a pass. `GateDecision` gained `verdict` and `would_trip_at`, so an unevaluated scan says so and names the worst thing it found. |
| Parse failures become gate-eligible (breaking) | v1.0.1, 17 Jun 2026 | A file that could not be read or parsed was a silent skip. `WLN-ENGINE-PARSE-ERROR` became an `ERROR` defect — unscanned code must not read green. Later generalised as `--fail-on-unanalyzed`. |
| The gate stops honouring committed suppressions (breaking) | v1.0.1, 17 Jun 2026 | A pull request could add a suppression keyed to its own new defect's fingerprint and clear the gate (§7.3). |
| Inert-gate visibility — "enforcement-posture honesty" | v1.1.0, 29 Jun 2026 | A scan recognising zero trust boundaries passed green while checking nothing. The `resolution.inert` posture field and the stderr banner made it visible. |
| Zero scanned files is `NOT_EVALUATED` | v1.3.0, 3 Jul 2026 | A configured gate over an empty discovery — a mis-pointed source root, an exclude-all config — reported an authoritative `PASSED` over nothing. (v1.5.0 added a regression pin for it, without behaviour change.) |
| `--fail-on-inert` | current branch | An inert scan becomes an exit code rather than a banner. |

Two observations follow, and both belong in an as-built document rather than a marketing one.

The first is that three of these were **breaking changes accepted deliberately**, on the reasoning that a gate which reports a pass it has not earned is worse than a gate that goes red on upgrade. The migration hint of §7.3 exists because the third one predictably turned repositories red with no code change, and the response was to explain the redness rather than to soften the default.

The second is that this progression is an argument for the parent paper's seventh verification property from the inside. Every step above was a *false-green* discovered after shipping, not designed for in advance — and the designed specification (archived), for all its length, anticipated none of them. It specified determinism, precision floors, and a corpus schema; it did not specify that the gate must be able to say "I did not look." That property had to be learned. §8.7 treats it as the property it became.
