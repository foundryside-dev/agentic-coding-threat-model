### 8. Verification properties

The parent paper (*Semantic Defects in AI-Generated Code*, §7.2) sets out seven verification properties against which any semantic enforcement tool proposed for a high-assurance environment should be assessed. They are evaluation criteria, not product features: they define what an independent evaluator can check, not what a vendor should claim.

This section works through all seven against the implementation. Where a property is implemented, it names the machinery. Where it is partly implemented, it says which part. Where it is absent, it says so — because a verification chapter that overstates its own evidence is the one place in a specification where dishonesty is self-defeating.

The chapter's summary:

| # | Property | Status |
|---|---|---|
| 1 | Golden corpus | Implemented — labelled corpus with bidirectional reconciliation |
| 2 | Self-hosting gate | Implemented — gated CI scan, zero committed suppressions |
| 3 | Measured precision | Partly — aggregate FP-rate gate; no per-rule or per-state measurement |
| 4 | Measured recall | **Not implemented** |
| 5 | Deterministic output | Implemented — byte-identity goldens, cross-process and cross-interpreter |
| 6 | Taint propagation correctness | Partly — exercised throughout the corpus; no dedicated propagation suite |
| 7 | Inertness detection | Implemented — see §7.2; the flag is opt-in |

The suite these properties live in is approximately 4,050 test functions across 330 files, with a CI coverage gate of `--cov-fail-under=90`.

One caveat frames everything below. The implementation is about ten weeks old: v0.1.0 shipped on 30 May 2026 and v1.5.0 on 31 July 2026, fourteen releases apart. The verification machinery is correspondingly young — the golden corpus, the byte-identity contract, and the gated self-hosting scan are all more recent than the engine they check. Nothing here should be read as a track record. It should be read as what an evaluator can check today, which is the only claim a verification chapter is entitled to make.

#### 8.1 Property 1 — Golden corpus

The designed specification (archived) devoted several pages to a corpus format: a YAML specimen schema with a dozen fields, a directory layout of rule × taint state, a nominal floor of 126 specimens, mandated adversarial categories, a SHA-256 integrity manifest, separate publication, and a `wardline corpus verify` command. The implementation built something considerably smaller and, in one respect, stronger.

**What exists.** `tests/corpus/` holds Python fixture files and a single ground-truth file, `MANIFEST.yaml`. Each entry is keyed on `(path, rule_id, qualname)` and labelled `TRUE_POSITIVE` (the engine correctly fires) or `FALSE_POSITIVE` (the engine wrongly fires), with a short note recording *why* the specimen is what it is. There are 29 `TRUE_POSITIVE` entries across 14 fixture files and 5 `FALSE_POSITIVE` entries across 4 sentinel files — 34 labelled expectations in total.

The specimens are not textbook examples. Several are explicitly discriminating — chosen so that they vanish if a specific fix regresses. Two entries testing laundering through a shadowed stdlib module carry the note "discriminating: vanishes if the fix regresses"; others pin control-flow joins in `if`/`else`, `try`/`except`, and `match` arms, single- and two-hop variable indirection, f-string interpolation, container aggregation carrying the weakest element, and a boundary that declares `ASSURED` but re-derives raw data in its body.

**The reconciliation property.** This is the part worth leading with, because it is a stronger guarantee than the rate computed on top of it. The corpus is reconciled *bidirectionally* against a real analyser run, and both directions are failures:

- **Unaccounted** — the engine fired an active defect with no manifest entry. This fails the gate. It is how a clean-shape regression surfaces: a rule that starts firing somewhere new cannot slip in unnoticed.
- **Stale** — a manifest entry that no finding matched. This fails the gate. It is how a silently-lost detection surfaces: a rule that stops firing cannot be masked by the aggregate number staying green.

Together they mean the corpus and the engine must agree *exactly*, in both directions, on every fixture. A corpus that only ratchets a rate can drift on both sides at once; this one cannot drift on either.

