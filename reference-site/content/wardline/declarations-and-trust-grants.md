---
title: "Declarations and Trust Grants"
weight: 4
---

A wardline deployment has to answer two separate questions.

1. **What does this repository declare?** Where the boundaries are, which functions produce trusted data, which levels they claim. Answered with three decorators and nothing else.
2. **Who decides that those declarations mean anything?** The designed specification assumed the repository decided, then spent a governance chapter trying to stop the repository from lying. The implementation reverses the assumption: **the caller who invokes the scanner decides which repository-supplied trust semantics are permitted to load**, and refuses to run when the repository asks for something the caller did not grant.

That inversion is the strongest idea in the codebase.

## The threat: manifest poisoning

The designed specification named it precisely:

> Corrupting tier assignments so that agents generate code compliant with the wrong policy. A tier assignment that classifies external API data as Tier 1 causes downstream code to treat unvalidated input as authoritative — and the code will be structurally correct against the declared wardline. **The poisoning is invisible to enforcement because enforcement faithfully implements the policy it is given.**

A scanner that reads its policy from the repository it is scanning cannot detect a repository that has written itself a favourable policy. The finding is not suppressed; it is never generated.

**The designed answer was procedural** — two-person review of tier changes, tracking in a fingerprint baseline diff, impact assessments, a documented `rationale` field. All depend on sustained human attention to a policy artefact that changes constantly, which is the resource the governance model was itself designed to economise.

**The implemented answer is mechanical**, and is strictly better because it does not depend on anyone reading anything.

## Caller-granted trust

A repository may declare a trust-grammar pack in the `packs` key of the `[wardline]` table in `weft.toml`. That declaration, on its own, **does nothing at all**. To load, each pack must additionally be granted by the invoking operator:

```bash
wardline scan . --trust-pack myorg.trustpack --fail-on ERROR
```

A pack that lives inside the scanned checkout needs a second, separate grant, `--allow-custom-packs`, because importing it means executing code from the repository under analysis.

Both grants default to off. Enforcement is **fail-closed**: an ungranted pack raises `ConfigError` before any analysis begins, and the error names the missing grant rather than degrading quietly.

```
trust-grammar pack 'myorg.trustpack' is not trusted. Grant it with
--trust-pack myorg.trustpack (CLI or `wardline mcp` launch flag) or the
`trust_packs` MCP tool argument.
```

**The consequence:** a repository can *ask* for arbitrary trust semantics. It cannot *obtain* them. The gate that decides is on the caller's side of the boundary, and the failure mode when the two disagree is a hard exit, not a silently weaker policy.

This does not make declarations *correct* — a granted pack can encode a bad trust model just as a hand-written manifest could. What it removes is the class of attack where the repository upgrades its own policy without anyone choosing to let it.

## The declaration surface: three decorators

There is no fourth, and no manifest equivalent.

| Decorator | Arguments | Meaning |
|---|---|---|
| `@external_boundary` | none | An external entry point. Its return value carries `EXTERNAL_RAW`. |
| `@trust_boundary(to_level=…)` | `to_level` ∈ {`GUARDED`, `ASSURED`} | A validation or sanitisation boundary raising trust on its return to `to_level`. |
| `@trusted` / `@trusted(level=…)` | `level` ∈ {`INTEGRAL`, `ASSURED`}, default `INTEGRAL` | A trusted producer or sink: it operates on, and returns, data at `level`. |

Application code should import them from the standalone marker package:

```python
from weft_markers import trusted, trust_boundary, external_boundary

@external_boundary
def read_request(req):
    return req.body                      # EXTERNAL_RAW

@trust_boundary(to_level="ASSURED")
def validate(raw):
    if not raw:
        raise ValueError("empty body")
    return raw                           # ASSURED

@trusted(level="ASSURED")
def build_record(req):
    return validate(read_request(req))   # claim matches actual
```

