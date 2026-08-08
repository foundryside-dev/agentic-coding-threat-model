---
title: "Python Reference"
weight: 11
---

Wardline's Python support is the complete implementation: three decorators, twenty-six rules, function-, variable- and project-level taint analysis, and the full command surface. Everything below is derived from the source tree and `--help` output of **wardline v1.5.0** (`release/1.5.0`).

## Installation

Requires **Python 3.12 or later**. Published to PyPI as `wardline`.

```bash
pip install weft-markers          # marker-only runtime package for application code
pip install wardline              # zero-dependency base (library + decorators)
pip install 'wardline[scanner]'   # the scan/judge/baseline CLI + MCP server
pip install 'wardline[rust]'      # Rust command-injection preview frontend
```

Quote the extras in zsh. **The base package pulls nothing**; every dependency sits behind an extra.

| Extra | Pulls | Enables |
|---|---|---|
| `scanner` | `pyyaml`, `jsonschema`, `click` | the `wardline` CLI and `wardline mcp` server |
| `loomweave` | the `scanner` extra, `blake3` | persisting taint facts to a Loomweave store |
| `rust` | the `scanner` extra, `tree-sitter`, `tree-sitter-rust` | `wardline scan --lang rust` |
| `docs` | `mkdocs`, `mkdocs-material` | a local render of the project's `docs/` tree |

The LLM triage judge adds **no runtime dependency**: its OpenRouter transport goes through stdlib `urllib`, and its Codex transport shells out to an installed Codex CLI.

> [!NOTE]
> **Which package should application code depend on?** `weft-markers`. It is a tiny package containing only the three decorators, so an annotated application does not acquire a static-analysis toolchain as a transitive dependency. Wardline still recognises `wardline.decorators` imports for backward compatibility.

## The decorators

```python
from weft_markers import external_boundary, trust_boundary, trusted
```

| Declaration | Arguments | Return-value trust |
|---|---|---|
| `@external_boundary` | none | `EXTERNAL_RAW` |
| `@trust_boundary(to_level=…)` | `to_level` ∈ `{"GUARDED", "ASSURED"}` | the given level |
| `@trusted` | none (defaults to `level="INTEGRAL"`) | `INTEGRAL` |
| `@trusted(level=…)` | `level` ∈ `{"INTEGRAL", "ASSURED"}` | the given level |

Levels may be passed as the string name or as a `wardline.core.taints.TaintState` member. An unknown name, or a level outside the permitted set for that decorator, raises `ValueError` **at decoration time**; the static equivalent is `PY-WL-114`.

**All three are runtime no-ops.** They stamp `_wardline_*` attributes onto the function and return it unchanged — no wrapper, no call-time checking, no behaviour change. Decorating a `staticmethod` or `classmethod` stamps the underlying function.

```python
from weft_markers import external_boundary, trust_boundary, trusted

@external_boundary
def read_request(req):
    """Everything this returns is untrusted."""
    return req.body

@trust_boundary(to_level="ASSURED")
def parse_order(raw):
    """Raises trust to ASSURED — and must be able to reject."""
    if not raw:
        raise ValueError("empty payload")
    order = json.loads(raw)
    if "sku" not in order:
        raise ValueError("missing sku")
    return order

@trusted(level="ASSURED")
def record_order(req):
    """Claims ASSURED; the claim has to be true."""
    return parse_order(read_request(req))
```

`wardline vocab` prints the canonical vocabulary descriptor as YAML if a consuming tool needs to read the surface rather than import it. `wardline decorator-coverage [PATH]` lists every trust-decorated entity under a path, as JSON (default) or a human-readable table.

## Configuration — `weft.toml`

Configuration is **optional**. With no configuration file, wardline scans `.` with every rule enabled and prints a performance advisory:

```
warning: no weft.toml found; using built-in source_roots=['.'], which can make
project-root scans broad and slow. Run `wardline doctor --repair --root <proj>`
to create a bounded default policy, or `wardline scan-job start <path>` for a
pollable long-running scan.
```

