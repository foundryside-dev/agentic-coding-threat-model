### 6. Rules and severity

The implementation ships **26 Python policy rules** (`PY-WL-101` … `PY-WL-126`) and **2 Rust preview rules** (`RS-WL-108`, `RS-WL-112`) — twenty-eight in total — plus a small set of engine-emitted `WLN-ENGINE-*` findings that report on the scan itself rather than on the code. Each Python rule is one module under `src/wardline/scanner/rules/`, carrying a `RuleMetadata` descriptor with its identifier, base severity, kind, one-line description, and worked violating and clean examples.

The designed specification (archived) defined eight abstract pattern rules, `WL-001` … `WL-008`. Three survive in recognisable form: WL-003 (catching all exceptions broadly) as `PY-WL-103`, WL-004 (catching exceptions silently) as `PY-WL-104`, and WL-007 (boundary with no rejection path) as `PY-WL-102` and `PY-WL-119`. The other five — including WL-001, the parent paper's flagship member-access-with-fallback-default — were never built (§10). What arrived instead was something the designed specification never contemplated: roughly half the catalogue is classic sink analysis — command execution, deserialisation, SQL, SSRF, XXE, template injection — the kind of coverage a general-purpose SAST product provides. That half exists because the taint machinery built to answer the trust-declaration question turned out to answer the sink question for free, and it would have been perverse not to use it.

The catalogue grew rather than being designed. Version 0.1.0, released 30 May 2026, shipped four rules — `PY-WL-101` through `PY-WL-104`, precisely the trust-declaration and exception-flow core. The remaining twenty-two Python rules and both Rust rules arrived over roughly ten weeks to v1.5.0, and the six most recent (`PY-WL-121`–`126`) shipped as `preview`. Reading the catalogue as a designed whole would therefore misread it: the boundary family is the original thesis, and the sink family is what the engine turned out to be capable of once it existed.

#### 6.1 Scope: what the analysis is, and what it is not

The project's own roadmap states the boundary in one sentence, and it is the honest one:

> Wardline is deliberately **L1–L2 with an L3 project fixed point**, not an exhaustive path-sensitive whole-program prover, and Python-first (with a Rust preview, `wardline scan --lang rust`). We favor a small, precise, opt-in rule set over broad SAST coverage.

The three levels are not marketing tiers; they name three real stages in `src/wardline/scanner/taint/`:

- **L1 — function level** (`function_level.py`). For each discovered function, ask the taint-source provider for a declared taint; when the provider has no opinion, fall back to `UNKNOWN_RAW`. The module's docstring states the entire precedence: `provider > UNKNOWN_RAW`. That fail-closed fallback is what puts undeclared code in the freedom zone (§3).
- **L2 — variable level** (`variable_level.py`). Walk a function body tracking taint per variable through assignments, control-flow joins, and call sites. Both value combiners (`BinOp`, `IfExp`, `BoolOp`, containers, `.get` defaults, `+=`, container writes) and control-flow merges (if/else, loop back-edges, match arms, except handlers) use the rank-meet `least_trusted` — the weakest branch wins. An unknown non-call expression inherits the function's L1 taint; an unresolved bare-name call propagates the worst of the caller seed and its argument taints, so a trusted seed cannot launder a raw argument through an unmodelled callee.
- **L3 — project fixed point** (`project_resolver.py`, `callgraph.py`). Assemble per-module data into an inter-module call graph and run a strongly-connected-component fixed-point kernel over it. Call resolution covers local bare names, imported aliases, `self`/`cls` method calls, same-project classmethod calls through a class object, and variable-typed dispatch through a flow-sensitive reaching-definitions pass; everything else counts as unresolved and raises the caller's pessimistic floor.

Supporting machinery: `stdlib_taint.yaml` is a curated, versioned, auditable table of the taint carried by common stdlib call returns, applied at call resolution rather than at L1 seeding, so that unresolved cross-module calls do not inflate `UNKNOWN_RAW` rates. `fastapi_sources.py` and `pydantic_discovery.py` recognise framework-specific entry points and models. `summary_cache.py` memoises the per-module taint contract; the resolver always recomputes edges and call counts fresh, so a warm run is byte-identical to a cold run. `reverse_edge_index.py` inverts the call graph at module granularity for incremental dirty-set propagation.

Two properties of that cache are worth naming because they are of a piece with §5. It carries **no repository governance** — the docstring records that the designed CI-attestation path was discarded outright. And disk cache files are integrity-checked with an operator-held HMAC key before they can rehydrate summaries, "so repository-controlled JSON cannot become analyzer truth." Caller-granted trust again, one layer down.