`pip install weft-markers` pulls a marker-only runtime package with no dependency on the scanner — an application that wants trust markers should not thereby acquire a static-analysis toolchain. Wardline still recognises the equivalent `wardline.decorators` imports for backward compatibility, and resolves aliased imports (`from wardline.decorators import trusted as t`), which is what allows `PY-WL-114` to catch a typo'd level on an aliased decorator.

### Three properties worth stating explicitly

**The decorators are runtime no-ops.** They stamp `_wardline_*` attributes onto the target function and return it *unchanged* — no wrapper, no runtime tier-stamping, no enforcement. The analyser reads them from the AST; nothing is checked at runtime, ever.

**The level vocabularies are asymmetric, and the asymmetry is load-bearing.** A boundary may raise trust to `GUARDED` or `ASSURED` but **never to `INTEGRAL`**; a producer may claim `INTEGRAL` or `ASSURED` but **never `GUARDED`**. Validation therefore cannot manufacture the top of the lattice in one step. This is the one surviving fragment of the designed invariant that Tier 1 must be reached through composed steps rather than a skip-promotion.

**Bad levels fail twice, in two different registers.** `coerce_level` raises `ValueError` at decoration time for an unknown state name or a level outside the permitted set — a Python error in the annotated project, not a wardline finding. Statically readable but invalid levels are *also* a rule (`PY-WL-114`), because the static path is what matters when a level comes from a constant the analyser can resolve but the interpreter never evaluates in the scanner's process.

## The canonical vocabulary

The three decorators are canonicalised in `core/vocabulary.yaml`, a fourteen-line file carrying `schema: wardline.vocabulary/v1`. Each entry names the canonical decorator, its group (all three are group 1), and its declared attributes (`_wardline_to_level`, `_wardline_level`, both typed `TaintState`).

`apply_marker` validates every decoration against this registry: an unknown decorator name, a group mismatch, or an undeclared attribute is a `ValueError`. `wardline vocab` emits the descriptor as YAML, so a consuming tool can read the vocabulary instead of importing wardline to discover it.

> [!NOTE]
> This is what the designed specification's **seventeen annotation groups** became. Sixteen were never built. The surviving one — the generic trust boundary — is the whole vocabulary, and it fits on a page.

## Trust-grammar packs