**Sentinels.** `tests/corpus/sentinels/` holds four clean-shape files the engine must stay silent on: parameterised SQL with the raw value confined to the parameter tuple, a boundary with a genuine raise-on-invalid rejection path, `eval` over a constant-only argument, and `os.system` over a literal command plus a `shlex`-quoted constant through `subprocess.run(shell=True)`. These are exactly the adversarial-false-positive category the designed specification asked for — code that looks like a violation and is not.

The sentinel semantics are deliberate. A silent sentinel is *passing*, not stale, and the reconciler is tested to treat it that way. A fired sentinel is a live false positive counted against the budget. The sentinels deliberately live outside `fixtures/` so that the byte-identity goldens frozen over `fixtures/` keep their substrate undisturbed.

**Non-vacuity guards.** The corpus tests guard against the corpus itself becoming meaningless. `test_corpus_carries_false_positive_sentinels` requires at least three `FALSE_POSITIVE` sentinels, so the false-positive rate is computed over a mixed corpus rather than a vacuous all-true-positive one. `test_fired_sentinel_counts_against_budget` proves the fired-sentinel path end to end by relabelling a known-firing entry in a scratch manifest and asserting the finding is counted as a live false positive rather than reported stale or unaccounted. `test_reconciliation_fp_rate_arithmetic` exercises the rate computation directly on the false-positive path the live corpus never reaches, including the zero-denominator case. The identity goldens carry a matching `test_corpus_surface_non_vacuous`.

**What is absent.** Three things the designed specification required do not exist, and their absence should be stated rather than glossed:

- **No corpus independence machinery.** `MANIFEST.yaml` is a labelled ground-truth file, not a hash manifest — there are no per-specimen SHA-256 digests, no separate versioned publication of the corpus as an artefact obtainable without the tool, and no `wardline corpus verify` command. The corpus is maintained in-tree by the implementer.
- **No CODEOWNERS protection.** The designed specification and the parent paper both place the corpus behind CODEOWNERS-style review, on the reasoning that an agent must not be able to resolve a failing verification run by editing the expectations. There is no `CODEOWNERS` file in the repository. The compensating control is weaker and procedural: the reconciliation invariants make an expectations edit *visible* in the diff as a deliberate act, but nothing structurally requires a second reviewer.
- **No rule × taint-state coverage floor.** The corpus covers many rules well and others not at all; there is no per-cell minimum and no filesystem layout that makes coverage gaps visible, as the designed specification's `corpus/{rule}/{taint_state}/` layout was intended to.

#### 8.2 Property 2 — Self-hosting gate

The CI workflow runs a job named `self-hosting-scan`, dependent on the test job:

```
wardline scan src/ --format sarif --output results.sarif --fail-on ERROR
```

The `--fail-on ERROR` is load-bearing and was added deliberately: the inline comment records that the dogfood scan previously uploaded its SARIF without gating, so a genuinely-introduced `ERROR` trust-boundary finding in the tool's own source would have been "silently uploaded" rather than turning the build red. The SARIF is preserved as an artefact and uploaded to code scanning on pushes to the default branch, through a separate job holding the elevated permissions, so the scanning job itself runs with read-only credentials.

The strongest evidence here is not the job but what it passes with. `git ls-files .weft` returns nothing: **the repository carries no committed baseline and no committed waivers.** The self-hosting scan is green at `--fail-on ERROR` with zero suppressions of any kind. Under the secure gate default (§7.3) a committed baseline would not have cleared the gate anyway, but the point stands independently — there is nothing to clear.

The wider layering discipline belongs to the same property. CI enforces import-linter contracts as a gating step, so the engine and policy tiers cannot import up into orchestration, output, or federation. `mypy` runs in strict mode. `ruff` check and format both gate. A tool that enforces trust-boundary discipline while violating its own layering discipline would have the credibility problem the parent paper's property 2 is about.

#### 8.3 Property 3 — Measured precision

**What exists.** `tests/corpus/test_fp_rate.py` gates the false-positive rate at 5%: false positives divided by total active defects over the corpus, computed from the reconciliation. Two guards keep the number from being trivially satisfiable. The corpus must carry at least 20 active defects, so a single mislabel cannot breach the budget by arithmetic accident. And the mixed-corpus requirement above ensures the denominator and numerator are both real.