Star imports are not yet materialised for edge resolution. This is a known gap, tracked, and it means a trust marker reached only through `from x import *` can be missed.

#### 6.2 Severity is a product, not a table

Every rule declares a `base_severity`. What a finding actually carries is that base modulated by the resolved taint tier of the function it fires in. `rules/severity_model.py` implements this in about ten lines — the designed specification's eighty-cell rule × taint matrix, compressed:

| Resolved tier of the enclosing function | Effect on base severity |
|---|---|
| `INTEGRAL`, `ASSURED` | base severity, unchanged |
| `GUARDED`, `UNKNOWN_ASSURED`, `UNKNOWN_GUARDED` | one step down (`CRITICAL`→`ERROR`→`WARN`→`INFO`), with `INFO` as the floor |
| `EXTERNAL_RAW`, `UNKNOWN_RAW`, `MIXED_RAW` | `NONE` — suppressed |

The severity ladder is `INFO < WARN < ERROR < CRITICAL`, plus a non-gating `NONE` used for engine facts and for suppressed modulation results.

`MIXED_RAW` appears in the third row for completeness only. §4.3–§4.4 is this document's authority on taint combination and states the position: the live pipeline combines with the rank-meet `least_trusted` by default, and the states producible under that default are `INTEGRAL`, `ASSURED`, `GUARDED`, `EXTERNAL_RAW`, and `UNKNOWN_RAW`. `MIXED_RAW` is carried but not produced under the default configuration. One configuration key qualifies that — `provenance_clash`, default `false` — and §4.3 sets out what it does and why it is off; Part II-A §A.3 records the key itself. Because the state sits in the freedom zone either way, nothing in this section's severity arithmetic depends on the setting.

The third row is the mechanism behind the whole opt-in posture. Undecorated code resolves to `UNKNOWN_RAW`, lands in the freedom zone, and is suppressed to `NONE` — which is what lets wardline scan its own source cleanly in its own CI (§8) and what lets a team adopt it without a suppression bankruptcy on day one (§3).

The claim is **total**, not confined to the trust-declaration rules. The shared sink machinery in `rules/_sink_helpers.py` calls `modulate` twice — once to skip an entity outright when the modulated severity would be `NONE` for every base, and again per resolved sink call — and its docstring names the path in so many words: "the developer-freedom zone (undecorated → `UNKNOWN_RAW` → `modulate` → `NONE`)". So the fourteen sink rules of §6.4, which look like ordinary SAST checks and would fire everywhere in a conventional scanner, are silent in undeclared code for exactly the same reason the boundary rules are. "Silent until you opt in" covers the whole catalogue.

Two consequences are checkable and worth stating.

**No rule ships at `CRITICAL`.** Fourteen rules carry base `ERROR`, eleven carry `WARN`, one (`PY-WL-125`) carries `INFO`. `CRITICAL` is reachable only through a `rules.severity` override in `weft.toml` — that is, only when an operator deliberately promotes a rule.

**A rule's severity in a report is not its severity in this catalogue.** The tables below give base severities. A `WARN` rule firing inside a `GUARDED` function reports at `INFO`; the same rule firing inside an undecorated function does not report at all.

#### 6.3 Family one — boundary, declaration, and exception discipline (12 rules)

These are the rules that exist because someone made a trust declaration. They have no counterpart in a general-purpose scanner, because a general-purpose scanner has nothing to check the declaration against. This is the family the designed specification was actually about.

