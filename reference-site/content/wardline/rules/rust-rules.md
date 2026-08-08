---
title: "Rust Preview Rules"
weight: 3
---

`wardline scan --lang rust` runs **two rules** over `.rs` trees. Rust is a *scanned target*, reached through a tree-sitter grammar — **not an implementation language**. Wardline is pure Python.

These rules are not defined through `RuleMetadata`. They are small classes in `src/wardline/rust/rules.py` carrying `rule_id` and `base_severity` directly, and they use the same `modulate` function as the Python family — **an unmarked or fail-closed function yields `NONE` and is suppressed**, so the opt-in posture holds across languages.

| ID | Base | What it detects |
|---|---|---|
| `RS-WL-108` | ERROR | Untrusted data reaches the **program** of `Command::new` — an attacker chooses which executable runs (CWE-78) |
| `RS-WL-112` | WARN | Untrusted data reaches a **`sh -c` style shell command line** (CWE-78) |

## Shell recognition

`RS-WL-112` recognises a shell by **basename, case-folded**, against a fixed set:

```
sh  bash  zsh  dash  ksh  fish  cmd  cmd.exe  powershell  powershell.exe  pwsh
```

So `/bin/sh`, `C:\Windows\System32\cmd.exe`, and `BASH` are all shells.

**A non-shell program with a tainted argument never fires** — that shape is the argv-list flood, and it is a hard false positive.

## De-confliction

When the **program itself** is tainted, `RS-WL-112` stays silent and `RS-WL-108` reports. One boundary yields one finding.

## How trust is declared in Rust

Rust attributes are compile errors on stable when used as trust markers, so the declared-trust signal rides an **outer doc comment** instead:

```rust
/// @trusted(level=ASSURED)
fn build_record(raw: &str) -> Record { … }
```

A marker may only declare a **trusted** tier — the raw and unknown states are the fail-closed default, not something a declaration can assert. An unmarked function yields no opinion, and the seeder resolves that to `UNKNOWN_RAW`.

## Vocabulary

`rust_taint.yaml` holds two frozen tables keyed by `(crate, path)`:

- **sources** — the taint of a standard call's returned value
- **sinks** — classified by kind; the only kind in this slice is `command`

Legal source states are restricted to a four-member set, deliberately excluding `INTEGRAL` (a source returns data the project did not produce, so full trust is nonsensical) and excluding the three states outside the [reachable set]({{< relref "../trust-lattice" >}}#reachability-five-states-not-eight). A version constant folds into the provider fingerprint, so a vocabulary edit invalidates dependent summaries.

## Parsing and failure behaviour

The analyser parses once per file, mints one node-identity map, and threads it through entity indexing, trust seeding, dataflow and rules, so every pass shares one keying authority. It discovers the tree's Cargo crate roots in a single whole-tree pass and routes each file to its crate-prefixed module.

**A file tree-sitter cannot fully parse produces a gate-eligible `WLN-ENGINE-PARSE-ERROR` defect and contributes no findings** — the frontend never half-analyses a file.

## Two limits the tool surfaces itself

`wardline scan --lang rust` prints to stderr:

```
note: --lang rust covers the command-injection slice (RS-WL-108/112);
config severity overrides do not yet apply to Rust findings.
```

**Finding identity is graduated but rule coverage is not.** Rust finding identity is crate-prefixed, frozen, and baseline-eligible, so an `RS-WL` finding enters the suppression stores like any other and migrates under `rekey`. Rule *coverage* is the command-injection slice and nothing else.

## Installation

Behind the `wardline[rust]` extra, which pulls the scanner extra plus pinned `tree-sitter>=0.25,<0.26` and `tree-sitter-rust==0.24.2`. Both ship stable-ABI wheels, so no compiler is needed at install time.

## The honest reading

The Rust frontend demonstrates that the [registry]({{< relref "../language-frontends" >}}) is real — a second language plugged in without the engine changing — and simultaneously demonstrates what a second language costs. **Two rules against twenty-six is the distance between a proof that the plug-point works and a frontend a team could rely on.**

## See also

- [Language Frontends]({{< relref "../language-frontends" >}}) — the registry, the candidate-language rubric, and what adding a frontend takes