The measured rate today is 0%: per the recorded 2026-05-31 taint-combination audit the engine has no live false positive over the corpus, so every sentinel is expected to stay silent. The budget is therefore headroom rather than a measurement of current noise.

**What is absent.** The parent paper asks for precision to be measured, tracked, and published; the designed specification went further and required it per cell, rule by taint state, with an 80% floor applied to each cell individually and the argument that "the averaged number hides the context where trust is being lost." The implementation measures one aggregate number over one corpus. There is no per-rule rate, no per-taint-state rate, no published time series, and no mechanism that demotes a rule whose precision falls in a particular context. The tiering that would make per-cell measurement meaningful exists in the severity model (§6); the measurement over it does not.

There is also a scope limit worth naming, and it is the same one that chapter of the designed specification named: this is *corpus* precision. It measures the engine against 34 curated expectations over 18 files, not against the distribution of code patterns in any real codebase. Operational precision is not measured at all, and the designed specification's proposal to segment operational precision by code origin — agent-generated versus human-written — was never built.

#### 8.4 Property 4 — Measured recall

**Not implemented.** There is no recall measurement in the repository: no known-bad corpus held separately for the purpose of counting misses, no false-negative rate, no floor, and no tracking. A search for the concept across the source tree and the suite returns only per-test commentary about specific gaps that were closed — for example "A is still raw (would still fire) — no false negative introduced" — never a measurement.

This is the largest gap in the chapter and it should not be softened. What the implementation has instead is a set of properties that are *adjacent* to recall without being it:

- The **stale** direction of corpus reconciliation catches a *regression* in recall — a rule that stops firing on a specimen it used to catch fails the gate. That guards against losing detections the corpus already knows about. It says nothing about detections the corpus never knew about, which is what recall measures.
- The discriminating specimens noted in §8.1 are recall guards for specific closed evasions: two laundering shapes that "vanish if the fix regresses" are, in effect, single-specimen recall assertions for those shapes.
- The coverage gate (`--cov-fail-under=90`) measures code coverage, which is not detection coverage and must not be presented as a proxy for it.

The parent paper's justification for the property applies directly to this implementation: a tool with high precision and unmeasured recall may be missing the violations that matter most. The designed specification's proposed floor — 70%, deliberately lower than the precision floor because false negatives are less immediately corrosive to developer trust — remains a reasonable target, and the designed specification's own bootstrapping route to it — synthetic failure injection against the project's own clean code — remains unbuilt. §10.8 records it.

#### 8.5 Property 5 — Deterministic output

Implemented, and to a stronger standard than the property asks for.

**Byte-identity goldens.** `tests/golden/identity/` freezes Wardline's externally-observable identity as a byte-exact corpus: the JSONL finding wire format including fingerprints, rule identifiers, qualnames, location spans, properties, and suppression state; the full span of *every* analysed entity, so the parser's span rendering is frozen even for constructs producing no finding; the Loomweave taint-fact payload; the SARIF output; the `assure` posture; and the `explain` derivation. Engine diagnostics are deliberately excluded, on the reasoning that a different engine may legitimately differ on them and downstream consumers do not key on them. The corpus is the frozen contract that gates a future Rust-core cutover — "parity corpus green" is a hard gate, recorded in an architecture decision record.

The determinism verified before freezing is documented in the corpus README and goes beyond run-to-run stability: in-process stable, path-independent, cross-process under `PYTHONHASHSEED` 0 and 1, and cross-interpreter — frozen on CPython 3.12 and reproduced byte-identically on 3.13. The gate therefore runs on every CI interpreter with no skip. Fixtures deliberately carry no `.weft/` directory or `weft.toml`, because a baseline or waiver would date-poison the corpus through `date.today()`, and `.gitattributes` pins them to LF so content hashes stay reproducible.