| ID | Base | Maturity | What it detects |
|---|---|---|---|
| `PY-WL-101` | ERROR | stable | A trust-anchored function returns data less trusted than the level it declares — untrusted data reaches a trusted producer with no validation. |
| `PY-WL-102` | ERROR | stable | A trust boundary (a function that raises declared trust on its return) has no rejection path — no `raise`, no falsy-constant return — so it cannot validate. |
| `PY-WL-103` | WARN | stable | A broad exception handler (bare `except` / `Exception` / `BaseException`) in a trusted-tier function. |
| `PY-WL-104` | WARN | stable | An exception handler that silently swallows the error — body is only `pass`/`...`/`continue`/`break` or a bare constant expression. |
| `PY-WL-105` | ERROR | stable | Untrusted data is passed as an argument to a trusted producer at a call site (CWE-501). |
| `PY-WL-109` | WARN | stable | A trusted producer has both a value-bearing return and a `None`-yielding return — `None` leaks from a function declaring trusted output (CWE-394). |
| `PY-WL-110` | WARN | stable | An entity carries two or more distinct trust markers (e.g. `@trusted` + `@external_boundary`) — a contradictory declaration the engine resolves silently. |
| `PY-WL-111` | ERROR | stable | A trust boundary's only rejection path is `assert`, which `python -O` strips — the validation silently vanishes in production (CWE-617). |
| `PY-WL-113` | ERROR | stable | A trust boundary fails open — an exception handler swallows the failure and returns a substitute value instead of re-raising, so the boundary can be bypassed by triggering the exception (CWE-636). |
| `PY-WL-114` | ERROR | stable | A builtin trust decorator (`@trusted` or `@trust_boundary`) has a level argument that is statically readable but invalid or out of range. |
| `PY-WL-119` | ERROR | preview | No-op validator boundary where the return is equivalent to the input. |
| `PY-WL-120` | ERROR | preview | Stored or persisted taint reaches trusted state without validation. |

`PY-WL-101` is the flagship, and the README's worked example is exactly it: a function decorated `@trusted(level="ASSURED")` that returns the output of an `@external_boundary` function without validation. The finding names both halves of the contradiction — the declared level and the actual one — which is why it can be explained to a code author in one sentence.

`PY-WL-111` and `PY-WL-113` are the two rules that catch a boundary which *looks* like it validates. Both are cases where the rejection path exists in the source and does not exist in the deployed behaviour: stripped by `python -O`, or swallowed by the handler wrapped around it. `PY-WL-111` is careful about the claim it makes — it fires only when `assert` is the *sole* rejection path, because a `raise` alongside it survives `-O` and the CWE-617 claim would then be factually false. Credit where it is due: the archived WL-007 commentary had both of these. It excluded assertions from its list of rejection paths on exactly the `-O` reasoning that `PY-WL-111` now encodes, and it called for a separate advisory finding where a boundary contains no success path — the shape `PY-WL-119` sits next to. The rules were built from the code rather than from the archive, and arrived at the same two places.

`PY-WL-114` is the rule that keeps §5's decorator contract honest at analysis time. Its own violating examples include an *aliased* import (`from wardline.decorators import trusted as t`, then `@t(level='ASURED')`), because the alias resolves to the builtin and a typo there would otherwise silently disable the gate. Its clean examples include a decorator that merely happens to be spelled `trusted` but is not the builtin marker — a foreign decorator with an invalid level is not this rule's business.

#### 6.4 Family two — sink rules (14 rules)

These fire when untrusted data reaches a dangerous operation inside a trusted-tier function. Every one of them is tier-modulated in exactly the way §6.2 describes, which is what distinguishes them from the equivalent rules in a general-purpose scanner: they are silent unless somebody has declared that the surrounding function is trusted.

| ID | Base | Maturity | Sink family |
|---|---|---|---|
| `PY-WL-106` | WARN | stable | Deserialisation — `pickle`/`Unpickler`/`marshal`/`yaml.load`/`shelve`, plus a curated third-party table (`dill`, `jsonpickle`, `joblib`, `torch.load`, `numpy.load(allow_pickle=True)`) (CWE-502). |
| `PY-WL-107` | WARN | stable | Dynamic code execution — `eval`/`exec`/`compile` (CWE-95). |
| `PY-WL-108` | ERROR | stable | Command/program execution — `os.system`/`os.popen`/`subprocess.getoutput`, `os.exec*`/`os.spawn*`/`os.posix_spawn`/`pty.spawn` (CWE-78). |
| `PY-WL-112` | ERROR | stable | A subprocess call with a literal `shell=True` — conditionally-shell OS command injection (CWE-78). |
| `PY-WL-115` | WARN | stable | Dynamic code/module load — `importlib.import_module`, `__import__`, `runpy.run_path`, `runpy.run_module`, `importlib.util.spec_from_file_location` (CWE-829 / CWE-94). |
| `PY-WL-116` | WARN | preview | Path/filesystem traversal — `open`/`os.path.join`/`pathlib.Path`, filesystem mutation via `os.remove`/`os.rename`/`shutil.*`, methods on a tainted `pathlib.Path`, and `tarfile`/`zipfile` extraction (Zip Slip) (CWE-22). |
| `PY-WL-117` | WARN | preview | The URL slot of an HTTP client sink — `requests`/`httpx`/`aiohttp`/`urllib`, module-level calls, constructed client/session methods, and client `base_url=` (SSRF, CWE-918). |
| `PY-WL-118` | ERROR | preview | SQL/database execution — `execute`/`executemany`/`executescript` (CWE-89). |
| `PY-WL-121` | ERROR | preview | XML parsing — XXE and billion-laughs (CWE-611). |
| `PY-WL-122` | ERROR | preview | Server-side template compilation — `jinja2.Template`/`Environment.from_string`, mako `Template` (SSTI, CWE-1336). |
| `PY-WL-123` | WARN | preview | Untrusted data used as the attribute *name* in `setattr`/`getattr` — dynamic attribute injection / mass assignment (CWE-915). |
| `PY-WL-124` | ERROR | preview | Native-library load — `ctypes.CDLL`/`WinDLL`/`OleDLL`/`PyDLL`, `ctypes.cdll.LoadLibrary` (CWE-114 / CWE-829). |
| `PY-WL-125` | INFO | preview | Untrusted data used as the log *message format string* — log injection (CWE-117). |
| `PY-WL-126` | WARN | preview | Untrusted recipient or message reaching `smtplib.SMTP.sendmail` — mail and header injection (CWE-93). |