When present, configuration lives in the `[wardline]` table of `weft.toml` at the scan root — a file shared across the Weft federation, of which wardline reads only its own table and which **it never writes**. Pass `--config PATH` to name a different TOML file.

The full key set (the schema sets `additionalProperties: false` at every level, so a typo is a hard error, exit 2):

| Key | Type | Default | Purpose |
|---|---|---|---|
| `source_roots` | array of strings | `["."]` | Roots to discover source under |
| `exclude` | array of strings | `[]` | Path patterns to skip during discovery |
| `store_dir` | string | `.weft/wardline` | Relocate wardline's machine-state subtree |
| `packs` | array of strings | `[]` | Trust-grammar packs to load — **each still needs a caller grant** |
| `untrusted_sources` | array of strings | `[]` | Extra dotted names whose call returns seed `EXTERNAL_RAW`, and project entity qualnames treated as untrusted sources. Strictly additive |
| `sanitisers` | array of strings | `[]` | Extra dotted names whose call returns seed `ASSURED`. Strictly additive |
| `provenance_clash` | boolean | `false` | Switch taint combination from rank-meet (`least_trusted`) to provenance-clash (`taint_join`). **Config-only** — no CLI flag, and `--strict-defaults` puts it out of reach. See the caveat below |
| `[wardline.rules]` | table | — | `enable` (fnmatch include list, default `["*"]`) and `severity` (per-rule base-severity override) |
| `[wardline.judge]` | table | — | Judge transport, models, context radius, finding cap, policy file, write-confidence floor |
| `[wardline.artifacts]` | table | — | `dir` (default `.wardline`) and `retain` (default `20`) |
| `[wardline.autofix]` | table | — | `boundary_exception` — the exception type `wardline fix` inserts (default `ValueError`) |

```toml
[wardline]
source_roots = ["src"]
exclude = ["**/migrations/**", "tests"]

[wardline.rules]
enable = ["*"]
severity = { "PY-WL-125" = "WARN" }

[wardline.artifacts]
dir = ".wardline"
retain = 20
```

### Three behaviours worth knowing before relying on the file

**Implicit loads fail soft; explicit loads fail closed.** An auto-discovered `weft.toml` that is *absent* falls back to built-in defaults silently; one that is unparseable or has a non-table `[wardline]` falls back **with a warning**, because the file is shared and another federation member's mistake must not break the scan. A file named with `--config` is an operator requirement: missing, malformed, or non-table input is a hard `ConfigError`.

**A well-formed table with bad contents always fails loud**, in both modes. Unknown keys and out-of-range values exit 2 rather than being ignored.

**`store_dir` is confined.** It is validated at load time but consumed through a separate raw parse in `core/paths.py`, and `weft_state_dir` confines the result under the scan root: a relative path resolves under the root, an absolute path is honoured only if it lands inside the root, and anything that escapes is ignored in favour of the default. **A hostile `weft.toml` does not get a write-redirect primitive.**