**An independent output-boundary guard.** `tests/grammar/test_output_determinism.py` exists because the golden oracle pins one run against a frozen golden and only for stable-maturity findings — it would catch drift, but a non-deterministic preview rule or per-run engine state could slip past it. The guard requires two *independent* analyser runs over the corpus to produce byte-identical full streams, every maturity and every kind, in identical order. Its docstring is explicit about why a single guard at the output boundary is needed: the property is otherwise held by convention across roughly ten engine sites — sorted discovery, Tarjan node and neighbour ordering, commutativity of the least-trusted join over unsorted callee sets.

**Verification-mode SARIF, satisfied by construction.** The designed specification required a verification-mode output profile in which `run.invocations` is omitted or normalised, so that no wall-clock timestamp or process identifier can perturb the bytes. `core/sarif.py` never emits `run.invocations` at all — there is no volatile-metadata mode to switch off. The identity corpus normalises the one remaining mutable field, `driver.version`, and drops `ruleIndex` as recoverable from `ruleId`. SARIF output is version 2.1.0; suppression rides SARIF's native `result.suppressions` channel and the stable fingerprint rides `partialFingerprints`, so the interchange format carries the suppression and identity semantics without needing the designed specification's large bag of custom `wardline.*` properties.

**Determinism in the signed bundle.** The attestation format (§7.6) treats reproducibility as a hard requirement rather than a convenience: every list in the payload is sorted on a stable key so the suite's randomised test ordering cannot perturb the canonical bytes, and the only date-sensitive field is waiver-debt `days_left`. Two builds of the same unchanged tree at the same date produce byte-identical canonical payloads.

That format has also been broken deliberately, which is worth recording as evidence rather than hiding as churn. The bundle schema went from `wardline-attest-1` to `wardline-attest-2` at v1.1.0 as an explicit breaking change — each declared boundary gained a `content_hash`, an entity-body span digest, and v1 bundles no longer verify. At v1.5.0 the v2 payload gained a required `sei_diagnostics` array. An evidence format that changes shape twice in ten weeks is not a stable attestation standard, and a reader planning to retain bundles for long-horizon assurance should know that: verification is bound to a schema that is still moving. The countervailing observation is the one that matters for this chapter — the HMAC binds the envelope schema as well as the payload, precisely so that a relabelled schema cannot verify against the wrong wire contract, and the breaking bumps were taken rather than papered over with permissive parsing.

#### 8.6 Property 6 — Taint propagation correctness

**What exists.** Taint propagation is not tested as a separate concern; it is tested *pervasively*, because most corpus specimens are propagation specimens. The manifest notes read as a propagation suite in disguise: single-hop indirection through a local variable, a two-hop variable chain, control-flow joins across `if`/`else`, `try`/`except`, and `match` arms, list and dict aggregation carrying the weakest element, `str()` and f-string wrapping preserving raw, augmented assignment merging raw in, an aliased `json.loads` returning `GUARDED` below a declared `ASSURED`, a body that re-derives raw data behind an `ASSURED` declaration, and two laundering shapes through shadowed stdlib names. Cross-boundary propagation is covered by the trusted-callee specimen — untrusted data passed to a trusted callee — and by the sink rules, each of which requires taint to reach a sink inside a trusted-tier function.

The entity-span freezing in the identity corpus supports the same property from the other side: the propagation engine's per-entity verdicts are frozen byte-exactly, so a change in how taint resolves for any analysed entity is visible whether or not it produces a finding.

**What is absent.** There is no dedicated taint-flow specimen category with its own minima, as the designed specification specified — no scenario matrix requiring a positive and a negative case for each of direct boundary-to-sink, two-hop indirection, shape-only reaching a semantic sink, container contamination across tiers, and join semantics. Several of those scenarios are covered incidentally; the coverage is not systematic and no test asserts that it is complete. Two of the designed scenarios cannot be tested at all, because the machinery they were written to test is not what the implementation runs. The declared-domain-default marker was never built (§10). And the designed "join of two different-tier values produces `MIXED_RAW`" specimen has nothing to assert, because the shipped combination operator is `least_trusted` — a rank-meet, weakest-link — not the provenance-clash join table. `taint_join` still exists in `core/taints.py` with no call site under the default configuration; it was implemented, measured against real code, and taken off the default path because two clean callees of different families combining to `MIXED_RAW` produced a `PY-WL-101` false positive on correct code. §4.3 sets out the operators, the off-by-default `provenance_clash` key that can still dispatch to the falsified one, and the dated record: the taint-combination audit of 31 May 2026 and the accepted architecture decision record that resolves it.