The precision work in this family is in the clean examples, and it is where the false-positive gate of §8 gets earned. Three illustrations, all from the rules' own metadata:

- `PY-WL-118` does not fire on untrusted data in a **bound-parameter** position. Parameterised queries are the canonical mitigation; SQL injection is a property of the SQL string alone.
- `PY-WL-122` does not fire on untrusted data passed as a **render variable**. Only a tainted template *source* is SSTI.
- `PY-WL-125` does not fire on logging's own lazy `%`-parameterisation — `logging.info('user input = %s', raw)` is the safe idiom and is never a finding.

`PY-WL-121` reports at two severities from one base. Its metadata declares base `ERROR`, but internally `lxml.etree` sinks emit at `ERROR` and stdlib `etree`/`minidom`/`sax` sinks at `WARN`, reflecting the different default entity-resolution behaviour. A reader comparing the table above to a report should expect that one divergence.

`PY-WL-125`'s `INFO` base is a deliberate calibration, not an oversight: log injection sits below the family's working ceiling of `WARN`, so it annotates without gating at the default `--fail-on ERROR`.

#### 6.5 De-confliction

Several rules deliberately partition territory so that one defect yields one finding. These relationships are documented in the rule sources and are the clearest evidence that the catalogue was built as a set rather than accumulated one rule at a time.

- **`PY-WL-102` and `PY-WL-119`** partition the broken-validator space. A boundary with no rejection path at all is 102; the bare `return p` shape — a validator that is a no-op — is 119. `boundary_without_rejection.py` carries the comment marking the split.
- **`PY-WL-108` and `PY-WL-112`** are calibrated against each other and against `PY-WL-118`: tainted command execution and tainted SQL are treated as the same exploit class in blast radius, so they carry the same base severity.
- **`PY-WL-120` delegates to `PY-WL-101` per finding, and only when the delegate will actually pick the defect up.** On the return arm — a producer whose *return* carries stored taint — `stored_taint.py` suppresses its own finding in `PY-WL-101`'s favour when 101 fires on that same return, so one defect yields one finding. One carve-out: a return at `EXTERNAL_RAW` — a recognised storage seed — is never delegated, deliberately keeping the documented complementary 120+101 pair; delegation applies to the `UNKNOWN_RAW`/`MIXED_RAW` returns. The suppression is conditional on 101 being able to fire: `_return_delegated_to_101` mirrors 101's own gate, including enablement, and returns `False` when `rules.enable` has excluded `PY-WL-101`. Disabling 101 therefore makes 120 *keep* the return finding rather than drop it (the rule source cites a review of 10 June 2026 for exactly this reasoning). The defect is never lost by turning a rule off; the de-confliction runs in the direction that fails safe.
- **`RS-WL-108` and `RS-WL-112`** de-conflict identically on the Rust side (§6.6).

#### 6.6 The Rust preview rules

`wardline scan --lang rust` runs two rules over `.rs` trees. They are not defined through `RuleMetadata`; they are small classes in `src/wardline/rust/rules.py` carrying `rule_id` and `base_severity` directly, and they use the same `modulate` function as the Python family — an unmarked or fail-closed function yields `NONE` and is suppressed.

| ID | Base | What it detects |
|---|---|---|
| `RS-WL-108` | ERROR | Untrusted data reaches the *program* of `Command::new` — an attacker chooses which executable runs (CWE-78). |
| `RS-WL-112` | WARN | Untrusted data reaches a `sh -c` style shell command line (CWE-78). |