A pack is the extension point: an importable module that may carry a `config` attribute (deep-merged over the project's `[wardline]` table) and may register additional rules on the same config-gated path as the builtins.

Because a pack imports and executes code, the documentation classifies packs as **operator-authored**. The load sequence is the security property, so the order matters:

1. Read `[wardline]` from `weft.toml` (or the file named by `--config`).
2. For each name in `packs`: **refuse** unless the caller granted it with `--trust-pack`; **refuse** a project-local pack unless the caller also granted `--allow-custom-packs`.
3. Import each granted pack, deep-merge its `config` over the project's table.
4. Validate the merged result against the JSON Schema (draft 2020-12) with `additionalProperties: false`, so a typo'd key after merging is a hard error, not a silent default.

Steps 2 and 4 are both fail-closed, and **step 2 precedes any import**. A repository cannot get its code executed by wardline before the grant check runs.

## The pattern generalises: five grants

Caller-granted trust is the design principle the whole CLI surface is built on. It covers three domains — vocabulary, judge behaviour, and suppression state — across five flags, each defaulting to off.

| Grant | What the repository may otherwise supply | Default |
|---|---|---|
| `--trust-pack <name>` (repeatable) | Trust-grammar packs named in `weft.toml` | ungranted |
| `--allow-custom-packs` | Packs resolved from inside the scanned checkout | ungranted |
| `--trust-judge-config` | Project-supplied judge transport, models, context radius, finding cap, write-confidence floor | ungranted |
| `--trust-judge-policy` | A project `policy_file` appended to the judge prompt — passed to the model only as *untrusted context* | ungranted |
| `--trust-suppressions` | Repository-controlled baseline, waiver, and judged files clearing the `--fail-on` gate | ungranted |

`--trust-suppressions` is the second fully mechanical instance of the principle. All three suppression channels are committed repository content, so a pull request could otherwise add a suppression keyed to the fingerprint of its own new defect and clear the gate. Since v1.0.1 it cannot: the gate evaluates a separately built **unsuppressed** population. See [Gates, suppression, and the judge]({{< relref "gates-suppression-and-judge" >}}#what-the-gate-judges).

Read together, these are one principle applied three times over: **the caller grants trust semantics — vocabulary, suppressions, judge policy — and the repository only ever requests them.**

## `--strict-defaults`

The blunt instrument at the end of the same axis, and its mechanism is stronger than its help text suggests. `core/config.py` short-circuits at the top of `load()`: with `--strict-defaults` set, **the config file is never read**. Wardline runs on built-in defaults — `source_roots = ["."]`, all rules enabled, no severity overrides, no packs.

Under `--strict-defaults`, packs are not merely ungranted; they are **unreachable**, because the list that would name them is never parsed. There is no partial-trust mode to reason about.

| Commands accepting `--strict-defaults` | `scan`, `judge`, `baseline create`, `baseline update`, `attest`, `rekey`, `scan-job`, `scan-file-findings` |
|---|---|
| **Also accept `--trust-pack` / `--allow-custom-packs`** | the same eight, plus `wardline mcp` (as launch flags; no strict-defaults switch) |
| **Load policy but accept neither** | `fix`, `findings`, `explain-taint`, `dossier`, `decorator-coverage` |

The last row is a rough edge, not a security hole: in a project that declares packs those commands fail closed with `ConfigError`, and the error tells the caller to pass `--trust-pack`, which they do not accept. The only routes open are a `--config` pointing at a pack-free policy, or fixing `weft.toml`. **The failure direction is refusal.**

## Where grants reside

One caveat limits how the guarantee should be phrased.

Grants have **residency**. On the CLI they live in the invocation and nowhere else. For the MCP server they live in the server's launch arguments — `wardline mcp --trust-pack myorg.trustpack` in the `args` array of `.mcp.json` — so agent tool calls need not re-pass `trust_packs` on every call. But `.mcp.json` is a file inside the repository, and `install/mcp_json.py` deliberately **preserves the grant arguments it finds there** across `wardline install` and `wardline doctor --repair`, on the stated reasoning that stripping a grant would silently return a working taint gate to inert.

The one place wardline *reads* grants back out of that repository file is `install/doctor.py`, a diagnostic path. It is not the scan gate: `wardline scan` takes its grants from its own invocation, and no code path lets `weft.toml` grant itself anything.

> [!WARNING]
> **The accurate formulation is narrower than "the repository cannot grant trust":**
>
> > Repository **configuration** cannot self-authorise the scan gate.
>
> A repository that also controls the MCP launch entry an agent host reads is a different, and weaker, position — one that belongs to whoever provisions the agent's tooling. Recorded as [residual risk 8]({{< relref "residual-risks" >}}#trust-grant-and-suppression-risks).

## No manifest is required

The designed specification defined a root `wardline.yaml` with tier definitions, boundary declarations, dependency taint entries, and rule overrides — a substantial schema, and the artefact the entire governance model was built around. **It was never built.**

The tool requires no manifest to scan. `weft.toml` is optional operator configuration, shared across the Weft federation, of which wardline reads only its own `[wardline]` table and which it never writes. Wardline's own repository does not ship one. Run without it and the tool boots on built-in defaults and says so:

```
warning: no weft.toml found; using built-in source_roots=['.'], which can make
project-root scans broad and slow. Run `wardline doctor --repair --root <proj>`
to create a bounded default policy, or `wardline scan-job start <path>` for a
pollable long-running scan.
```

That warning is a **performance advisory, not a policy failure**. A scan with no configuration at all is a supported mode; the declarations in the source are the only policy input genuinely required.

## See also

- [Python Reference]({{< relref "python-reference" >}}) — the full `weft.toml` key set and command surface
- [Gates, Suppression, and the Judge]({{< relref "gates-suppression-and-judge" >}}) — the same principle applied to the gate
- [Language Frontends]({{< relref "language-frontends" >}}) — where a granted pack becomes analysis behaviour