That falsification is itself a verification result, and the best one in the repository. A designed behaviour was specified precisely enough to implement, implemented, measured against real code, found to be wrong, and withdrawn — with an audit and a decision record as the evidence trail. The corpus manifest still carries the audit's date in its header as the basis for the claim that the engine has no live false positive. Property 6 is therefore satisfied in an unexpected way: the propagation semantics were not merely tested, they were *corrected* by testing.

#### 8.7 Property 7 — Inertness detection

Implemented. The mechanism is described in §7.2: a scan is inert when it recognised zero trust boundaries over at least five analysed functions, derived at no analysis cost from the engine's own run metrics, and `--fail-on-inert` turns that verdict into a non-zero exit. The property that makes it a real control rather than a report is that no suppression channel can clear the trip, and the agent-facing summary says so explicitly.

This is the newest of the seven properties in the parent paper and the only one derived from an incident rather than from first principles. It is also the last step of an enforcement-honesty progression the implementation worked through over ten weeks, in which six distinct ways of reporting an unearned pass were identified — five closed in shipped releases, the sixth being this flag. §7.7 records the sequence and its dates. That progression is the strongest available argument for treating inertness as a first-class verification property: every one of its steps was a false green discovered *after* shipping, and the designed specification anticipated none of them. The parent paper's account (§7.2, and the case study at §8.7) describes an enforcement pipeline that ran one of its lint gates with **zero rules loaded, exiting green, for months** — two successive acceptance rounds signed off against a gate that would have certified any tree. Its formulation of the property is the one to hold onto: the gate must distinguish "checked and clean" from "didn't look", because a green result from an inert gate is worse than no gate at all — it converts the absence of checking into apparent assurance, and every layer of governance above it inherits the false signal.

Two honest limits. First, `--fail-on-inert` defaults to `False`, so the property is available rather than enforced; the parent paper's formulation says an inert scan "must fail", and by default this one does not. Second, inertness is a floor rather than a coverage measure — three boundaries over three thousand functions is not inert, and nothing in the gate remarks on that ratio. `wardline assure` (§7.6) is where coverage is actually reported, and it is not a gate. Both limits are recorded in §9.

#### 8.8 Beyond the seven

Three verification mechanisms in the implementation do not map onto the parent paper's list and are recorded here because an evaluator would want them.

**Waiver discipline as false-positive economics.** `tests/corpus/test_waiver_discipline.py` asserts two invariants over the tool's own repository: every waiver carries a non-empty reason, and the waiver count does not exceed the built-in rule count — the reasoning being that suppression accumulating faster than the rule set that justifies it is a signal about the rules, not about the code. What is genuinely exercised today and what is a tripwire should be distinguished. The reason requirement is exercised at unit level in both directions: a reasonless waiver is rejected, a waiver with a reason is accepted. The count ceiling is currently evaluated against an empty set — the repository has no `waivers.yaml` — so it has never fired and is a tripwire rather than a measurement. The ceiling itself is 26, the size of the built-in Python rule set; an inline comment in the test giving a much smaller figure is stale.

**The frozen identity contract.** The fingerprint is the join key for all three suppression channels (§7.4), which makes finding identity a compatibility surface rather than an implementation detail. It is frozen by architecture decision record and enforced by the byte-identity corpus, with `wardline rekey` as the sanctioned migration path across a deliberate break, and with collision-free-fingerprint and rekey collision- and mutation-pair tests over the corpus. A tool whose suppression records silently orphan on an engine change has no verification story regardless of its rates.

**Live-oracle tests, quarantined.** Judge behaviour against a real model is a weekly scheduled CI job, not a pull-request gate, and it is the only network-dependent surface in the pipeline. This is the correct arrangement for the property it tests — non-determinism confined to a job whose failure cannot block a merge — and it is worth noting that the deterministic parts of the judge, principally the `JudgeContractError` contract of §7.5, are tested without a network.