> [!WARNING]
> **`provenance_clash` changes the lattice's reachable set — leave it alone.**
>
> Left at its default `false`, every combination and merge in the L2 walker goes through `least_trusted`, closed over `{INTEGRAL, ASSURED, GUARDED, EXTERNAL_RAW, UNKNOWN_RAW}`. Set it to `true` and the same call sites dispatch to `taint_join`, which returns `MIXED_RAW` for any cross-family pair.
>
> The effect runs in **both directions and improves neither**: `MIXED_RAW` sits in the freedom zone of the severity model, so findings *inside* a function that resolves to it are suppressed; and `PY-WL-101` fires on it as the *actual return* of a trusted producer — exactly the false positive on correct code that took the operator off the default path in the first place. [Full account]({{< relref "trust-lattice" >}}#combination-two-operators-one-in-use).
>
> **Treat `provenance_clash` as experimental.** The default pipeline is the only configuration this reference recommends.

There is **no** config key for sibling URLs, and **no** config key for waivers. Sibling URLs come from flags, the `WARDLINE_FILIGREE_URL` / `WARDLINE_LOOMWEAVE_URL` environment variables, or live local discovery. Waivers are machine-written suppression state, not operator config.

## The command surface

`wardline --version` and `wardline --help` are the entry points. **Nineteen commands** are registered.

| Command | Purpose |
|---|---|
| `scan` | Scan a path for findings; **the gate of record** |
| `scan-job` | `start` / `status` / `cancel` a file-backed long-running scan |
| `scan-file-findings` | The agent workflow from scan to optional Filigree filing |
| `findings` | Scan and print filtered findings as JSONL (read-only) |
| `file-finding` | File one finding, by fingerprint, into a tracker |
| `explain-taint` | Explain one finding's taint provenance by fingerprint |
| `dossier` | Assemble the one-call dossier for one function qualname |
| `decorator-coverage` | List every trust-decorated entity under a path |
| `baseline` | `create` / `update` the finding baseline |
| `judge` | Opt-in LLM triage of active defects |
| `fix` | Scan and apply mechanical autofixes interactively |
| `assure` | Report the trust-surface coverage posture |
| `attest` | Build (or `--verify`) a signed evidence bundle |
| `rekey` | Migrate fingerprint-keyed stores across a scheme change |
| `install` | Install agent-facing guidance and sibling bindings |
| `doctor` | Check — and optionally repair — install artefacts and bindings |
| `mcp` | Run the MCP server over stdio |
| `lsp` | Run the LSP diagnostics server over stdio |
| `vocab` | Emit the trust-vocabulary descriptor as YAML |

### `wardline scan`

```
wardline scan [OPTIONS] [PATH]
```

`PATH` defaults to `.` and **governs finding identity**: qualnames and fingerprints are minted relative to it, and suppression state is read from `PATH/.weft/wardline/`. **Scan the project root.** A subdirectory scan mints identities the rest of the toolchain will not match and misses the project's suppression state; wardline warns when it detects one.

**Exit codes:** `0` clean, `1` gate tripped, `2` wardline error (bad configuration, ungranted pack, malformed input).

| Flag | Effect |
|---|---|
| `--config FILE` | Load policy from this TOML file instead of `PATH/weft.toml` |
| `--format [jsonl\|sarif\|agent-summary\|legis]` | Output format; default `jsonl` |
| `--lang [python\|rust]` | Language frontend; default `python` |
| `--output PATH` | Write to an exact path, bypassing timestamping and retention |
| `--fail-on [CRITICAL\|ERROR\|WARN\|INFO]` | Exit 1 if any gating defect is at or above this severity. Case-insensitive. **There is no `NONE`** — `NONE` never gates |
| `--fail-on-inert` / `--no-fail-on-inert` | Exit 1 if the scan recognised zero trust boundaries over non-trivial code. **Default off** |
| `--fail-on-unanalyzed` / `--no-fail-on-unanalyzed` | Exit 1 if any discovered file could not be analysed. **Default off** |
| `--new-since REF` | PR-scoped gate: gate only on findings in files or entities changed since this git ref |
| `--affected FILE` | Scan only entities in this worklist (`-` for stdin). Advisory delta; mutually exclusive with `--new-since` and `--fail-on` |
| `--trust-pack NAME` | Grant a trust-grammar pack declared in `weft.toml`. Repeatable |
| `--allow-custom-packs` | Grant packs resolved from inside the scanned checkout |
| `--strict-defaults` | Ignore repository configuration entirely — **the file is never read** |
| `--trust-suppressions` | Let repository baseline/waiver/judged files clear the gate. **Default off** |
| `--allow-source-root-escape` | Allow `source_roots` to resolve outside `PATH` |
| `--cache-dir PATH` | Persist the L3 summary cache for faster incremental scans |
| `--fix` / `-y`, `--yes` | Apply mechanical autofixes during the scan; auto-confirm them |
| `--filigree-url URL`, `--loomweave-url URL`, `--local-only` / `--no-emit`, `--filigree-max-findings-per-request N` | Federation emission (opt-in; `--local-only` disables it regardless of resolution) |
| `--allow-dirty` | `--format legis` only: emit an unsigned, `dirty: true`-marked artefact on a dirty tree |
| `--manifest-full-coverage` | `--format jsonl` only: report the full discovered inventory in `covered_paths`, not just the analysed set |

The four grant flags are the [caller-side controls]({{< relref "declarations-and-trust-grants" >}}#the-pattern-generalises-five-grants); the two `--fail-on-*` sub-gates and the `NOT_EVALUATED` verdict belong to [the gate]({{< relref "gates-suppression-and-judge" >}}#the-gate-decision).

### `wardline baseline`

```bash
wardline baseline create [PATH]    # refuses if a baseline already exists
wardline baseline update [PATH]    # re-derive and overwrite
```

Both accept `--config`, `--cache-dir`, `--trust-pack`, `--allow-custom-packs`, and `--strict-defaults`. Both write `.weft/wardline/baseline.yaml` and print a severity breakdown of what was baselined.

### `wardline judge`

```bash
wardline judge [PATH] --transport codex-cli --write
```

Labels active `DEFECT` findings `TRUE_POSITIVE` or `FALSE_POSITIVE`. **Dry-run by default**: `--write` is required before anything is appended to `judged.yaml`.

Flags: `--transport [auto|codex-cli|openrouter]`, `--model`, `--codex-model`, `--context-lines`, `--max-findings`, `--write`, `--trust-judge-policy`, `--trust-judge-config`, plus the pack grants and `--strict-defaults`. Set `WARDLINE_OPENROUTER_API_KEY` for OpenRouter, or use `codex login` for Codex.

**Current branch:** the Codex transport — the `--transport` selector itself, `codex-cli`, and `--codex-model` — is unreleased. Released code judges over OpenRouter only.

A malformed model response is a `JudgeContractError` and exits 2 — **the judge fails loud rather than recording an unusable verdict.**

### `wardline attest` and `wardline assure`

```bash
wardline assure [PATH] --format human       # coverage posture: json (default) or human
wardline attest [PATH] --out bundle.json    # build a signed posture bundle
wardline attest [PATH] --verify bundle.json --reproduce
```

`attest` also accepts `--allow-dirty` (records `dirty: true`), `--cache-dir`, `--loomweave-url`, the pack grants, and `--strict-defaults`. `assure` takes only `--config` and `--format`. [Signing, key handling, and the limits of HMAC-under-a-shared-key]({{< relref "gates-suppression-and-judge" >}}#wardline-attest--a-signed-posture-bundle).

### `wardline install`, `doctor`, `mcp`, `lsp`

```bash
wardline install            # idempotent; re-run to refresh stale artefacts
wardline doctor --repair
```

`install [PACK]` writes a hash-fenced instruction block into `CLAUDE.md`/`AGENTS.md`, installs the `wardline-gate` skill, merges a `wardline` entry into `.mcp.json`, writes the Codex MCP entry, detects Loomweave and Filigree siblings, mints the attest signing key, and adds pre-commit hook configuration. Each step has a `--no-*` opt-out.

> [!WARNING]
> **Grant-residency caveat:** pack grants placed in the `.mcp.json` entry's `args` array are **preserved across re-runs**. See [residual risk 8]({{< relref "residual-risks" >}}#8-grant-residency).

`wardline mcp` runs a dependency-free MCP-over-stdio server (JSON-RPC 2.0) exposing **eighteen tools**: `scan`, `scan_job_start`, `scan_job_status`, `scan_job_cancel`, `scan_file_findings`, `file_finding`, `explain_taint`, `dossier`, `assure`, `decorator_coverage`, `attest`, `verify_attestation`, `judge`, `baseline`, `waiver_add`, `doctor`, `rekey`, `fix`. Its own flags are `--root`, `--loomweave-url`, `--filigree-url`, `--read-only`, `--no-network`, `--trust-pack`, and `--allow-custom-packs`.

`wardline lsp` runs an LSP diagnostics server over stdio and takes only `--root`.

## Suppression file formats

All three live under `.weft/wardline/` (relocatable with `store_dir`), are YAML, are keyed on a finding's full `fingerprint`, and carry a `fingerprint_scheme` header — currently `wlfp2` — that `wardline rekey` migrates when the scheme changes. **All three are intended to be committed. None carries an owner field or a signature.**

### `baseline.yaml`

A snapshot of accepted findings. Entries are deduplicated and severity-sorted so high-severity entries sit at the top of a git diff. `rule_id`, `path`, and `message` are carried for human auditability; **only `fingerprint` is loaded into the match set.**

```yaml
fingerprint_scheme: wlfp2
version: 1
entries:
  - fingerprint: 3f2a…
    rule_id: PY-WL-101
    path: src/app/orders.py
    message: "orders.record_order declares return trust ASSURED but actually returns EXTERNAL_RAW"
```

### `waivers.yaml`

Per-finding exceptions with a **mandatory reason** and an optional ISO expiry date. An expired waiver stops suppressing and the finding resurfaces. The optional `entity_sei` carries a rename-surviving entity identity; `entity_locator` is a human-readable companion and is never the join key.

```yaml
fingerprint_scheme: wlfp2
version: 1
waivers:
  - fingerprint: 3f2a…
    reason: "legacy importer, replaced by ORD-118; boundary lands in the Q3 rewrite"
    expires: "2026-09-30"
```

### `judged.yaml`

Machine-written records of findings the LLM judge ruled `FALSE_POSITIVE`. It carries the most provenance of the three, **and none of it is signed**. Re-judging a fingerprint overwrites the prior entry.

The example below is a **version-2** record, which is current-branch: released code writes `version: 1` records with no `judge_transport` field, their provenance being OpenRouter by construction. Both versions load.

```yaml
fingerprint_scheme: wlfp2
version: 2
findings:
  - fingerprint: 3f2a…
    rule_id: PY-WL-116
    path: src/app/reports.py
    message: "untrusted data reaches a path/filesystem-traversal sink"
    verdict: FALSE_POSITIVE
    rationale: "the path segment is constrained to a literal allow-list two frames up"
    confidence: 0.82
    model_id: gpt-5.6-sol
    judge_transport: codex-cli
    recorded_at: "2026-08-08T04:11:53+00:00"
    policy_hash: 9c1e…
```

**A malformed entry in any of the three fails loud on load.** A finding must not be silently suppressed by a bad record.

## Output formats

| Format | What it is |
|---|---|
| **`jsonl`** (default) | One JSON object per finding, keys sorted, written to a timestamped file under `.wardline/`. The artefact directory anchors to the project root regardless of which subdirectory the scan was invoked from, and wardline prunes to the newest `retain` artefacts per format. `--output PATH` writes to an exact path and bypasses both timestamping and retention |
| **`sarif`** | SARIF 2.1.0, for GitHub code scanning and any SARIF-consuming viewer. Wardline's own CI uploads it |
| **`agent-summary`** | A compact JSON summary written for coding agents rather than humans, carrying the gate decision and its reason in terms an agent can act on |
| **`legis`** | A signed scan artefact for the federation handshake; refuses a dirty working tree unless `--allow-dirty`, in which case the artefact is emitted unsigned and marked `dirty: true` |

Each `jsonl` record carries `rule_id`, `message`, `severity`, `kind`, `location` (path plus line and column spans), `fingerprint`, `suggestion`, `qualname`, `confidence`, `related_entities`, `properties`, `suppression_state`, `suppression_reason`, and `maturity`. A `scan_manifest` header record reports the ruleset hash and the covered-path inventory.

`wardline findings [PATH]` is the read-only filtered view: `--rule-id`, `--severity`, `--sink`, or an arbitrary `--where '{"rule_id":"PY-WL-106"}'` JSON filter, printed as JSONL.

## A worked example

Start with the failing shape:

```python
# app/orders.py
import json
from weft_markers import external_boundary, trusted

@external_boundary
def read_request(req):
    return req.body

@trusted(level="ASSURED")
def record_order(req):
    return json.loads(read_request(req))
```

```console
$ wardline scan . --fail-on ERROR
scanned 1 file(s); 2 finding(s) — 0 suppressed (0 baseline / 0 waiver / 0 judged),
1 active -> .wardline/20260808T120458Z-findings.jsonl
gate: FAILED (--fail-on ERROR) — 1 active ERROR+ defect(s) at or above ERROR
gate: evaluated unsuppressed (repository baseline/waiver/judged ignored)
$ echo $?
1
```

One active defect:

```
PY-WL-101 ERROR — app.orders.record_order declares return trust ASSURED but
actually returns UNKNOWN_RAW (less trusted) — untrusted data reaches a trusted
producer
```

*(The second finding is `WLN-ENGINE-METRICS` at severity `NONE`, an engine fact that never gates.)* The actual state is `UNKNOWN_RAW` rather than `EXTERNAL_RAW` because the untrusted value passes through an intervening call on the way out and the analyser resolves the actual return conservatively. `wardline explain-taint <fingerprint> .` prints the immediate tainted callee, the originating boundary, the trust tiers at the sink, and a remediation hint.

### Fix at the boundary, not at the sink

**The wrong fix is to widen the claim** — weakening `@trusted(level="ASSURED")` or removing the decorator. That silences the finding and changes nothing about the data.

The right fix inserts a boundary that can actually reject:

```python
@trust_boundary(to_level="ASSURED")
def parse_order(raw):
    if not raw:
        raise ValueError("empty payload")
    order = json.loads(raw)
    if "sku" not in order:
        raise ValueError("missing sku")
    return order

@trusted(level="ASSURED")
def record_order(req):
    return parse_order(read_request(req))
```

```console
$ wardline scan . --fail-on ERROR
gate: PASSED (--fail-on ERROR) — no ERROR+ defects in the evaluated population
$ echo $?
0
```

**Now consider the half-fix:** a boundary that is declared but does not reject — `def parse_order(raw): return json.loads(raw)` and nothing else. `PY-WL-101` clears, because the declared and actual levels now agree. `PY-WL-102` fires in its place:

```
PY-WL-102 ERROR — app.orders.parse_order declares a trust boundary
(EXTERNAL_RAW -> ASSURED) but has no rejection path (no raise / no falsy
return) — it cannot validate
```

*That pairing is the design working as intended. The declaration and the ability to enforce it are checked separately, and satisfying one does not discharge the other.*

## Continuous integration

The pattern wardline uses on itself:

```yaml
- name: Scan self -> SARIF (gated)
  run: wardline scan src/ --format sarif --output results.sarif --fail-on ERROR
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

`--fail-on ERROR` is what makes the dogfood scan a real gate rather than a report.

**Three additions worth considering for a real deployment:**

1. Add **`--fail-on-inert`** so a project that has stopped declaring anything fails loudly rather than passing green.
2. Prefer **`--new-since <merge-base>`** on pull-request builds over `--trust-suppressions` — a branch cannot forge its own merge base but can edit its own suppression files.
3. Leave **`--strict-defaults`** on in any pipeline that scans code the pipeline's owner does not control.

## See also

- [Declarations and Trust Grants]({{< relref "declarations-and-trust-grants" >}}) — what the grant flags do
- [Gates, Suppression, and the Judge]({{< relref "gates-suppression-and-judge" >}}) — the gate decision model
- [Rules]({{< relref "rules" >}}) — the 28-rule catalogue