`RS-WL-112` recognises a shell by basename, case-folded, against a fixed set (`sh`, `bash`, `zsh`, `dash`, `ksh`, `fish`, `cmd`, `cmd.exe`, `powershell`, `powershell.exe`, `pwsh`), so `/bin/sh`, `C:\Windows\System32\cmd.exe`, and `BASH` are all shells. A non-shell program with a tainted argument never fires — that shape is the argv-list flood, and it is a hard false positive. When the program itself is tainted, `RS-WL-112` stays silent and `RS-WL-108` reports.

Two limits are surfaced by the tool itself. `wardline scan --lang rust` prints to stderr:

```
note: --lang rust covers the command-injection slice (RS-WL-108/112);
config severity overrides do not yet apply to Rust findings.
```

Rust finding *identity* is graduated — crate-prefixed, frozen, and baseline-eligible, so an `RS-WL` finding enters the suppression stores like any other and migrates under `rekey`. Rule *coverage* is the command-injection slice and nothing else. The frontend architecture that would let this grow is §11.

#### 6.7 Engine findings

Not everything wardline emits is a policy rule. A separate `WLN-ENGINE-*` family reports on the scan rather than on the code, and a reader counting rule identifiers in a report will meet them.

The clearest example is `WLN-ENGINE-POLICY-CONFIG`, defined in `rules/__init__.py`: a `DEFECT` at `ERROR` severity that fires when project policy configuration weakens or disables wardline's own rules. It is emitted when `rules.enable` selects no rules, when a pattern matches no known rule, when a severity override names an unknown rule, when an override is not a valid severity, and when an override tries to set a defect rule to `NONE`. In each case the offending directive is *not honoured* — the finding is raised and the configuration is rejected, rather than the rule set quietly shrinking.

That is §5's posture applied to the rule set itself. A repository can misconfigure wardline; it cannot misconfigure wardline into silence without saying so out loud. Other engine identifiers include `WLN-ENGINE-PARSE-ERROR` (a file that could not be parsed), `WLN-ENGINE-NESTED-SCAN-ROOT` (a subdirectory scan that will mint identities the rest of the toolchain will not match), `WLN-ENGINE-FINGERPRINT-COLLISION` (two distinct findings sharing a fingerprint — a gate-tripping defect, so one can never silently mask the other on the cross-tool joins), `WLN-ENGINE-METRICS`, and `WLN-L3-LOW-RESOLUTION` (a function whose calls the resolver could not resolve, reported as an analysis-confidence signal rather than a policy defect). The `--fail-on-unanalyzed` sub-gate keys on the scan's *unanalyzed count* — files discovered but never analysed, excluding benign no-module skips — not on the presence of any one of these findings.

Two further engine families exist beyond `WLN-ENGINE-*`. A `WLN-CONFIG-*` family reports on the operator's own configuration — an `untrusted_sources` or `sanitisers` entry that matched nothing (`WLN-CONFIG-UNUSED-SOURCE`, `WLN-CONFIG-UNUSED-SANITISER`) or a name configured as both (`WLN-CONFIG-SANITISER-SINK-COLLISION`) — so a mis-spelt config entry surfaces as a finding rather than silently doing nothing. And `WLN-RUST-COVERAGE` reports the Rust preview's coverage boundary from inside a Rust scan's own output.

Engine findings of kind `FACT` or `METRIC` carry severity `NONE` and never gate. The README's worked example makes the distinction concrete: two findings, one active defect and one `NONE`-severity engine fact.

#### 6.8 Selecting and re-weighting the rule set

Two keys under `[wardline.rules]` control the catalogue, both optional, both validated with `additionalProperties: false` so a typo is a hard error:

```toml
[wardline.rules]
enable = ["*"]
severity = { "PY-WL-103" = "WARN", "PY-WL-104" = "INFO" }
```

`enable` is an fnmatch include list over rule identifiers; `"*"` — the default — selects everything, and a pattern such as `"PY-WL-1*"` selects a family. `severity` overrides a rule's base severity, applied *before* tier modulation, which is the only route to a `CRITICAL` finding.

Both keys live in the repository's own `weft.toml`, which is exactly why `WLN-ENGINE-POLICY-CONFIG` exists and why every rejection path in `build_default_registry` fails loud rather than degrading. The eleven `preview` rules are enabled by default alongside the stable fifteen; maturity is a stability signal about the rule's interface and false-positive profile, not a switch.
